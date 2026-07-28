from __future__ import annotations

from uuid import UUID

from flask import Blueprint, jsonify, request

from ..auth import current_user_id, get_container
from ..serialization import statement_json

statements_bp = Blueprint("statements", __name__, url_prefix="/api/statements")


@statements_bp.get("")
def list_statements():
    """List the statements ingested for the current user, newest first."""
    user_id = current_user_id()
    items = get_container().manage_statements.list(user_id=user_id)
    return jsonify(items=[statement_json(s) for s in items], total=len(items))


@statements_bp.post("")
def upload_statement():
    """Accept a transient statement upload (PDF or SAT XML) and process it.

    The raw file is parsed then discarded; only structured data is stored.
    """
    user_id = current_user_id()
    if "file" not in request.files:
        return jsonify(error="No file part named 'file'"), 400

    upload = request.files["file"]
    data = upload.read()
    if not data:
        return jsonify(error="Empty file"), 400

    result = get_container().process_file.execute(
        user_id=user_id,
        data=data,
        filename=upload.filename or "upload",
        mime=upload.mimetype,
    )
    return (
        jsonify(
            statement_id=str(result.statement_id),
            template=result.template,
            transactions_created=result.transactions_created,
        ),
        201,
    )


@statements_bp.delete("/<statement_id>")
def delete_statement(statement_id: str):
    """Delete a statement and every transaction derived from it.

    Only the server-side structured data is removed; the user's own copy of the
    raw file lives on their device.
    """
    user_id = current_user_id()
    result = get_container().manage_statements.delete(
        user_id=user_id, statement_id=UUID(statement_id)
    )
    return jsonify(
        statement_id=str(result.statement_id),
        transactions_deleted=result.transactions_deleted,
    )
