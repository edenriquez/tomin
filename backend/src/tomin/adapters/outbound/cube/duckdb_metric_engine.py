"""Compiles (MetricSpec, MetricQuery) into SQL over ``fact_transactions``.

This is the only file that knows a semantic name maps to a column. The catalog
stays a business definition; this stays a query detail; swapping DuckDB for
Postgres is this file plus the connection it borrows.

**Injection surface.** The client never sends SQL, an expression or a column
name. It sends identifiers that must already exist in
``domain/metrics/vocabulary.py``, which the use case validated against the
metric's own allow-list before we are called; here they are looked up in
:data:`_COLUMN_SQL`, a closed dict. Every *value* -- period bounds, filter
operands, the user id -- is a bound parameter. There is no string path from
request body to SQL text.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from ....application.dtos.metrics import (
    DEFAULT_CURRENCY,
    MetricMeta,
    MetricQuery,
    MetricResult,
    money,
)
from ....domain.metrics.spec import Measure, MetricSpec
from ....domain.metrics.vocabulary import DIMENSIONS, FILTERS, GRAINS, MEASURES
from .duckdb_cube import DuckDbCube

#: Semantic column name -> SQL expression. The whitelist. `f` is
#: ``fact_transactions``; `d` is ``dim_category``.
_COLUMN_SQL: dict[str, str] = {
    "amount": "f.amount",
    "tx_date": "f.tx_date",
    "tx_type": "f.tx_type",
    "currency": "f.currency",
    "category_id": "f.category_id",
    "merchant_id": "f.merchant_id",
    "description": "f.description",
    "excluded_from_stats": "f.excluded_from_stats",
    "category_name": "COALESCE(d.name, 'Sin Categoria')",
    "tx_month": "strftime(f.tx_date, '%Y-%m')",
}

#: Grain -> the strftime pattern that buckets its date column.
_GRAIN_FORMAT = {"month": "%Y-%m", "day": "%Y-%m-%d"}

_ROW_COUNT = "row_count"


class MetricCompilationError(RuntimeError):
    """The catalog referenced something this adapter cannot map.

    A developer error (a new semantic name added to the vocabulary without a
    column here), not a client error -- hence not a MetricValidationError.
    """


class DuckDbMetricEngine:
    """Implements the :class:`MetricEngine` port over the DuckDB cube."""

    def __init__(self, cube: DuckDbCube) -> None:
        self._cube = cube

    def execute(self, user_id: UUID, spec: MetricSpec, query: MetricQuery) -> MetricResult:
        measures = [self._measure(name) for name in spec.measures]
        if not measures:
            raise MetricCompilationError(f"Metric '{spec.id}' declares no measures.")

        group_by = self._group_columns(spec, query)
        currency = self._currency_scope(query, group_by)

        sql, params = self._compile(user_id, spec, query, measures, group_by, currency)
        rows = self._cube.fetch(sql, params)

        return self._to_result(spec, measures, group_by, rows, currency)

    # --- compilation -----------------------------------------------------
    @staticmethod
    def _measure(name: str) -> Measure:
        try:
            return MEASURES[name]
        except KeyError as exc:  # pragma: no cover - catalog/vocabulary drift
            raise MetricCompilationError(f"Unknown measure '{name}'.") from exc

    @staticmethod
    def _sql(column: str) -> str:
        try:
            return _COLUMN_SQL[column]
        except KeyError as exc:  # pragma: no cover - vocabulary/adapter drift
            raise MetricCompilationError(f"No column mapping for '{column}'.") from exc

    def _group_columns(self, spec: MetricSpec, query: MetricQuery) -> list[tuple[str, str]]:
        """``(alias, sql)`` pairs, grain axis first so a series sorts by time."""
        columns: list[tuple[str, str]] = []
        if query.grain:
            grain = GRAINS[query.grain]
            fmt = _GRAIN_FORMAT[grain.name]
            columns.append((grain.name, f"strftime({self._sql(grain.column)}, '{fmt}')"))

        for name in query.dimensions:
            # A `month` dimension alongside a `month` grain is the same axis
            # asked for twice; grouping by it twice would be a SQL error.
            if any(alias == name for alias, _ in columns):
                continue
            dimension = DIMENSIONS[name]
            if dimension.key_column:
                columns.append((f"{name}_id", self._sql(dimension.key_column)))
            columns.append((name, self._sql(dimension.column)))
        return columns

    @staticmethod
    def _currency_scope(query: MetricQuery, group_by: list[tuple[str, str]]) -> str | None:
        """The single currency every figure is denominated in, or ``None``.

        Defaults to MXN: adding pesos to dollars produced a headline number in
        no currency at all. The one exception is a query that breaks *down* by
        currency, where scoping to one would make the axis a single row.
        """
        if any(alias == "currency" for alias, _ in group_by):
            return None
        explicit = query.filters.get("currency")
        return str(explicit) if explicit else DEFAULT_CURRENCY

    def _measure_sql(self, measure: Measure) -> str:
        column = self._sql(measure.column)
        tx_type = self._sql("tx_type")
        if measure.agg == "count":
            return f"COUNT({column})"
        if measure.direction == "expense":
            return f"SUM(CASE WHEN {tx_type} = 'expense' THEN {column} ELSE 0 END)"
        if measure.direction == "income":
            return f"SUM(CASE WHEN {tx_type} = 'income' THEN {column} ELSE 0 END)"
        if measure.direction == "net":
            # The one place sign is reintroduced, mirroring
            # Transaction.signed_amount: amount is a magnitude, tx_type is the
            # direction.
            return f"SUM(CASE WHEN {tx_type} = 'income' THEN {column} ELSE -{column} END)"
        return f"SUM({column})"

    def _where(
        self,
        user_id: UUID,
        query: MetricQuery,
        measures: list[Measure],
        currency: str | None,
    ) -> tuple[list[str], list[Any]]:
        clauses = ["f.user_id = ?"]
        params: list[Any] = [str(user_id)]

        if currency:
            clauses.append(f"{self._sql('currency')} = ?")
            params.append(currency)
        if query.period.start:
            clauses.append(f"{self._sql('tx_date')} >= ?")
            params.append(query.period.start)
        if query.period.end:
            clauses.append(f"{self._sql('tx_date')} <= ?")
            params.append(query.period.end)

        # When every selected measure reads the same side of the ledger, the
        # rows on the other side are excluded rather than merely zeroed by the
        # CASE. Otherwise an income row would open its own group -- a
        # "Sin Categoria: 0.00" slice in a spend breakdown -- and would inflate
        # meta.source_txn_count with rows the number does not rest on.
        directions = {m.direction for m in measures}
        if directions in ({"expense"}, {"income"}):
            clauses.append(f"{self._sql('tx_type')} = ?")
            params.append(next(iter(directions)))

        # Measure-level defaults come first and are not overridable by the
        # client: "spend excludes transfers" is a property of the measure.
        for measure in measures:
            for default in measure.default_filters:
                clauses.append(f"{self._sql(default.field)} = ?")
                params.append(default.value)

        for name, value in query.filters.items():
            if name == "currency":
                continue  # already applied as the currency scope
            column = self._sql(FILTERS[name].column)
            if isinstance(value, (list, tuple)):
                if not value:
                    clauses.append("1 = 0")
                    continue
                placeholders = ", ".join("?" * len(value))
                clauses.append(f"{column} IN ({placeholders})")
                params.extend(value)
            else:
                clauses.append(f"{column} = ?")
                params.append(value)

        return clauses, params

    def _compile(
        self,
        user_id: UUID,
        spec: MetricSpec,
        query: MetricQuery,
        measures: list[Measure],
        group_by: list[tuple[str, str]],
        currency: str | None,
    ) -> tuple[str, list[Any]]:
        select = [f"{sql} AS {alias}" for alias, sql in group_by]
        select += [f"{self._measure_sql(m)} AS {m.name}" for m in measures]
        # Carried so meta.source_txn_count says how many rows the answer rests
        # on -- an empty widget and a widget over three transactions are
        # different claims.
        select.append(f"COUNT(*) AS {_ROW_COUNT}")

        clauses, params = self._where(user_id, query, measures, currency)

        sql = (
            f"SELECT {', '.join(select)} "
            "FROM fact_transactions f "
            "LEFT JOIN dim_category d ON f.category_id = d.category_id "
            f"WHERE {' AND '.join(clauses)}"
        )
        if group_by:
            # Positional, not by alias: `category_id` names a column in both
            # joined tables, so grouping by the alias is ambiguous. The group
            # columns are always the leading select entries.
            sql += " GROUP BY " + ", ".join(str(i) for i in range(1, len(group_by) + 1))
            sql += " ORDER BY " + self._order_by(spec, measures)

        if spec.cumulative and group_by:
            axis = group_by[0][0]
            running = ", ".join(
                f"SUM({m.name}) OVER (ORDER BY {axis} "
                f"ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS {m.name}"
                for m in measures
            )
            passthrough = ", ".join(alias for alias, _ in group_by)
            sql = (
                f"SELECT {passthrough}, {running}, {_ROW_COUNT} "
                f"FROM ({sql}) ORDER BY {axis}"
            )
        return sql, params

    @staticmethod
    def _order_by(spec: MetricSpec, measures: list[Measure]) -> str:
        # `1` is the leading group column; measure aliases are unambiguous.
        if spec.shape == "series":
            return "1 ASC"
        # A breakdown is read largest-first; ties broken by the axis so the
        # order is stable between calls.
        return f"{measures[0].name} DESC, 1 ASC"

    # --- result assembly -------------------------------------------------
    def _to_result(
        self,
        spec: MetricSpec,
        measures: list[Measure],
        group_by: list[tuple[str, str]],
        raw_rows: list[tuple],
        currency: str | None,
    ) -> MetricResult:
        aliases = [alias for alias, _ in group_by]
        rows: list[dict[str, Any]] = []
        totals = {m.name: Decimal(0) for m in measures}
        source_count = 0

        for raw in raw_rows:
            row: dict[str, Any] = {}
            for index, alias in enumerate(aliases):
                row[alias] = raw[index]
            for offset, measure in enumerate(measures):
                amount = Decimal(str(raw[len(aliases) + offset] or 0))
                totals[measure.name] = amount if spec.cumulative else totals[measure.name] + amount
                row[measure.name] = money(amount)
            source_count += int(raw[-1] or 0)
            rows.append(row)

        return MetricResult(
            metric_id=spec.id,
            shape=spec.shape,
            unit=spec.unit,
            # A single-measure metric gets a headline number: the period total,
            # or for a running sum the last point. Two measures have no single
            # number, and no rows means no claim -- None, never "0.00".
            value=(
                money(totals[measures[0].name])
                if len(measures) == 1 and rows
                else None
            ),
            rows=rows,
            meta=MetricMeta(currency=currency, source_txn_count=source_count),
        )
