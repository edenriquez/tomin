"""Declarative vocabulary for the metric registry (docs/redesign-plan.md §1).

Pure domain: no SQL, no Flask, no DuckDB. A :class:`MetricSpec` says *what* a
metric means -- which measures it selects, which dimensions and filters a client
may combine with it, what shape comes back -- in **semantic** names only. The
name-to-column mapping belongs to the adapter
(``adapters/outbound/cube/duckdb_metric_engine.py``), which is what keeps the
catalog a business definition rather than a query template.

The catalog is *closed*: a client sends a metric id plus identifiers drawn from
this vocabulary and never an expression. Everything outside it is rejected here,
before a compiler ever sees it.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

MetricQuality = Literal["estimate", "beta"]

MetricKind = Literal["aggregation", "computed"]
MetricShape = Literal["scalar", "series", "breakdown"]
Aggregation = Literal["sum", "count"]
#: Which side of the ledger a measure reads. ``net`` signs income positive and
#: expense negative; ``any`` ignores direction entirely.
Direction = Literal["expense", "income", "net", "any"]
FilterOp = Literal["eq", "in"]
ParamType = Literal["decimal", "int", "float"]


class MetricValidationError(ValueError):
    """A query asked for something the catalog does not declare.

    Subclasses ``ValueError`` so a single-metric caller (dashboard validation)
    gets the app-wide 400 handler for free, while the batch query endpoint
    catches it per query and degrades that one widget instead of the request.
    """

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class Eq:
    """A default equality filter carried by a measure.

    Semantic field name; the adapter resolves it to a column. Declared on the
    *measure* rather than the metric so that "spend excludes transfers" is
    stated once and inherited by every metric that sums spend.
    """

    field: str
    value: Any


@dataclass(frozen=True)
class Measure:
    """A quantity that can be aggregated: semantic column + aggregation."""

    name: str
    column: str
    agg: Aggregation = "sum"
    direction: Direction = "any"
    #: Applied by the compiler to *every* metric that selects this measure.
    default_filters: tuple[Eq, ...] = ()


@dataclass(frozen=True)
class Dimension:
    """An axis a measure can be broken down by."""

    name: str
    column: str
    label: str
    #: Semantic column holding a stable id for the dimension member, when the
    #: label alone is not addressable (category name vs category id).
    key_column: str | None = None
    #: A transaction can belong to more than one member of this axis, so the
    #: rows do **not** partition the total -- one transaction with three tags
    #: appears three times. Surfaced to the client as ``meta.overlapping``;
    #: without it someone ships a pie chart summing to 240%.
    overlapping: bool = False


@dataclass(frozen=True)
class FilterDef:
    """A predicate a client may attach to a query."""

    name: str
    column: str
    ops: tuple[FilterOp, ...] = ("eq", "in")
    #: The column holds a *list*, so the predicate is membership rather than
    #: equality: ``tag = "viaje"`` means "is tagged viaje", not "has exactly one
    #: tag, viaje".
    multivalued: bool = False


@dataclass(frozen=True)
class Grain:
    """A time bucket. ``column`` is the semantic date column it buckets."""

    name: str
    column: str


@dataclass(frozen=True)
class ParamDef:
    """A scalar input to a *computed* metric.

    Params exist because some metrics are functions of user-entered numbers
    rather than of the fact table -- a projection needs a balance and a rate,
    and neither appears in any statement.
    """

    name: str
    type: ParamType
    required: bool = False
    default: Any = None
    minimum: float | None = None
    maximum: float | None = None


@dataclass(frozen=True)
class MetricSpec:
    """One entry in the catalog.

    ``kind`` is the only thing that decides who executes it -- SQL compiler or
    Python resolver -- and it is deliberately invisible to the client, so a
    metric can migrate from resolver to SQL later without a client change.
    """

    id: str
    title: str
    description: str
    group: str
    kind: MetricKind
    shape: MetricShape
    unit: str
    #: Semantic measure names, in output order. Empty for computed metrics.
    measures: tuple[str, ...] = ()
    #: Allowed (not required) dimensions, filters and grains.
    dimensions: tuple[str, ...] = ()
    filters: tuple[str, ...] = ()
    grains: tuple[str, ...] = ()
    params: tuple[ParamDef, ...] = ()
    default_dimensions: tuple[str, ...] = ()
    default_grain: str | None = None
    #: Running total over the grain axis, rather than a per-bucket value.
    cumulative: bool = False
    #: Capability strings the UI uses to lock a widget it cannot yet fill:
    #: "transactions", "months:3", "cfdi", "tags", "balance".
    requires: tuple[str, ...] = ()
    #: How much to trust the number. ``estimate`` means it rests on a
    #: heuristic over free text rather than on a field the bank stated; the
    #: plan makes the header tag **mandatory** for cash withdrawals and
    #: anomalies (§4). Published in the catalog so the frame can render it
    #: without knowing which metric it is showing.
    quality: Literal["estimate", "beta"] | None = None
    #: The request period does not apply. "Lifetime in vs out" is a claim about
    #: all of history; silently narrowing it to the dashboard's month would
    #: answer a different question with the same label.
    ignores_period: bool = False

    # --- validation ------------------------------------------------------
    def validate_dimensions(self, dimensions: tuple[str, ...]) -> None:
        for name in dimensions:
            if name not in self.dimensions:
                raise MetricValidationError(
                    "dimension_not_allowed",
                    f"Metric '{self.id}' does not support dimension '{name}'. "
                    f"Allowed: {list(self.dimensions)}.",
                )

    def validate_filters(self, filters: dict[str, Any]) -> None:
        for name in filters:
            if name not in self.filters:
                raise MetricValidationError(
                    "filter_not_allowed",
                    f"Metric '{self.id}' does not support filter '{name}'. "
                    f"Allowed: {list(self.filters)}.",
                )

    def validate_grain(self, grain: str | None) -> None:
        if grain is not None and grain not in self.grains:
            raise MetricValidationError(
                "grain_not_allowed",
                f"Metric '{self.id}' does not support grain '{grain}'. "
                f"Allowed: {list(self.grains)}.",
            )

    def coerce_params(self, params: dict[str, Any]) -> dict[str, Any]:
        """Validate and type-coerce client params. Raises on anything unknown.

        Returns a new dict containing exactly the declared params, so a
        resolver can index it without defaulting.
        """
        declared = {p.name: p for p in self.params}
        for name in params:
            if name not in declared:
                raise MetricValidationError(
                    "param_not_allowed",
                    f"Metric '{self.id}' does not accept param '{name}'. "
                    f"Allowed: {sorted(declared)}.",
                )

        coerced: dict[str, Any] = {}
        for name, spec in declared.items():
            if name not in params or params[name] is None:
                if spec.required:
                    raise MetricValidationError(
                        "param_required", f"Metric '{self.id}' requires param '{name}'."
                    )
                coerced[name] = spec.default
                continue
            coerced[name] = self._coerce_one(spec, params[name])
        return coerced

    def _coerce_one(self, spec: ParamDef, raw: Any) -> Any:
        try:
            if spec.type == "decimal":
                value: Any = Decimal(str(raw))
            elif spec.type == "int":
                value = int(raw)
            else:
                value = float(raw)
        except (TypeError, ValueError, InvalidOperation) as exc:
            raise MetricValidationError(
                "param_invalid",
                f"Param '{spec.name}' of metric '{self.id}' must be a {spec.type}, got {raw!r}.",
            ) from exc

        numeric = float(value)
        if spec.minimum is not None and numeric < spec.minimum:
            raise MetricValidationError(
                "param_out_of_range",
                f"Param '{spec.name}' must be >= {spec.minimum}, got {raw!r}.",
            )
        if spec.maximum is not None and numeric > spec.maximum:
            raise MetricValidationError(
                "param_out_of_range",
                f"Param '{spec.name}' must be <= {spec.maximum}, got {raw!r}.",
            )
        return value


def normalize(spec: MetricSpec, query):
    """Validate ``query`` against ``spec`` and fill in the spec's defaults.

    Kept next to the spec (rather than in the use case) because "which
    dimension does this metric use when the client names none" is part of the
    metric's definition. ``query`` is an application DTO, typed structurally to
    avoid the domain importing the application layer.
    """
    spec.validate_dimensions(tuple(query.dimensions))
    spec.validate_filters(dict(query.filters))
    spec.validate_grain(query.grain)
    if spec.kind == "aggregation" and query.params:
        raise MetricValidationError(
            "param_not_allowed",
            f"Metric '{spec.id}' is an aggregation and takes no params.",
        )
    return replace(
        query,
        dimensions=tuple(query.dimensions) or spec.default_dimensions,
        grain=query.grain or spec.default_grain,
    )
