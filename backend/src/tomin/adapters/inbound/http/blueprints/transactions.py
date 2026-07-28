from __future__ import annotations

import csv
import io
from uuid import UUID

from flask import Blueprint, Response, jsonify, request

from .....application.use_cases.update_transaction import UNSET
from ..auth import current_user_id, get_container
from ..serialization import transaction_json
from ._helpers import query_date, query_int

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")


def _filters():
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


@transactions_bp.patch("/<transaction_id>")
def update_transaction(transaction_id: str):
    """Apply a user's correction to one transaction.

    Only keys actually present in the body are applied. That distinction is
    load-bearing: ``{"category_id": null}`` means *clear the category*, whereas
    omitting the key means *leave it alone*, and a plain ``body.get()`` would
    collapse the two.
    """
    user_id = current_user_id()
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        return jsonify(error="Body must be an object"), 400

    unknown = set(body) - _PATCHABLE
    if unknown:
        return jsonify(error=f"Unsupported fields: {sorted(unknown)}"), 400

    transaction = get_container().update_transaction.execute(
        user_id=user_id,
        transaction_id=UUID(transaction_id),
        category_id=_optional_uuid(body, "category_id"),
        description=body.get("description", UNSET),
        notes=body.get("notes", UNSET),
        excluded_from_stats=body.get("excluded_from_stats", UNSET),
    )
    return jsonify(transaction_json(transaction))


#: The only fields a user may rewrite. Date, amount, currency and direction come
#: from the statement; letting a client edit them would make an ingest bug
#: indistinguishable from a correction.
_PATCHABLE = {"category_id", "description", "notes", "excluded_from_stats"}


def _optional_uuid(body: dict, key: str):
    if key not in body:
        return UNSET
    raw = body[key]
    return UUID(raw) if raw is not None else None


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
