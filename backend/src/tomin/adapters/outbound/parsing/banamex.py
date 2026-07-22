from __future__ import annotations

from .generic_bank import TextStatementParser


class BanamexParser(TextStatementParser):
    """Parser tuned for Citibanamex debit statements.

    Banamex statements are date-prefixed line items; the shared
    :class:`TextStatementParser` logic handles the layout, and this subclass
    tags the resulting statement with the bank name so downstream analytics
    and account linking know its origin.
    """

    template_key = "banamex"
    bank = "Banamex"
