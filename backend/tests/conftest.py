import io

import pytest

from tomin.config.settings import Settings
from tomin.main import create_app


@pytest.fixture
def app(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path/'test.db'}",
        cube_path=":memory:",
        auth_disabled=True,
    )
    return create_app(settings)


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def sample_cfdi_bytes():
    xml = (
        '<?xml version="1.0"?>'
        '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" '
        'Total="500.00" Fecha="2024-02-10T09:00:00" TipoDeComprobante="I">'
        '<cfdi:Emisor Nombre="OXXO" Rfc="OXX999999"/>'
        "</cfdi:Comprobante>"
    )
    return io.BytesIO(xml.encode("utf-8"))
