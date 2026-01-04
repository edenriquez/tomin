import pytest
from uuid import uuid4
from datetime import datetime
from src.domain.entities.models import Transaction, Category
from src.application.use_cases.get_spending_distribution import GetSpendingDistribution

class MockTransactionRepo:
    def __init__(self, transactions):
        self.transactions = transactions
    def get_by_user(self, user_id, start_date, end_date):
        return self.transactions
    def save(self, tx): pass
    def save_all(self, txs): pass
    def get_recurrent_by_user(self, user_id): return []

class MockCategoryRepo:
    def __init__(self, categories):
        self.categories = categories
    def get_all(self):
        return self.categories
    def get_by_id(self, id): return None

def test_spending_distribution_calculation():
    user_id = uuid4()
    cat_id = uuid4()
    categories = [Category(id=cat_id, name="Comida", color="#FF0000", icon="food")]
    transactions = [
        Transaction(amount=100.0, description="Tacos", date=datetime.now(), category_id=cat_id),
        Transaction(amount=200.0, description="Sushi", date=datetime.now(), category_id=cat_id),
    ]
    
    use_case = GetSpendingDistribution(
        MockTransactionRepo(transactions),
        MockCategoryRepo(categories)
    )
    
    result = use_case.execute(user_id, datetime.now(), datetime.now())
    
    assert len(result) == 1
    assert result[0].category_name == "Comida"
    assert result[0].total_amount == 300.0
    assert result[0].percentage == 100.0
