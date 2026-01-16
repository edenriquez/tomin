from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timedelta
import logging
from src.application.use_cases.get_recurring_transactions import GetRecurringTransactions
from src.application.use_cases.get_spending_distribution import GetSpendingDistribution
from src.application.use_cases.get_financial_summary import GetFinancialSummary
from src.application.use_cases.process_bank_statement import ProcessBankStatement
from src.infrastructure.database import SessionLocal, get_db
from src.infrastructure.supabase_repositories import (
    SupabaseTransactionRepository, 
    SupabaseCategoryRepository, 
    SupabaseProcessedFileRepository,
    SupabaseSavingsMovementRepository,
    SupabaseMerchantRepository
)
from src.infrastructure.notifications import notification_manager
from src.infrastructure.auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["transactions"])
logger = logging.getLogger(__name__)

@router.get("/")
def get_transactions(
    limit: int = 10,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_repo = SupabaseTransactionRepository(db)
    return tx_repo.get_all(UUID(user_id), limit=limit)

@router.get("/recurring")
def get_recurring_transactions(
    month: int = None,
    year: int = None,
    period: str = None,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):    
    tx_repo = SupabaseTransactionRepository(db)
    use_case = GetRecurringTransactions(tx_repo)
    return use_case.execute(UUID(user_id), month, year, period)


@router.get("/spending-distribution")
def get_distribution(
    period: str = None,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_repo = SupabaseTransactionRepository(db)
    cat_repo = SupabaseCategoryRepository(db)
    use_case = GetSpendingDistribution(tx_repo, cat_repo)
    return use_case.execute(UUID(user_id), period=period)

@router.get("/summary")
def get_summary(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_repo = SupabaseTransactionRepository(db)
    savings_repo = SupabaseSavingsMovementRepository(db)
    use_case = GetFinancialSummary(tx_repo, savings_repo)
    return use_case.execute(UUID(user_id))

@router.post("/upload-bank-statement")
async def upload_bank_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx_repo = SupabaseTransactionRepository(db)
    cat_repo = SupabaseCategoryRepository(db)
    file_repo = SupabaseProcessedFileRepository(db)
    savings_repo = SupabaseSavingsMovementRepository(db)
    
    # Read file content safely
    file_content = await file.read()
    
    async def run_process_use_case(u_id: UUID, content: bytes):
        db_bg = SessionLocal()
        try:
            tx_repo_bg = SupabaseTransactionRepository(db_bg)
            cat_repo_bg = SupabaseCategoryRepository(db_bg)
            file_repo_bg = SupabaseProcessedFileRepository(db_bg)
            savings_repo_bg = SupabaseSavingsMovementRepository(db_bg)
            merchant_repo_bg = SupabaseMerchantRepository(db_bg)
            use_case_bg = ProcessBankStatement(
                tx_repo_bg, 
                cat_repo_bg, 
                file_repo_bg, 
                savings_repo_bg, 
                merchant_repo_bg,
                notification_manager
            )
            await use_case_bg.execute(u_id, content)
        finally:
            db_bg.close()

    background_tasks.add_task(run_process_use_case, UUID(user_id), file_content)
    
    return {
        "message": "Bank statement upload received and processing started.",
        "filename": file.filename,
        "status": "processing"
    }
