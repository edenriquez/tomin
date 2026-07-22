from __future__ import annotations

import re
from datetime import date
from decimal import Decimal, InvalidOperation

SPANISH_MONTHS = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12,
}

# Matches a leading date like: 05/01/2024, 5-1-24, 05-ENE-24, 05 ENE 2024
_DATE_RE = re.compile(
    r"^\s*(?P<d>\d{1,2})[\s/\-.](?P<m>\d{1,2}|[A-Za-zÁÉÍÓÚáéíóú]{3,})"
    r"(?:[\s/\-.](?P<y>\d{2,4}))?"
)

# Matches money amounts: 1,234.56 / -45.50 / (99.00) / $12.00
_AMOUNT_RE = re.compile(r"[-(]?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?")

_INCOME_HINTS = ("abono", "deposito", "depósito", "spei recibido", "nomina", "nómina")
_EXPENSE_HINTS = ("cargo", "compra", "retiro", "pago", "comision", "comisión")


def parse_amount(token: str) -> Decimal | None:
    raw = token.strip()
    negative = raw.startswith("-") or raw.startswith("(")
    cleaned = raw.replace("$", "").replace(",", "").replace("(", "").replace(")", "")
    cleaned = cleaned.replace(" ", "").lstrip("-")
    try:
        value = Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None
    return -value if negative else value


def parse_date(day: str, month: str, year: str | None, default_year: int) -> date | None:
    try:
        d = int(day)
    except ValueError:
        return None

    month = month.strip().lower()
    if month.isdigit():
        m = int(month)
    else:
        m = SPANISH_MONTHS.get(month[:3])
    if not m or not (1 <= m <= 12):
        return None

    if year:
        y = int(year)
        if y < 100:
            y += 2000
    else:
        y = default_year

    try:
        return date(y, m, d)
    except ValueError:
        return None


def find_leading_date(line: str, default_year: int) -> tuple[date, str] | None:
    """Return (date, remainder-of-line) if the line begins with a date."""
    match = _DATE_RE.match(line)
    if not match:
        return None
    parsed = parse_date(match.group("d"), match.group("m"), match.group("y"), default_year)
    if parsed is None:
        return None
    return parsed, line[match.end():].strip()


def find_amounts(text: str) -> list[Decimal]:
    amounts = []
    for token in _AMOUNT_RE.findall(text):
        value = parse_amount(token)
        if value is not None:
            amounts.append(value)
    return amounts


def infer_tx_type(description: str, amount: Decimal) -> str:
    """Classify a bank line as income or expense.

    Sign alone is unreliable across statement formats, so we key off wording.
    Most line items on a statement are charges, so we default to expense unless
    an explicit income keyword is present.
    """
    lowered = description.lower()
    if any(h in lowered for h in _INCOME_HINTS):
        return "income"
    return "expense"
