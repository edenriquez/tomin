from datetime import date
from decimal import Decimal
from uuid import uuid4

from tomin.domain.entities import Transaction
from tomin.domain.services.recurrence import RecurrenceService
from tomin.domain.value_objects.enums import TxType


def _tx(day: date, desc: str, amount: str):
    return Transaction(
        user_id=uuid4(),
        tx_date=day,
        amount=Decimal(amount),
        raw_description=desc,
        tx_type=TxType.EXPENSE,
    )


def test_detects_monthly_subscription():
    txs = [
        _tx(date(2024, 1, 5), "Netflix", "299"),
        _tx(date(2024, 2, 5), "Netflix", "299"),
        _tx(date(2024, 3, 5), "Netflix", "299"),
        _tx(date(2024, 1, 9), "One off store", "50"),
    ]
    groups = RecurrenceService().detect(txs)
    labels = {g.label: g for g in groups}
    assert "netflix" in labels
    assert labels["netflix"].frequency == "monthly"
    assert labels["netflix"].occurrences == 3
    assert labels["netflix"].average_amount == Decimal("299.00")
    assert "one off store" not in labels  # single occurrence filtered out


def test_income_is_ignored():
    txs = [
        Transaction(user_id=uuid4(), tx_date=date(2024, 1, 1), amount=Decimal("1000"),
                    raw_description="Nomina", tx_type=TxType.INCOME),
        Transaction(user_id=uuid4(), tx_date=date(2024, 2, 1), amount=Decimal("1000"),
                    raw_description="Nomina", tx_type=TxType.INCOME),
    ]
    assert RecurrenceService().detect(txs) == []
