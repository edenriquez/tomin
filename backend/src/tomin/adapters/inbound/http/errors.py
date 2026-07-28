from __future__ import annotations

import logging

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from ....application.use_cases.process_file import (
    DuplicateStatementError,
    UnsupportedFileError,
)
from ....application.use_cases.statements import StatementNotFoundError
from .auth import AuthError

logger = logging.getLogger(__name__)


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(AuthError)
    def _auth(err: AuthError):
        return jsonify(error=str(err)), 401

    @app.errorhandler(DuplicateStatementError)
    def _dup(err: DuplicateStatementError):
        return jsonify(error="This file was already processed", detail=str(err)), 409

    @app.errorhandler(UnsupportedFileError)
    def _unsupported(err: UnsupportedFileError):
        return jsonify(error="Unsupported file type", detail=str(err)), 415

    @app.errorhandler(StatementNotFoundError)
    def _statement_missing(err: StatementNotFoundError):
        return jsonify(error="Statement not found", detail=str(err)), 404

    @app.errorhandler(ValueError)
    def _value(err: ValueError):
        return jsonify(error="Bad request", detail=str(err)), 400

    @app.errorhandler(HTTPException)
    def _http(err: HTTPException):
        # Must be registered explicitly: the Exception catch-all below would
        # otherwise swallow werkzeug's own 404/405/413 and report them as 500s.
        return jsonify(error=err.name, detail=err.description), err.code

    @app.errorhandler(Exception)
    def _unexpected(err: Exception):  # pragma: no cover - safety net
        logger.exception("Unhandled error")
        return jsonify(error="Internal server error"), 500
