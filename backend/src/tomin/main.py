from __future__ import annotations

import logging

from flask import Flask
from flask_cors import CORS

from .adapters.inbound.http import register_blueprints
from .adapters.inbound.http.errors import register_error_handlers
from .config.container import Container
from .config.settings import Settings, get_settings

logging.basicConfig(level=logging.INFO)


def create_app(settings: Settings | None = None) -> Flask:
    """Application factory: builds the container, wires HTTP adapters, bootstraps."""
    settings = settings or get_settings()
    container = Container(settings)
    container.bootstrap()

    app = Flask(__name__)
    app.extensions["container"] = container

    CORS(app, origins=settings.cors_origin_list, supports_credentials=True)

    register_blueprints(app)
    register_error_handlers(app)
    return app


# Expose a module-level app for `flask --app tomin.main run`.
app = create_app()


if __name__ == "__main__":
    # use_reloader=False: the reloader forks a second process that would open a
    # second connection to the single-writer DuckDB cube file and deadlock.
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=False)
