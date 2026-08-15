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
    assert clf.detect_bank(banamex_doc) == "Banamex"
    cfdi_doc = ExtractedDocument(
        kind="xml", filename="f.xml", xml="<cfdi:Comprobante/>"
    )
    assert clf.classify(cfdi_doc) == TEMPLATE_SAT_CFDI


def test_one_counterparty_mention_does_not_claim_the_document():
    """The reported bug: a Nubank statement with transfers touching other
    banks classified as Banamex because 'banamex' appeared once in the body."""
    clf = KeywordTemplateClassifier()
    nu_doc = _text_doc(
        [
            "Nu México Financiera",
            "Estado de cuenta",
            *[f"0{d}/07/2026 Retiro de Cajita: Mis domingos 150.00" for d in range(1, 6)],
            "15/07/2026 SPEI enviado Banamex EDUARDO 500.00",
            "16/07/2026 EDUARDO B AZTECA Transferencia 300.00",
        ]
    )
    # No dedicated Nu parser, so the template is generic — but the bank is Nu,
    # and one Banamex counterparty line changes neither answer.
    assert clf.classify(nu_doc) == "generic_bank"
    assert clf.detect_bank(nu_doc) == "Nu"


def test_counterparty_spam_in_body_does_not_outvote_the_header():
    """Twenty transfers to Banco Azteca accounts are still Nu's statement."""
    clf = KeywordTemplateClassifier()
    doc = _text_doc(
        [
            "Nubank estado de cuenta",
            *[f"{d:02d}/07/2026 transferencia banco azteca 100.00" for d in range(1, 21)],
        ]
    )
    assert clf.detect_bank(doc) == "Nu"


def test_accents_do_not_hide_the_issuer():
    """The real Nu masthead says "Nu México" — with the accent. The old
    classifier lowercased without folding and never matched "nu mexico"."""
    clf = KeywordTemplateClassifier()
    doc = _text_doc(
        [
            "Nu México Financiera, S.A. de C.V.",
            "01/07/2026 Retiro de Cajita: Mis domingos 150.00",
        ]
    )
    assert clf.detect_bank(doc) == "Nu"
    assert clf.classify(doc) == "generic_bank"


def test_spei_receiving_bank_in_prose_does_not_claim_a_nu_statement():
    """The reported regression: Nu statements print the RECEIVING bank's
    formal name in prose SPEI blocks ("Banco receptor: Banco Nacional de
    México"). Product vocabulary — a Cajita movement — outweighs it: only
    the issuer's own products appear on its statement."""
    clf = KeywordTemplateClassifier()
    doc = _text_doc(
        [
            "Estado de cuenta",  # masthead is an image; no bank name in text
            "05/07/2026 Retiro de Cajita: Mis domingos 150.00",
            "12/07/2026 SPEI enviado 500.00",
            "Banco receptor: Banco Nacional de México",
            "18/07/2026 EDUARDO B AZTECA Transferencia 300.00",
        ]
    )
    assert clf.detect_bank(doc) == "Nu"
    assert clf.classify(doc) == "generic_bank"


def test_unknown_bank_stays_unnamed_and_generic():
    clf = KeywordTemplateClassifier()
    doc = _text_doc(["Caja Popular Los Pinos", "01/07/2026 abono 100.00"])
    assert clf.classify(doc) == "generic_bank"
    assert clf.detect_bank(doc) is None
