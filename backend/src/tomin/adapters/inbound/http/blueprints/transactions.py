from __future__ import annotations

import csv
import io
from uuid import UUID

from flask import Blueprint, Response, jsonify

from ..auth import current_user_id, get_container
from ..serialization import transaction_json
from ._helpers import query_date, query_int

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")


def _filters():
    from flask import request

    category = request.args.get("category_id")
    return {
        "start": query_date("start"),
        "end": query_date("end"),
        "category_id": UUID(category) if category else None,
        "search": request.args.get("search"),
    }


@transactions_bp.get("")
def list_transactions():
    user_id = current_user_id()
    filters = _filters()
    page = get_container().list_transactions.execute(
        user_id=user_id,
        limit=query_int("limit", 100),
        offset=query_int("offset", 0),
        **filters,
    )
    return jsonify(
        items=[transaction_json(t) for t in page.items],
        total=page.total,
        limit=page.limit,
        offset=page.offset,
    )


@transactions_bp.get("/export.csv")
def export_csv():
    user_id = current_user_id()
    filters = _filters()
    page = get_container().list_transactions.execute(
        user_id=user_id, limit=100000, offset=0, **filters
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["date", "description", "amount", "currency", "type", "status"])
    for t in page.items:
        writer.writerow(
            [t.tx_date.isoformat(), t.description, t.amount, t.currency,
             t.tx_type.value, t.status.value]
        )
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )
