from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from xml.etree import ElementTree as ET

from ....application.dtos.extraction import ExtractedDocument, ParsedStatement, ParsedTransaction
from ....domain.value_objects.enums import SourceType, TxType


class SatCfdiParser:
    """Parses SAT CFDI XML (Mexican digital tax invoices).

    A single upload may contain one CFDI. Because attributes in CFDI are not
    namespaced (only element tags are), we match tags by local name to be
    resilient across CFDI 3.3 / 4.0.
    """

    template_key = "sat_cfdi"

    def parse(self, doc: ExtractedDocument) -> ParsedStatement:
        if not doc.xml:
            return ParsedStatement(source_type=SourceType.SAT_XML, transactions=[])

        root = ET.fromstring(doc.xml)
        comprobante = self._find_local(root, "Comprobante")
        if comprobante is None:
            comprobante = root

        total = self._decimal(comprobante.get("Total"))
        fecha = self._date(comprobante.get("Fecha"))
        tipo = (comprobante.get("TipoDeComprobante") or "I").upper()

        emisor = self._find_local(root, "Emisor")
        description = (
            (emisor.get("Nombre") if emisor is not None else None)
            or (emisor.get("Rfc") if emisor is not None else None)
            or "CFDI"
        )

        # From the receiver's (user's) perspective: an income CFDI ("I") is an
        # expense they paid; an "E" (egreso/credit note) is money back.
        tx_type = TxType.INCOME if tipo == "E" else TxType.EXPENSE

        transactions: list[ParsedTransaction] = []
        if total is not None and fecha is not None:
            transactions.append(
                ParsedTransaction(
                    tx_date=fecha,
                    amount=total,
                    raw_description=description,
                    tx_type=tx_type,
                )
            )

        return ParsedStatement(
            source_type=SourceType.SAT_XML,
            bank="SAT",
            transactions=transactions,
            period_start=fecha,
            period_end=fecha,
        )

    @staticmethod
    def _find_local(root: ET.Element, local_name: str) -> ET.Element | None:
        if root.tag.rsplit("}", 1)[-1] == local_name:
            return root
        for el in root.iter():
            if el.tag.rsplit("}", 1)[-1] == local_name:
                return el
        return None

    @staticmethod
    def _decimal(value: str | None) -> Decimal | None:
        if not value:
            return None
        try:
            return Decimal(value)
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _date(value: str | None) -> date | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            try:
                return datetime.strptime(value[:10], "%Y-%m-%d").date()
            except ValueError:
                return None
