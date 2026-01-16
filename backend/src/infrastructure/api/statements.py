from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from ...application.use_cases.get_statements import GetStatements, GetFilesCount, DeleteStatement
from ..database import get_db
from ..supabase_repositories import SupabaseProcessedFileRepository
from ..auth import get_current_user

router = APIRouter(prefix="/api/statements", tags=["statements"])

@router.get("/")
def get_statements(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_repo = SupabaseProcessedFileRepository(db)
    use_case = GetStatements(file_repo)
    return use_case.execute(UUID(user_id))

@router.get("/count")
def get_statements_count(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_repo = SupabaseProcessedFileRepository(db)
    use_case = GetFilesCount(file_repo)
    return {"count": use_case.execute(UUID(user_id))}

@router.delete("/{file_id}")
def delete_statement(
    file_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_repo = SupabaseProcessedFileRepository(db)
    use_case = DeleteStatement(file_repo)
    success = use_case.execute(UUID(user_id), file_id)
    return {"success": success}
