from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from ....application.dtos.analytics import CategorySpend, MonthlyPoint, SpendingSummary
from ....domain.entities import Goal, Transaction
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


def goal_json(g: Goal) -> dict:
    return {
        "id": str(g.id),
        "name": g.name,
        "target_amount": _num(g.target_amount),
        "current_amount": _num(g.current_amount),
        "target_date": _iso(g.target_date),
        "progress": round(g.progress, 4),
    }
