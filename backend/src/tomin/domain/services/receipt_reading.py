"""Reading a grocery ticket that a phone camera turned into lines of text.

A ticket is not a bank statement. There are no columns to trust, no issuer to
classify, and OCR will hand us ``LECHE LALA ENT 1L 28,50`` on a good day and
``LECHE LALA ENT lL 28.5O`` on a bad one. So this reader is built on one
assumption only — **a product line ends in money** — and everything else is a
sequence of small, individually reversible decisions around it.

It is deliberately conservative in both directions:

* A line it cannot read is *dropped*, not guessed at. The receipt then shows a
  smaller basket than the printed total, and the UI says so out loud
  ("faltan $32.50"). A guessed line would poison a price history that the
  whole feature exists to make trustworthy.
* A line it *can* read keeps its raw text, so the user can see what it decided
  and correct it.

This is the fallback that always works, with no key and no network. When a
model is configured, ``adapters/outbound/receipts/llm.py`` reads the same lines
better — and falls back here the moment it returns something that does not
add up.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date
from decimal import Decimal, InvalidOperation

from ...application.dtos.receipts import ParsedReceipt, ParsedReceiptItem

#: The chains a Mexican grocery ticket is most likely to come from. Used only
#: to *name* the store when the header is legible; an unknown store falls back
#: to the first readable header line, which is right far more often than not.
_CHAINS = (
    "bodega aurrera",
    "walmart express",
    "walmart",
    "sams club",
    "sams",
    "costco",
    "soriana",
    "mega soriana",
    "chedraui",
    "la comer",
    "city market",
    "fresko",
    "superama",
    "heb",
    "casa ley",
    "calimax",
    "smart and final",
    "tiendas 3b",
    "bara",
    "merco",
    "alsuper",
    "oxxo",
    "seven eleven",
    "7 eleven",
    "circle k",
    "farmacia guadalajara",
    "farmacias similares",
    "waldos",
    "del sol",
    "elektra",
    "mercado soriana",
    "sumesa",
)

_WS = re.compile(r"\s+")


def _clean(line: str) -> str:
    """Strip accents and collapse whitespace, keeping case and punctuation.

    Everything else in the domain folds punctuation away, and here that would
    be fatal twice over: ``22/08/2026`` becomes three numbers and ``28.50``
    becomes two. Case is kept because this string is what the user reads back
    as the product's name.
    """
    if not line:
        return ""
    text = unicodedata.normalize("NFKD", line)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return _WS.sub(" ", text).strip()


#: An amount at the end of a line, with an optional currency mark and the tax
#: flag letter Mexican tickets print after the price ("28.50 T", "12.00 E").
_TRAILING_AMOUNT = re.compile(
    r"(?:\$\s*)?(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\d+\.\d{2}|-?\d+,\d{2})\s*[a-z]?\s*$",
    re.IGNORECASE,
)

#: ``2 X 20.00`` / ``2 PZA X $20.00`` / ``0.850 KG X 32.00``. The quantity and
#: the price of one, however the printer chose to spell it.
_QTY_TIMES_PRICE = re.compile(
    r"(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:kgs?|kilos?|pzas?|pz|piezas?)?\s*[x@]\s*"
    r"(?:\$\s*)?(\d+(?:[.,]\d{1,2}))",
    re.IGNORECASE,
)

#: A line that is *only* a quantity clause. Printers put it under the product
#: name, and on its own it means "the line above was bought this many times".
_QTY_ONLY = re.compile(
    r"^\s*(\d+(?:[.,]\d+)?)\s*(?:kgs?|kilos?|pzas?|pz|piezas?)?\s*[x@]\s*"
    r"(?:\$\s*)?(\d+(?:[.,]\d{1,2}))\s*[a-z]?\s*$",
    re.IGNORECASE,
)

#: A leading store code: the barcode or PLU printed before the name.
_LEADING_CODE = re.compile(r"^\s*\d{4,}\s+")

#: A short label followed by a long number: ``AUT 004512``, ``TDA 0451``. The
#: ticket's own bookkeeping, and indistinguishable from a product line by the
#: only rule this reader has (it ends in money). Matched narrowly — four digits
#: minimum — so that a genuine ``PAN 15.00`` or ``SAL 12.00`` survives.
_CODEISH = re.compile(r"^[a-z]{1,5}\.?\s*[\d\s]{4,}$", re.IGNORECASE)

_DATE_PATTERNS = (
    (re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"), ("y", "m", "d")),
    (re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b"), ("d", "m", "y")),
    (re.compile(r"\b(\d{1,2})-(\d{1,2})-(\d{4})\b"), ("d", "m", "y")),
    (re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{2})\b"), ("d", "m", "y")),
)

#: Words that mean "this line is the ticket talking about itself". A line
#: carrying any of them is never a product, however much it looks like one.
_NOT_A_PRODUCT = (
    "subtotal",
    "total",
    "importe",
    "iva",
    "ieps",
    "impuesto",
    "efectivo",
    "cambio",
    "tarjeta",
    "credito",
    "debito",
    "vales",
    "propina",
    "descuento",
    "ahorro",
    "ahorraste",
    "monedero",
    "puntos",
    "saldo",
    "folio",
    "ticket",
    "caja",
    "cajero",
    "cajera",
    "atendio",
    "gracias",
    "vuelva",
    "rfc",
    "factura",
    "cfdi",
    "comprobante",
    "cliente",
    "sucursal",
    "suc ",
    "tel ",
    "telefono",
    "direccion",
    "www",
    "http",
    "articulos",
    "piezas totales",
    "no de art",
    "num art",
    "autorizacion",
    "terminal",
    "operacion",
    "referencia",
    "aprobada",
    "banco",
    "sat ",
    "regimen",
    "serie",
)

#: The word that names the amount the user actually paid. ``subtotal`` and
#: "total de articulos" are excluded because both are true and neither is it.
_TOTAL_LINE = re.compile(r"(?<!sub)\btotal\b")
_TOTAL_EXCLUDE = ("articulo", "pieza", "unidad", "item", "descuento", "ahorro")


def read_receipt(lines: list[str]) -> ParsedReceipt:
    """Structure OCR lines into a store, a date, a total and line items."""
    clean = [_clean(line) for line in lines]
    folded = [line.lower() for line in clean]
    store = _detect_store(folded)
    purchased_at = _detect_date(folded)
    total = _detect_total(folded)
    items = _detect_items(clean, folded)
    return ParsedReceipt(
        store=store, purchased_at=purchased_at, total=total, items=items
    )


# --- the pieces ----------------------------------------------------------
def _detect_store(folded: list[str]) -> str | None:
    """The chain name if we know it, else the first line that reads like one.

    Chains are checked over the *whole* ticket, not just the header: OCR
    frequently mangles a stylised logo at the top while the same name prints
    cleanly in the footer's fiscal block.
    """
    for line in folded:
        for chain in _CHAINS:
            if chain in line:
                return chain.title()
    for line in folded[:6]:
        letters = sum(c.isalpha() for c in line)
        if letters >= 4 and not _TRAILING_AMOUNT.search(line):
            return line.title()
    return None


def _detect_date(folded: list[str]) -> date | None:
    """The first date on the ticket, read day-first.

    Day-first because this is Mexico and every printer here spells
    ``dd/mm/aaaa``; the ISO pattern is matched separately and unambiguously.
    An impossible date (OCR read ``13/45/2026``) is skipped rather than
    clamped — a wrong purchase date silently misfiles a price in history.
    """
    for line in folded:
        for pattern, order in _DATE_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue
            parts = dict(zip(order, (int(g) for g in match.groups())))
            year = parts["y"]
            if year < 100:
                year += 2000
            try:
                return date(year, parts["m"], parts["d"])
            except ValueError:
                continue
    return None


def _detect_total(folded: list[str]) -> Decimal | None:
    """The last honest ``TOTAL`` line on the ticket.

    Last rather than largest: a ticket prints ``TOTAL`` once for the basket and
    then the tender lines (``EFECTIVO 500.00``) which can be bigger, and it
    prints the fiscal total again at the bottom, which is the same number.
    """
    found: Decimal | None = None
    for line in folded:
        if not _TOTAL_LINE.search(line):
            continue
        if any(word in line for word in _TOTAL_EXCLUDE):
            continue
        amount = _trailing_amount(line)
        if amount is not None:
            found = amount
    return found


def _detect_items(clean: list[str], folded: list[str]) -> list[ParsedReceiptItem]:
    """Every line that ends in money and is not the ticket talking about itself.

    Two printer habits are handled beyond the obvious one-line-per-product:

    * ``COCA COLA 600ML`` / ``2 X 20.00  40.00`` — the name on one line and the
      arithmetic on the next. The price line has no words of its own, so it
      adopts the line above it.
    * ``PAN BIMBO 45.90`` / ``2 X 22.95`` — the arithmetic *after* a complete
      item line, which refines the item rather than adding one.
    """
    items: list[ParsedReceiptItem] = []
    #: The last line that read like a product name but carried no price. Only
    #: the immediately preceding line is ever adopted: a name and its price are
    #: adjacent on every printer, and reaching further back would let a
    #: header line ("SUCURSAL MIXCOAC") name somebody's groceries.
    pending: tuple[int, str] | None = None

    for index, (raw, line) in enumerate(zip(clean, folded)):
        if not line:
            pending = None
            continue

        noise = any(word in line for word in _NOT_A_PRODUCT)
        amount = None if noise else _trailing_amount(line)

        # A bare quantity clause after a finished item refines it in place.
        if amount is None and items and _QTY_ONLY.match(line):
            qty_only = _QTY_ONLY.match(line)
            items[-1] = _refine(items[-1], raw, qty_only)
            pending = None
            continue

        if amount is None or amount <= 0:
            has_words = sum(c.isalpha() for c in raw) >= 3
            pending = (index, raw) if has_words and not noise else None
            continue

        rest = _TRAILING_AMOUNT.sub("", raw).strip()
        quantity: Decimal | None = None
        unit_price: Decimal | None = None
        inline = _QTY_TIMES_PRICE.search(rest)
        if inline:
            quantity = _decimal(inline.group(1))
            unit_price = _decimal(inline.group(2))
            rest = (rest[: inline.start()] + " " + rest[inline.end() :]).strip()

        description = _LEADING_CODE.sub("", rest).strip(" .-\u00b7")
        line_no = index
        raw_text = raw

        # No words left: this line is the arithmetic for the name above it.
        if not any(c.isalpha() for c in description):
            if pending is None or pending[0] != index - 1:
                # ...and there is no name above it. A row of numbers ending in
                # money is a fiscal code as often as it is a product; dropped.
                pending = None
                continue
            line_no, name = pending
            description = _LEADING_CODE.sub("", name).strip(" .-\u00b7")
            raw_text = f"{name} \u00b7 {raw}"

        if _CODEISH.match(description):
            pending = None
            continue
        if quantity is not None and quantity <= 0:
            quantity = None

        items.append(
            ParsedReceiptItem(
                line_no=line_no,
                raw_text=raw_text,
                description=description,
                amount=amount,
                quantity=quantity,
                unit_price=unit_price,
            )
        )
        pending = None
    return items


def _refine(
    item: ParsedReceiptItem, raw: str, qty_only: re.Match
) -> ParsedReceiptItem:
    """Fold a trailing ``2 X 20.00`` line into the item it describes."""
    quantity = _decimal(qty_only.group(1))
    unit_price = _decimal(qty_only.group(2))
    return ParsedReceiptItem(
        line_no=item.line_no,
        raw_text=f"{item.raw_text} \u00b7 {raw}",
        description=item.description,
        amount=item.amount,
        quantity=quantity if quantity and quantity > 0 else item.quantity,
        unit_price=unit_price or item.unit_price,
    )


def _trailing_amount(line: str) -> Decimal | None:
    match = _TRAILING_AMOUNT.search(line)
    return _decimal(match.group(1)) if match else None


def _decimal(raw: str) -> Decimal | None:
    """Parse a printed amount. ``1,234.56`` and ``28,50`` both occur.

    A comma is a thousands separator when a dot is also present, and a decimal
    separator when it is not — the only reading under which both spellings
    above mean what a human sees.
    """
    text = raw.strip()
    if "." in text:
        text = text.replace(",", "")
    else:
        text = text.replace(",", ".")
    try:
        return Decimal(text)
    except InvalidOperation:
        return None
