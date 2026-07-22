from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal


@dataclass(frozen=True)
class CategorySpend:
    category_id: str | None
    category_name: str
    amount: Decimal
    percentage: float


@dataclass(frozen=True)
class MonthlyPoint:
    month: str  # YYYY-MM
    income: Decimal
    expense: Decimal


@dataclass(frozen=True)
class RecurringItem:
    label: str
    average_amount: Decimal
    frequency: str
    occurrences: int


@dataclass(frozen=True)
class SpendingSummary:
    total_income: Decimal
    total_expense: Decimal
    top_category: str | None
    by_category: list[CategorySpend] = field(default_factory=list)
    monthly: list[MonthlyPoint] = field(default_factory=list)
