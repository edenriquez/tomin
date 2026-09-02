"""Reading a ticket with the configured model, and checking its homework.

A thermal print read through a phone camera is the one input in this codebase
where a language model is genuinely better than a rule: it survives two
columns, a torn edge, a price that OCR split across lines, and abbreviations no
table will ever cover. So it gets to read.

It does not get to be believed. Every answer is checked against the arithmetic
the ticket itself prints — the items have to add up to the total — and the
heuristic reads the same lines in parallel. Whichever comes closer to the
printed total wins, and a model answer that will not parse loses by default.
That check is the whole reason this adapter can exist inside a product whose
posture is "nunca inventes una cifra": the model's output is a *proposal*,
scored against a number it did not produce.
"""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Sequence
from datetime import date
from decimal import Decimal, InvalidOperation

from ....application.dtos.receipts import ParsedReceipt, ParsedReceiptItem
from ....application.ports.outbound.chat import ChatMessage, ChatPort, ChatUnavailable
from .heuristic import HeuristicReceiptReader

logger = logging.getLogger(__name__)

#: Beyond this many lines the ticket is not a ticket (a mis-fired OCR of a
#: newspaper, a scanned book page). Refusing early keeps a pathological input
#: from turning into a very large request.
MAX_LINES = 400

_FENCE = re.compile(r"^```(?:json)?|```$", re.MULTILINE)

SYSTEM = """\
Lees tickets de compra mexicanos que un teléfono ya convirtió en texto por OCR.

Devuelves EXCLUSIVAMENTE un objeto JSON, sin explicación y sin markdown:

{
  "store": "SORIANA HIPER" | null,
  "purchased_at": "2026-08-22" | null,
  "total": "141.60" | null,
  "items": [
    {"line_no": 4, "description": "LECHE LALA ENT 1L", "amount": "28.50",
     "quantity": "2" | null, "unit_price": "20.00" | null}
  ]
}

Reglas:

1. NUNCA inventes una línea, un precio ni un producto. Si el OCR dejó una línea
   ilegible, omítela: un ticket incompleto es correcto, uno inventado no.
2. `amount` es el importe de la línea (lo que se cobró por esa partida).
   `unit_price` es el precio de UNA pieza, solo si el ticket lo imprime o si
   imprime la cantidad. Si no lo sabes, usa null.
3. `line_no` es el índice (empezando en 0) de la línea del OCR de donde sacaste
   la partida. Si la partida ocupa dos líneas, usa el índice del nombre.
4. `description` es el nombre del producto tal como está impreso, sin el código
   de barras del inicio y sin el importe del final.
5. NO son partidas: SUBTOTAL, TOTAL, IVA, EFECTIVO, CAMBIO, TARJETA, PROPINA,
   AHORRO, DESCUENTO, puntos, folios, RFC, teléfonos ni direcciones.
6. `total` es lo que el cliente pagó por la mercancía (la línea TOTAL), no el
   efectivo entregado ni el cambio.
7. Los montos van como cadenas con punto decimal: "28.50", no 28.5.
8. Fecha en formato ISO (aaaa-mm-dd). El ticket la imprime dd/mm/aaaa.

Si el texto no parece un ticket de compra, devuelve {"store": null,
"purchased_at": null, "total": null, "items": []}."""


class LlmReceiptReader:
    """Implements :class:`ReceiptReader` against the configured chat model."""

    def __init__(self, chat: ChatPort, fallback: HeuristicReceiptReader | None = None) -> None:
        self._chat = chat
        self._fallback = fallback or HeuristicReceiptReader()

    @property
    def label(self) -> str:
        return f"llm:{self._chat.model_label}"

    def read(self, lines: Sequence[str]) -> ParsedReceipt:
        lines = list(lines)[:MAX_LINES]
        baseline = self._fallback.read(lines)
        if not self._chat.available or not lines:
            return baseline

        try:
            raw = "".join(
                self._chat.stream(
                    system=SYSTEM,
                    messages=[ChatMessage(role="user", content=_numbered(lines))],
                )
            )
        except ChatUnavailable as exc:
            # Not an error the user needs to see: the ticket was still read.
            logger.info("receipt: model unavailable, kept the heuristic read (%s)", exc)
            return baseline

        proposal = self._parse(raw, lines)
        if proposal is None:
            logger.info("receipt: model answer did not parse, kept the heuristic read")
            return baseline
        return _closer_to_total(proposal, baseline)

    # --- parsing ---------------------------------------------------------
    def _parse(self, raw: str, lines: list[str]) -> ParsedReceipt | None:
        try:
            payload = json.loads(_FENCE.sub("", raw).strip())
        except (ValueError, TypeError):
            return None
        if not isinstance(payload, dict):
            return None

        items: list[ParsedReceiptItem] = []
        for entry in payload.get("items") or []:
            item = _item(entry, lines)
            if item is not None:
                items.append(item)

        return ParsedReceipt(
            store=_text(payload.get("store")),
            purchased_at=_date(payload.get("purchased_at")),
            total=_amount(payload.get("total")),
            items=items,
            reader=self.label,
        )


def _numbered(lines: list[str]) -> str:
    """The OCR lines with their indices, which the model answers in terms of."""
    body = "\n".join(f"{i}: {line}" for i, line in enumerate(lines))
    return f"Líneas del OCR:\n{body}"


def _closer_to_total(proposal: ParsedReceipt, baseline: ParsedReceipt) -> ParsedReceipt:
    """Pick the read whose items add up closest to the ticket's own total.

    With no total printed there is nothing to check against, and the model's
    read is preferred: it is better at the layout, and this is precisely the
    case where the heuristic has no anchor either.

    An empty item list never wins over a non-empty one. A model that returned
    nothing has not proven the ticket is empty, it has failed to read it.
    """
    total = proposal.total or baseline.total
    if not proposal.items:
        return baseline
    if not baseline.items or total is None:
        return proposal
    return min(
        (proposal, baseline),
        key=lambda parsed: abs(sum((i.amount for i in parsed.items), Decimal("0")) - total),
    )


def _item(entry, lines: list[str]) -> ParsedReceiptItem | None:
    if not isinstance(entry, dict):
        return None
    amount = _amount(entry.get("amount"))
    description = _text(entry.get("description"))
    if amount is None or amount <= 0 or not description:
        return None
    line_no = entry.get("line_no")
    line_no = line_no if isinstance(line_no, int) and 0 <= line_no < len(lines) else -1
    quantity = _amount(entry.get("quantity"))
    return ParsedReceiptItem(
        line_no=line_no,
        # The evidence is the OCR line, not the model's paraphrase of it. When
        # the model did not say which line it read, the paraphrase is all there
        # is and is marked as such.
        raw_text=lines[line_no] if line_no >= 0 else f"~ {description} {amount}",
        description=description,
        amount=amount,
        quantity=quantity if quantity and quantity > 0 else None,
        unit_price=_amount(entry.get("unit_price")),
    )


def _text(value) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.split())
    return cleaned or None


def _amount(value) -> Decimal | None:
    if isinstance(value, (int, float)):
        value = str(value)
    if not isinstance(value, str):
        return None
    try:
        return Decimal(value.replace("$", "").replace(",", "").strip())
    except InvalidOperation:
        return None


def _date(value) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value.strip()[:10])
    except ValueError:
        return None
