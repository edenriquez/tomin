from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from ....application.dtos.analytics import CategorySpend, MonthlyPoint, SpendingSummary
from ....application.dtos.metrics import MetricError, MetricResult
from ....domain.entities import Goal, Statement, Transaction
from ....domain.metrics.spec import MetricSpec
from ....domain.services.forecasting import ForecastPoint


def _num(value: Decimal | None) -> float:
    return float(value) if value is not None else 0.0


def _iso(value: date | datetime | None) -> str | None:
    return value.isoformat() if value else None


def transaction_json(t: Transaction) -> dict:
    return {
        "id": str(t.id),
        "statement_id": str(t.statement_id) if t.statement_id else None,
        "date": _iso(t.tx_date),
        "description": t.description,
        "raw_description": t.raw_description,
        "amount": _num(t.amount),
        "currency": t.currency,
        "type": t.tx_type.value,
        "status": t.status.value,
        "category_id": str(t.category_id) if t.category_id else None,
        "merchant_id": str(t.merchant_id) if t.merchant_id else None,
    }


def statement_json(s: Statement) -> dict:
    return {
        "id": str(s.id),
        "source_type": s.source_type.value,
        "bank": s.bank,
        "period_start": _iso(s.period_start),
        "period_end": _iso(s.period_end),
        "status": s.status.value,
        "uploaded_at": _iso(s.uploaded_at),
    }


def category_spend_json(c: CategorySpend) -> dict:
    return {
        "category_id": c.category_id,
        "category_name": c.category_name,
        "amount": _num(c.amount),
        "percentage": c.percentage,
    }


def monthly_point_json(m: MonthlyPoint) -> dict:
    return {"month": m.month, "income": _num(m.income), "expense": _num(m.expense)}


def spending_summary_json(s: SpendingSummary) -> dict:
    return {
        "total_income": _num(s.total_income),
        "total_expense": _num(s.total_expense),
        "top_category": s.top_category,
        "by_category": [category_spend_json(c) for c in s.by_category],
        "monthly": [monthly_point_json(m) for m in s.monthly],
    }


def forecast_point_json(p: ForecastPoint) -> dict:
    return {
        "month_offset": p.month_offset,
        "baseline": _num(p.baseline_net_worth),
        "optimized": _num(p.optimized_net_worth),
    }


def metric_spec_json(spec: MetricSpec) -> dict:
    """The catalog as data: everything the widget picker needs before querying.

    ``kind`` is deliberately omitted -- whether a metric compiles to SQL or runs
    a Python function is an implementation fact, and publishing it would let a
    client couple to it and block the migration later.
    """
    return {
        "id": spec.id,
        "title": spec.title,
        "description": spec.description,
        "group": spec.group,
        "shape": spec.shape,
        "unit": spec.unit,
        "dimensions": list(spec.dimensions),
        "filters": list(spec.filters),
        "grains": list(spec.grains),
        "default_dimensions": list(spec.default_dimensions),
        "default_grain": spec.default_grain,
        "cumulative": spec.cumulative,
        "requires": list(spec.requires),
        "params": [
            {
                "name": p.name,
                "type": p.type,
                "required": p.required,
                # Decimals reach JSON as strings, like every other money value.
                "default": None if p.default is None else str(p.default),
                "minimum": p.minimum,
                "maximum": p.maximum,
            }
            for p in spec.params
        ],
    }


def metric_result_json(result: MetricResult) -> dict:
    return {
        "metric": result.metric_id,
        "shape": result.shape,
        "unit": result.unit,
        "value": result.value,
        "rows": result.rows,
        "meta": {
            "currency": result.meta.currency,
            "overlapping": result.meta.overlapping,
            "partial": result.meta.partial,
            "source_txn_count": result.meta.source_txn_count,
        },
    }


def metric_error_json(error: MetricError) -> dict:
    return {
        "error": {
            "metric": error.metric_id,
            "code": error.code,
            "message": error.message,
        }
    }


def metric_entry_json(entry: MetricResult | MetricError) -> dict:
    return (
        metric_error_json(entry)
        if isinstance(entry, MetricError)
        else metric_result_json(entry)
    )


def goal_json(g: Goal) -> dict:
    return {
        "id": str(g.id),
        "name": g.name,
        "target_amount": _num(g.target_amount),
        "current_amount": _num(g.current_amount),
        "target_date": _iso(g.target_date),
        "progress": round(g.progress, 4),
    }
