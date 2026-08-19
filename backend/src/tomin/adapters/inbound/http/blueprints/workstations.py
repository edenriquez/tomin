"""A user's saved lenses over the ledger.

Plain REST over a collection, unlike ``/api/dashboards/home``: there is exactly
one dashboard per user but a workstation is a thing you make several of, so the
id is in the path from the start.

The response carries ``filters`` -- the rule already translated into a metric
query -- alongside the rule itself. Without it every client would reimplement
``WorkstationRule.to_filters`` and one of them would eventually disagree about
what "between 10 and 300" means, which is the class of bug the whole closed
vocabulary exists to prevent.
"""

from __future__ import annotations

from uuid import UUID

from flask import Blueprint, jsonify, request

from .....application.use_cases.workstations import WorkstationNotFound
from .....domain.entities import WorkstationRule
from ..auth import current_user_id, get_container
from ..serialization import workstation_json

workstations_bp = Blueprint("workstations", __name__, url_prefix="/api/workstations")

#: Mirrors the transaction and tag patches: only declared fields are writable,
#: and an unrecognised key is a 400 rather than a silent no-op.
_PATCHABLE = {"name", "rule", "excluded_tx_ids"}


@workstations_bp.get("")
def list_workstations():
    items = get_container().manage_workstations.list(user_id=current_user_id())
    return jsonify(items=[workstation_json(w) for w in items], total=len(items))


@workstations_bp.post("")
def create_workstation():
    body = request.get_json(silent=True) or {}
    if not body.get("name"):
        return jsonify(error="name is required"), 400

    # An unknown rule key, an empty needle, min above max, or a filter the
    # catalog would reject all raise ValueError subclasses and land on the
    # app-wide 400 handler. Failing here is the design: a rule that saves and
    # then returns nothing forever is worse than a rule that refuses to save.
    workstation = get_container().manage_workstations.create(
        user_id=current_user_id(),
        name=body["name"],
        rule=_rule(body.get("rule")),
        excluded_tx_ids=_uuids(body.get("excluded_tx_ids")),
    )
    return jsonify(workstation_json(workstation)), 201


@workstations_bp.get("/<workstation_id>")
def get_workstation(workstation_id: str):
    try:
        workstation = get_container().manage_workstations.get(
            user_id=current_user_id(), workstation_id=UUID(workstation_id)
        )
    except WorkstationNotFound:
        return jsonify(error="Workstation not found"), 404
    return jsonify(workstation_json(workstation))


@workstations_bp.patch("/<workstation_id>")
def update_workstation(workstation_id: str):
    body = request.get_json(silent=True) or {}
    unknown = set(body) - _PATCHABLE
    if unknown:
        return jsonify(error=f"Unsupported fields: {sorted(unknown)}"), 400

    try:
        workstation = get_container().manage_workstations.update(
            user_id=current_user_id(),
            workstation_id=UUID(workstation_id),
            name=body.get("name"),
            # A rule is replaced wholesale when given, never merged: a rule is
            # one thought, and half of a new one over half of an old one
            # describes a set nobody asked for.
            rule=_rule(body["rule"]) if "rule" in body else None,
            excluded_tx_ids=(
                _uuids(body["excluded_tx_ids"]) if "excluded_tx_ids" in body else None
            ),
        )
    except WorkstationNotFound:
        return jsonify(error="Workstation not found"), 404
    return jsonify(workstation_json(workstation))


@workstations_bp.delete("/<workstation_id>")
def delete_workstation(workstation_id: str):
    try:
        get_container().manage_workstations.delete(
            user_id=current_user_id(), workstation_id=UUID(workstation_id)
        )
    except WorkstationNotFound:
        return jsonify(error="Workstation not found"), 404
    # The movements survive; only the lens is gone.
    return jsonify(workstation_id=workstation_id, deleted=True)


def _rule(raw) -> WorkstationRule:
    if not isinstance(raw, dict):
        raise ValueError("'rule' must be an object")
    allowed = set(WorkstationRule.__slots__)
    unknown = set(raw) - allowed
    if unknown:
        raise ValueError(f"Unsupported rule conditions: {sorted(unknown)}")
    return WorkstationRule(
        description_contains=raw.get("description_contains"),
        amount_min=raw.get("amount_min"),
        amount_max=raw.get("amount_max"),
        category_id=_uuid_or_none(raw.get("category_id")),
        tag_id=_uuid_or_none(raw.get("tag_id")),
    )


def _uuids(raw) -> list[UUID]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValueError("'excluded_tx_ids' must be a list of ids")
    return [UUID(value) for value in raw]


def _uuid_or_none(value) -> UUID | None:
    return UUID(value) if value else None
