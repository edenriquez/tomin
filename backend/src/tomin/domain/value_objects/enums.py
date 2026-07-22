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


class TransactionStatus(str, Enum):
    COMPLETED = "completed"
    PENDING = "pending"
