from __future__ import annotations

from enum import Enum


class TxType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


class SourceType(str, Enum):
    BANK_PDF = "bank_pdf"
    SAT_XML = "sat_xml"


class StatementStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class AccountKind(str, Enum):
    """What kind of account a statement describes.

    User-declared, never inferred: the parsers cannot reliably tell a credit
    card statement from a debit one across banks, and a wrong guess would
    poison every metric that later branches on it (credit-card "expenses"
    include payments *to* the card). ``None`` on the entity means "the user
    hasn't said" — an honest unknown, not a default.
    """

    DEBIT = "debit"
    CREDIT = "credit"
    SAVINGS = "savings"
    INVESTMENT = "investment"
    PAYROLL = "payroll"


class TransactionStatus(str, Enum):
    COMPLETED = "completed"
    PENDING = "pending"
