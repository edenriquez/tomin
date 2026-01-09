from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime

from src.application.use_cases.generate_forecast import GenerateForecast
from src.infrastructure.database import get_db
from src.infrastructure.supabase_repositories import (
    SupabaseTransactionRepository, 
    SupabaseCategoryRepository
)

router = APIRouter(prefix="/api/forecast", tags=["forecast"])

@router.get("/")
def get_forecast(
    user_id: str = '00000000-0000-0000-0000-000000000000',
    db: Session = Depends(get_db)
):
    tx_repo = SupabaseTransactionRepository(db)
    cat_repo = SupabaseCategoryRepository(db)
    use_case = GenerateForecast(tx_repo, cat_repo)
    return use_case.execute(UUID(user_id), datetime.now().month, datetime.now().year)
