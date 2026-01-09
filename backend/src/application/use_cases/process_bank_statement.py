import asyncio
from uuid import UUID
import logging
import hashlib
import io
from pypdf import PdfReader
from ...domain.entities.models import ProcessedFile
from ...infrastructure.parsers.factory import BankParserFactory

logger = logging.getLogger(__name__)

class ProcessBankStatement:
    def __init__(self, tx_repo, cat_repo, file_repo, savings_repo, notification_manager=None):
        self.tx_repo = tx_repo
        self.cat_repo = cat_repo
        self.file_repo = file_repo
        self.savings_repo = savings_repo
        self.notification_manager = notification_manager
        self.parser_factory = BankParserFactory()

    async def execute(self, user_id: UUID, file_content: bytes):
        """
        Processes a bank statement PDF:
        1. Extracts text
        2. Detects duplicates (via hash of text)
        3. Identifies Bank
        4. Parses transactions (Manual rules or LLM fallback)
        """
        logger.info(f"Starting processing of bank statement for user {user_id}")
        
        try:
            # 1. Extract Text
            text = self._extract_text(file_content)
            
            # 2. Check for Duplicates
            file_hash = hashlib.sha256(text.encode()).hexdigest()
            # if self.file_repo.exists(user_id, file_hash):
            #     logger.warning(f"Duplicate file detected for user {user_id}")
            #     await self._notify(user_id, "UPLOAD_ERROR", "Este archivo ya ha sido procesado anteriormente.")
            #     return False

            # 3. Identify Bank & Parse
            logger.info(f"textttt {text}") 
            parser = self.parser_factory.get_parser(text)
            logger.info(f"Identified bank: {parser.bank_name}")
            
            parsed_data = parser.parse(text, user_id)
            
            # 4. Save Record
            self.file_repo.save(ProcessedFile(
                user_id=user_id,
                hash=file_hash,
                bank_name=parser.bank_name
            ))
            
            # Associate transactions and savings with the file
            for tx in parsed_data.transactions:
                tx.file_id = file_hash
            
            for sm in parsed_data.savings_movements:
                sm.file_id = file_hash
            
            # 5. Save Data
            if parsed_data.transactions:
                self.tx_repo.save_all(parsed_data.transactions)
            
            if parsed_data.savings_movements:
                self.savings_repo.save_all(parsed_data.savings_movements)

            # 6. Notify Success
            await self._notify(user_id, "UPLOAD_COMPLETE", f"Estado de cuenta de {parser.bank_name} procesado exitosamente.")
            return True

        except Exception as e:
            logger.error(f"Error processing bank statement: {str(e)}")
            await self._notify(user_id, "UPLOAD_ERROR", "Hubo un error al procesar el PDF.")
            return False

    def _extract_text(self, file_content: bytes) -> str:
        pdf_file = io.BytesIO(file_content)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()

    async def _notify(self, user_id: UUID, type: str, message: str):
        if self.notification_manager:
            await self.notification_manager.notify_user(
                str(user_id), 
                {
                    "type": type,
                    "status": "success" if "COMPLETE" in type else "error",
                    "message": message
                }
            )
