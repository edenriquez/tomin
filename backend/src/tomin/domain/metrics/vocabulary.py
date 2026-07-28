"""The closed vocabulary: every measure, dimension, filter and grain that exists.

Semantic names only. ``Measure.column`` and friends name a *semantic* column;
the DuckDB adapter owns the mapping to physical SQL. Nothing outside these
dictionaries can reach a query.
"""

from __future__ import annotations

from .spec import Dimension, Eq, FilterDef, Grain, Measure

# Default filters (docs/redesign-plan.md §1) attach to the measure so that
# "spend excludes what the user excluded" is declared once and inherited by
# every metric that sums money, rather than remembered in nine places. The
# remaining member, `is_primary_in_group` (fingerprint dedup), arrives with B10.
_LEDGER_DEFAULTS = (
    # The user's own opinion about a row. Honoured everywhere, immediately:
    # an exclusion that does not move the number on screen reads as a bug.
    Eq("excluded_from_stats", False),
)

MEASURES: dict[str, Measure] = {
    "expense_amount": Measure(
        name="expense_amount",
        column="amount",
        agg="sum",
        direction="expense",
        default_filters=_LEDGER_DEFAULTS,
    ),
    "income_amount": Measure(
        name="income_amount",
        column="amount",
        agg="sum",
        direction="income",
        default_filters=_LEDGER_DEFAULTS,
    ),
    # Signed: income positive, expense negative. The only measure that may go
    # below zero, which is the point of it.
    "net_amount": Measure(
        name="net_amount",
        column="amount",
        agg="sum",
        direction="net",
        default_filters=_LEDGER_DEFAULTS,
    ),
}

DIMENSIONS: dict[str, Dimension] = {
    "category": Dimension(
        name="category",
        column="category_name",
        label="Categoria",
        key_column="category_id",
    ),
    "month": Dimension(name="month", column="tx_month", label="Mes"),
    "currency": Dimension(name="currency", column="currency", label="Moneda"),
    "tx_type": Dimension(name="tx_type", column="tx_type", label="Tipo"),
}

FILTERS: dict[str, FilterDef] = {
    "category": FilterDef(name="category", column="category_id"),
    "currency": FilterDef(name="currency", column="currency"),
    "tx_type": FilterDef(name="tx_type", column="tx_type"),
}

GRAINS: dict[str, Grain] = {
    "day": Grain(name="day", column="tx_date"),
    "month": Grain(name="month", column="tx_date"),
}
