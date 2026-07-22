from __future__ import annotations

import logging

from flask import Flask, jsonify

from ....application.use_cases.process_file import (
    DuplicateStatementError,
    UnsupportedFileError,
)
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

    @app.errorhandler(ValueError)
    def _value(err: ValueError):
        return jsonify(error="Bad request", detail=str(err)), 400

    @app.errorhandler(Exception)
    def _unexpected(err: Exception):  # pragma: no cover - safety net
        logger.exception("Unhandled error")
        return jsonify(error="Internal server error"), 500
