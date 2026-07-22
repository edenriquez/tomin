from __future__ import annotations

import statistics
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from ..entities.transaction import Transaction
from ..value_objects.enums import TxType
from .categorization import normalize


@dataclass(frozen=True)
class RecurringGroup:
    label: str
    occurrences: int
    average_amount: Decimal
    average_interval_days: float
    frequency: str  # weekly | biweekly | monthly | irregular
    last_date: date


class RecurrenceService:
    """Detects recurring expenses (subscriptions, fixed bills).

    Groups expense transactions by normalized description, then inspects the
    cadence of their dates to classify a frequency.
    """

    def __init__(self, min_occurrences: int = 2) -> None:
        self._min_occurrences = min_occurrences

    def detect(self, transactions: list[Transaction]) -> list[RecurringGroup]:
        groups: dict[str, list[Transaction]] = {}
        for tx in transactions:
            if tx.tx_type != TxType.EXPENSE:
                continue
            key = normalize(tx.description or tx.raw_description)
            if not key:
                continue
            groups.setdefault(key, []).append(tx)

        results: list[RecurringGroup] = []
        for key, txs in groups.items():
            if len(txs) < self._min_occurrences:
                continue
            txs.sort(key=lambda t: t.tx_date)
            intervals = [
                (txs[i].tx_date - txs[i - 1].tx_date).days for i in range(1, len(txs))
            ]
            avg_interval = statistics.mean(intervals) if intervals else 0.0
            avg_amount = Decimal(
                str(statistics.mean(abs(float(t.amount)) for t in txs))
            ).quantize(Decimal("0.01"))
            results.append(
                RecurringGroup(
                    label=key,
                    occurrences=len(txs),
                    average_amount=avg_amount,
                    average_interval_days=avg_interval,
                    frequency=self._classify_frequency(avg_interval),
                    last_date=txs[-1].tx_date,
                )
            )
        results.sort(key=lambda g: g.average_amount, reverse=True)
        return results

    @staticmethod
    def _classify_frequency(days: float) -> str:
        if days == 0:
            return "irregular"
        if days <= 10:
            return "weekly"
        if days <= 20:
            return "biweekly"
        if days <= 40:
            return "monthly"
        return "irregular"
