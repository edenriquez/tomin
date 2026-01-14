from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional, List

@dataclass
class Merchant:
    name: str
    id: UUID = field(default_factory=uuid4)
    icon: Optional[str] = None
    default_category_id: Optional[UUID] = None
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class MerchantLabel:
    merchant_id: UUID
    label: str # The normalized pattern to match
    id: UUID = field(default_factory=uuid4)
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class Transaction:
    amount: float
    description: str
    date: datetime
    user_id: UUID
    id: UUID = field(default_factory=uuid4)
    category_id: Optional[UUID] = None
    merchant_id: Optional[UUID] = None # Link to the verified Merchant entity
    merchant_name: Optional[str] = None # The human-readable name (either from Merchant or manual)
    is_recurrent: bool = False
    file_id: Optional[str] = None
    metadata: dict = field(default_factory=dict)

@dataclass
class SavingsMovement:
    amount: float
    description: str
    date: datetime
    user_id: UUID
    type: str # 'withdrawal' or 'deposit'
    goal_name: Optional[str] = None # e.g. "Mi Primera Cajita"
    file_id: Optional[str] = None
    id: UUID = field(default_factory=uuid4)
    metadata: dict = field(default_factory=dict)

@dataclass
class ParsedStatement:
    transactions: List[Transaction] = field(default_factory=list)
    savings_movements: List[SavingsMovement] = field(default_factory=list)

@dataclass
class Category:
    name: str
    color: str # Hex code for UI representation
    icon: str # Icon identifier (e.g. 'home', 'shopping-cart')
    id: UUID = field(default_factory=uuid4)
    parent_category_id: Optional[UUID] = None # For hierarchy if needed
    categorization_labels: List[str] = field(default_factory=list)

@dataclass
class ForecastAdjustment:
    category_id: UUID
    new_budget: float
    reason: str

@dataclass
class Forecast:
    user_id: UUID
    month: int
    year: int
    id: UUID = field(default_factory=uuid4)
    adjustments: List[ForecastAdjustment] = field(default_factory=list)
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class User:
    email: str
    full_name: str
    id: UUID = field(default_factory=uuid4)
    currency: str = "MXN"
    savings_goal: float = 0.0

@dataclass
class ProcessedFile:
    user_id: UUID
    hash: str # SHA-256 of extracted text, used as ID
    bank_name: str
    created_at: datetime = field(default_factory=datetime.now)
    id: Optional[UUID] = None # Deprecated in favor of hash if used as ID

@dataclass
class RecurringBill:
    merchant_name: str
    avg_amount: float
    last_amount: float
    total_period_amount: float
    frequency: str
    occurrences_in_period: int
    next_expected_date: Optional[datetime]
    transactions: List[Transaction]
    status: str = "active" # active, potential_churn, cancelled
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
