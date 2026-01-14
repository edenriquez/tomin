import pytest
from uuid import uuid4
from datetime import datetime
from src.domain.entities.models import Transaction
from src.application.use_cases.detect_recurring_transactions import (
    DetectRecurringTransactions,
    normalize_merchant
)

@pytest.fixture
def anyio_backend():
    return 'asyncio'

class MockTransactionRepo:
    def __init__(self, transactions):
        self.transactions = transactions
        self.updated_ids = []
        self.updated_status = None

    def get_by_user(self, user_id, start_date, end_date):
        return self.transactions

    def update_recurrent_status(self, transaction_ids, is_recurrent):
        self.updated_ids = transaction_ids
        self.updated_status = is_recurrent

@pytest.mark.anyio
async def test_detect_netflix_recurring():
    user_id = uuid4()
    # Netflix occurrences from mock data
    tx1 = Transaction(
        id=uuid4(),
        amount=249.0,
        description="NETFLIX NME 110513PI3MX",
        date=datetime(2025, 10, 25),
        user_id=user_id,
        merchant_name="Banamex" # In the CSV it says Banamex as merchant_name but description has NETFLIX
    )
    tx2 = Transaction(
        id=uuid4(),
        amount=249.0,
        description="NETFLIX NME 110513PI3MX",
        date=datetime(2025, 11, 25),
        user_id=user_id,
        merchant_name="Banamex"
    )
    
    # Add a third occurrence to increase confidence if needed, 
    # though rule 5 was changed to 2 occurrences.
    tx3 = Transaction(
        id=uuid4(),
        amount=249.0,
        description="NETFLIX *1234", # Different description to test normalization
        date=datetime(2025, 12, 25),
        user_id=user_id,
        merchant_name=None
    )

    repo = MockTransactionRepo([tx1, tx2, tx3])
    use_case = DetectRecurringTransactions(repo)
    
    result_count = await use_case.execute(user_id, "some_file_hash")
    
    # Normalization should turn "NETFLIX NME 110513PI3MX" and "NETFLIX *1234" into "netflix"
    # Intervals are 31 days and 30 days -> Monthly
    # Confidence should be high
    
    assert result_count >= 2
    assert any(tx_id == tx1.id for tx_id in repo.updated_ids)
    assert any(tx_id == tx2.id for tx_id in repo.updated_ids)
    
@pytest.mark.anyio
async def test_normalization_removes_dates_and_ids():
    assert normalize_merchant("NETFLIX.COM 01/24") == "netflix com"
    assert normalize_merchant("Netflix *1234") == "netflix"
    assert normalize_merchant("PAGO TARJETA NETFLIX") == "netflix"

@pytest.mark.anyio
async def test_amount_similarity_bucket():
    user_id = uuid4()
    # Subscriptions with slight variations
    tx1 = Transaction(id=uuid4(), amount=199.0, description="Spotify", date=datetime(2023, 1, 1), user_id=user_id)
    tx2 = Transaction(id=uuid4(), amount=205.0, description="Spotify", date=datetime(2023, 2, 1), user_id=user_id)
    tx3 = Transaction(id=uuid4(), amount=195.0, description="Spotify", date=datetime(2023, 3, 1), user_id=user_id)
    
    repo = MockTransactionRepo([tx1, tx2, tx3])
    use_case = DetectRecurringTransactions(repo)
    
    count = await use_case.execute(user_id, "hash")
    assert count == 3
