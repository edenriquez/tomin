"""METRIC_CATALOG -- the declarations (docs/redesign-plan.md §1).

Three aggregation metrics ported from the bespoke cube reads, plus one computed
metric. The pair proves the registry is **bimodal**: an aggregation is compiled
to SQL and a computed metric is a Python function, and the client cannot tell
which is which from the envelope.

This lives in ``domain`` because "accumulated spend is a running sum of
expenses within the period" is a business definition, not a query detail.
"""

from __future__ import annotations

from .spec import MetricSpec, ParamDef

SPEND_BY_CATEGORY = MetricSpec(
    id="spend_by_category",
    title="Gasto por categoria",
    description="Gasto del periodo desglosado por categoria.",
    group="Gasto",
    kind="aggregation",
    shape="breakdown",
    unit="MXN",
    measures=("expense_amount",),
    dimensions=("category", "tx_type"),
    filters=("category", "currency", "tx_type"),
    default_dimensions=("category",),
    requires=("transactions",),
)

MONTHLY_CASH_FLOW = MetricSpec(
    id="monthly_cash_flow",
    title="Entradas vs salidas",
    description="Ingreso y gasto por mes dentro del periodo.",
    group="Ingreso",
    kind="aggregation",
    shape="series",
    unit="MXN",
    measures=("income_amount", "expense_amount"),
    dimensions=(),
    filters=("category", "currency"),
    grains=("month",),
    default_grain="month",
    requires=("transactions",),
)

ACCUMULATED_SPEND = MetricSpec(
    id="accumulated_spend",
    title="Gasto acumulado",
    description="Suma corrida del gasto dentro del periodo, mes a mes.",
    group="Gasto",
    kind="aggregation",
    shape="series",
    unit="MXN",
    measures=("expense_amount",),
    dimensions=(),
    filters=("category", "currency"),
    grains=("month", "day"),
    default_grain="month",
    cumulative=True,
    requires=("transactions",),
)

# Computed. The math already exists in domain/services/forecasting.py; what does
# not exist yet is account/balance/rate CRUD (B8), so every input is supplied by
# the client for now. `requires` stays empty for that reason -- the widget is
# usable today; when B8 lands the inputs become derivable and this gains
# "balance".
INVESTMENT_PROJECTION = MetricSpec(
    id="investment_projection",
    title="Proyeccion de inversion",
    description=(
        "Proyecta un saldo hacia adelante con aportaciones mensuales y una tasa "
        "anual. Los valores son capturados por el usuario, no derivados de los "
        "estados de cuenta."
    ),
    group="Patrimonio",
    kind="computed",
    shape="series",
    unit="MXN",
    params=(
        ParamDef("starting_balance", "decimal", required=True, minimum=0),
        ParamDef("annual_rate", "float", required=True, minimum=-1, maximum=10),
        ParamDef("monthly_contribution", "decimal", default=0),
        ParamDef("months", "int", default=12, minimum=1, maximum=600),
    ),
    requires=(),
)

METRIC_CATALOG: dict[str, MetricSpec] = {
    spec.id: spec
    for spec in (
        SPEND_BY_CATEGORY,
        MONTHLY_CASH_FLOW,
        ACCUMULATED_SPEND,
        INVESTMENT_PROJECTION,
    )
}
