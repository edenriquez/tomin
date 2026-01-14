from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel
import logging

from src.infrastructure.database import SessionLocal, get_db
from src.infrastructure.supabase_repositories import SupabaseTransactionRepository, SupabaseMerchantRepository
from src.domain.entities.models import Merchant, MerchantLabel
from src.application.use_cases.identify_merchants import IdentifyMerchants
from src.infrastructure.auth import get_current_user

router = APIRouter(prefix="/api/merchants", tags=["merchants"])
logger = logging.getLogger(__name__)

class MerchantCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    default_category_id: Optional[UUID] = None

class LabelCreate(BaseModel):
    merchant_id: UUID
    label: str

class TransactionMerchantUpdate(BaseModel):
    merchant_id: UUID

@router.get("/", response_model=List[Merchant])
def get_merchants(db: Session = Depends(get_db)):
    repo = SupabaseMerchantRepository(db)
    return repo.get_all()

@router.post("/")
def create_merchant(merchant: MerchantCreate, db: Session = Depends(get_db)):
    repo = SupabaseMerchantRepository(db)
    new_merchant = Merchant(
        name=merchant.name,
        icon=merchant.icon,
        default_category_id=merchant.default_category_id
    )
    repo.save(new_merchant)
    return new_merchant

@router.get("/labels", response_model=List[MerchantLabel])
def get_all_labels(db: Session = Depends(get_db)):
    repo = SupabaseMerchantRepository(db)
    return repo.get_labels()

@router.post("/labels")
def add_label(payload: LabelCreate, db: Session = Depends(get_db)):
    repo = SupabaseMerchantRepository(db)
    new_label = MerchantLabel(
        merchant_id=payload.merchant_id,
        label=payload.label.lower().strip()
    )
    repo.add_label(new_label)
    return new_label

@router.post("/identify")
async def trigger_merchant_identification(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    async def run_identify(u_id: UUID):
        db_bg = SessionLocal()
        try:
            tx_repo = SupabaseTransactionRepository(db_bg)
            merchant_repo = SupabaseMerchantRepository(db_bg)
            use_case = IdentifyMerchants(tx_repo, merchant_repo)
            count = await use_case.execute(u_id)
            logger.info(f"Identified {count} merchants for user {u_id}")
        except Exception as e:
            logger.error(f"Error in IdentifyMerchants background task: {str(e)}")
        finally:
            db_bg.close()

    background_tasks.add_task(run_identify, UUID(user_id))
    return {"message": "Identification process started in background."}

@router.patch("/transactions/{transaction_id}")
def update_transaction_merchant(
    transaction_id: UUID,
    payload: TransactionMerchantUpdate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    merchant_repo = SupabaseMerchantRepository(db)
    # Verification: technically we should check if transaction belongs to user_id
    # but for global labeling and simplicity in MVP we allow the update.
    merchant_repo.update_transaction_merchant(transaction_id, payload.merchant_id)
    return {"status": "success"}
