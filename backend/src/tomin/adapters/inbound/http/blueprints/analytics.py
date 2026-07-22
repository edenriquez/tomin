from __future__ import annotations

from flask import Blueprint, jsonify

from ..auth import current_user_id, get_container
from ..serialization import (
    category_spend_json,
    monthly_point_json,
    spending_summary_json,
)
from ._helpers import query_date, query_int

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@analytics_bp.get("/summary")
def summary():
    user_id = current_user_id()
    result = get_container().spending_summary.execute(
        user_id=user_id, start=query_date("start"), end=query_date("end")
    )
    return jsonify(spending_summary_json(result))


@analytics_bp.get("/spending-by-category")
def spending_by_category():
    user_id = current_user_id()
    rows = get_container().cube.spending_by_category(
        user_id, query_date("start"), query_date("end")
    )
    return jsonify(items=[category_spend_json(c) for c in rows])


@analytics_bp.get("/monthly")
def monthly():
    user_id = current_user_id()
    rows = get_container().cube.monthly_series(user_id, months=query_int("months", 12))
    return jsonify(items=[monthly_point_json(m) for m in rows])


@analytics_bp.get("/recurring")
def recurring():
    user_id = current_user_id()
    items = get_container().detect_recurring.execute(user_id=user_id)
    return jsonify(
        items=[
            {
                "label": i.label,
                "average_amount": float(i.average_amount),
                "frequency": i.frequency,
                "occurrences": i.occurrences,
            }
            for i in items
        ]
    )
