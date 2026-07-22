from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..auth import current_user_id, get_container

statements_bp = Blueprint("statements", __name__, url_prefix="/api/statements")


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
