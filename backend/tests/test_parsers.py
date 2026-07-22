from datetime import date
from decimal import Decimal

from tomin.adapters.outbound.extraction.classifier import (
    KeywordTemplateClassifier,
    TEMPLATE_BANAMEX,
    TEMPLATE_SAT_CFDI,
)
from tomin.adapters.outbound.parsing import (
    BanamexParser,
    GenericBankParser,
    SatCfdiParser,
)
from tomin.application.dtos.extraction import ExtractedDocument
from tomin.domain.value_objects.enums import SourceType, TxType


def _text_doc(lines: list[str]) -> ExtractedDocument:
    return ExtractedDocument(
        kind="text", filename="s.pdf", text="\n".join(lines), lines=lines
    )


def test_generic_bank_parser_extracts_transactions():
    lines = [
        "Estado de cuenta 2024",
        "05/01/2024 OXXO SAN RAFAEL 45.50",
        "07/01/2024 SPEI RECIBIDO NOMINA 12,000.00",
        "10/01/2024 NETFLIX.COM 299.00",
        "no date here 100.00",
    ]
    stmt = GenericBankParser().parse(_text_doc(lines))
    assert stmt.source_type == SourceType.BANK_PDF
    assert len(stmt.transactions) == 3
    oxxo = stmt.transactions[0]
    assert oxxo.tx_date == date(2024, 1, 5)
    assert oxxo.amount == Decimal("45.50")
    assert oxxo.tx_type == TxType.EXPENSE
    nomina = stmt.transactions[1]
    assert nomina.tx_type == TxType.INCOME
    assert nomina.amount == Decimal("12000.00")
    assert stmt.period_start == date(2024, 1, 5)
    assert stmt.period_end == date(2024, 1, 10)


def test_banamex_parser_tags_bank():
    lines = ["05-ENE-2024 STARBUCKS REFORMA 120.00"]
    stmt = BanamexParser().parse(_text_doc(lines))
    assert stmt.bank == "Banamex"
    assert stmt.transactions[0].tx_date == date(2024, 1, 5)
    assert stmt.transactions[0].amount == Decimal("120.00")


def test_sat_cfdi_parser():
    xml = (
        '<?xml version="1.0"?>'
        '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" '
        'Total="1160.00" Fecha="2024-03-15T10:00:00" TipoDeComprobante="I">'
        '<cfdi:Emisor Nombre="TIENDAS SORIANA" Rfc="SOR123456"/>'
        "</cfdi:Comprobante>"
    )
    doc = ExtractedDocument(kind="xml", filename="factura.xml", xml=xml)
    stmt = SatCfdiParser().parse(doc)
    assert stmt.source_type == SourceType.SAT_XML
    assert len(stmt.transactions) == 1
    tx = stmt.transactions[0]
    assert tx.amount == Decimal("1160.00")
    assert tx.tx_date == date(2024, 3, 15)
    assert tx.raw_description == "TIENDAS SORIANA"
    assert tx.tx_type == TxType.EXPENSE


def test_classifier_routes_templates():
    clf = KeywordTemplateClassifier()
    banamex_doc = _text_doc(["CITIBANAMEX estado de cuenta", "05/01/2024 OXXO 45.50"])
    assert clf.classify(banamex_doc) == TEMPLATE_BANAMEX
    cfdi_doc = ExtractedDocument(
        kind="xml", filename="f.xml", xml="<cfdi:Comprobante/>"
    )
    assert clf.classify(cfdi_doc) == TEMPLATE_SAT_CFDI
