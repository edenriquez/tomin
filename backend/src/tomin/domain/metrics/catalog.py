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
    filters=("category", "currency", "tx_type", "tag"),
    default_dimensions=("category",),
    requires=("transactions",),
)

# Tag totals (docs/redesign-plan.md §3, metric 5). The breakdown **overlaps**:
# a transaction tagged both `viaje` and `deducible` is counted under each, so
# the rows do not sum to the period total. The engine flags that as
# `meta.overlapping` off the dimension's own declaration.
#
# Note what this deliberately is *not*: a return. Tagged outflows are
# contributions. An IRR computed from bank movements would be a number with a
# finance name and no finance meaning (§3, "Tag groups — returns").
TAG_TOTALS = MetricSpec(
    id="tag_totals",
    title="Totales por etiqueta",
    description=(
        "Gasto del periodo agrupado por etiqueta. Un movimiento con varias "
        "etiquetas cuenta en cada una, asi que las filas no suman el total."
    ),
    group="Patrimonio",
    kind="aggregation",
    shape="breakdown",
    unit="MXN",
    measures=("expense_amount",),
    dimensions=("tag",),
    filters=("tag", "category", "currency"),
    default_dimensions=("tag",),
    requires=("tags",),
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
    filters=("category", "currency", "tag"),
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
    filters=("category", "currency", "tag"),
    grains=("month", "day"),
    default_grain="month",
    cumulative=True,
    requires=("transactions",),
)

# Metric 4. Marked `quality="estimate"` and it must stay marked: the flag is
# read off free text, so a bank that words a withdrawal unusually is silently
# missed, and a confident unqualified number would overstate what the heuristic
# can know (§3, §4 -- the header tag is mandatory here).
CASH_WITHDRAWN = MetricSpec(
    id="cash_withdrawn",
    title="Efectivo retirado",
    description=(
        "Efectivo retirado por mes, detectado por la descripcion del "
        "movimiento. Excluye comisiones: la comision del cajero no es efectivo "
        "en tu bolsillo."
    ),
    group="Gasto",
    kind="aggregation",
    shape="series",
    unit="MXN",
    measures=("withdrawal_amount",),
    filters=("currency", "tag"),
    grains=("month", "day"),
    default_grain="month",
    requires=("transactions",),
    quality="estimate",
)

# Metric 9. "Arithmetically trivial, currently wrong -- every card payment
# inflates both sides. Do not ship before transfers are flagged" (§3). They are
# flagged now, and `_LEDGER_DEFAULTS` removes them from all three measures, so
# this is finally an honest number.
LIFETIME_FLOW = MetricSpec(
    id="lifetime_flow",
    title="Entradas vs salidas historicas",
    description=(
        "Totales de toda la historia: lo que ha entrado, lo que ha salido y el "
        "neto. Ignora el periodo del tablero a proposito."
    ),
    group="Patrimonio",
    kind="aggregation",
    shape="scalar",
    unit="MXN",
    measures=("income_amount", "expense_amount", "net_amount"),
    filters=("currency",),
    requires=("transactions",),
    ignores_period=True,
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
        TAG_TOTALS,
        MONTHLY_CASH_FLOW,
        ACCUMULATED_SPEND,
        CASH_WITHDRAWN,
        LIFETIME_FLOW,
        INVESTMENT_PROJECTION,
    )
}
