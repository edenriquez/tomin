from typing import List, Dict
from uuid import UUID
from dataclasses import dataclass
from datetime import datetime
from ...domain.repositories.interfaces import ProcessedFileRepository

@dataclass
class FileDTO:
    id: str
    name: str
    uploadDate: str
    period: str

@dataclass
class AccountDTO:
    id: str
    name: str
    type: str # 'Débito' | 'Crédito'
    lastSync: str
    icon: str
    files: List[FileDTO]

class GetStatements:
    def __init__(self, file_repo: ProcessedFileRepository):
        self.file_repo = file_repo

    def execute(self, user_id: UUID) -> List[AccountDTO]:
        files = self.file_repo.get_all_by_user(user_id)
        
        # Group by Bank + Account Type
        accounts: Dict[str, AccountDTO] = {}
        
        for f in files:
            # We use a combined key for Bank + Type
            key = f"{f.bank_name}_{f.account_type}"
            if key not in accounts:
                accounts[key] = AccountDTO(
                    id=key,
                    name=f"{f.bank_name} {f.account_type.capitalize() if f.account_type else 'Cuenta'}",
                    type='Crédito' if f.account_type == 'credit' else 'Débito',
                    lastSync=f.created_at.strftime("%d %b %Y, %H:%M"),
                    icon='credit_card' if f.account_type == 'credit' else 'savings',
                    files=[]
                )
            
            # Use the stored file_name or fallback to a generated one
            file_name = f.file_name or f"Estado_{f.bank_name}_{f.created_at.strftime('%b%y')}.pdf"
            accounts[key].files.append(FileDTO(
                id=f.hash,
                name=file_name,
                uploadDate=f.created_at.strftime("%d %b %Y"),
                period=f.created_at.strftime("%b %Y")
            ))
            
        return list(accounts.values())

class DeleteStatement:
    def __init__(self, file_repo: ProcessedFileRepository):
        self.file_repo = file_repo

    def execute(self, user_id: UUID, file_id: str) -> bool:
        return self.file_repo.delete_by_id(user_id, file_id)

class GetFilesCount:
    def __init__(self, file_repo: ProcessedFileRepository):
        self.file_repo = file_repo

    def execute(self, user_id: UUID) -> int:
        return self.file_repo.count_by_user(user_id)
