from __future__ import annotations

from flask import Blueprint, jsonify

from ..auth import get_container

categories_bp = Blueprint("categories", __name__, url_prefix="/api/categories")


@categories_bp.get("")
def list_categories():
    """The category catalog: id, display name, color, icon.

    Global reference data, not user data — every account shares one taxonomy
    today. `categorization_labels` stays server-side on purpose: it is the
    matcher's internal vocabulary, not something a client should render or
    depend on.
    """
    items = get_container().categories.get_all()
    return jsonify(
        items=[
            {"id": str(c.id), "name": c.name, "color": c.color, "icon": c.icon}
            for c in items
        ]
    )
