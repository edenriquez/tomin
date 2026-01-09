from .base import BankParser
from ...domain.entities.models import Transaction, ParsedStatement, SavingsMovement
from uuid import UUID
from datetime import datetime
import re
import logging
logger = logging.getLogger(__name__)

NUBANK_MERCHANT_NAME = "NuBank"
BBVA_MERCHANT_NAME = "BBVA"
BANAMEX_MERCHANT_NAME = "Banamex"
SANTANDER_MERCHANT_NAME = "Santander"

class BanamexParser(BankParser):
    @property
    def bank_name(self) -> str:
        return BANAMEX_MERCHANT_NAME

    def can_parse(self, text: str) -> bool:
        # Detection points for Banamex
        signatures = [
            "BANAMEX",
            "Tarjetas Banamex",
            "GRUPO FINANCIERO BANAMEX",
            "www.banamex.com"
        ]
        return any(sig.upper() in text.upper() for sig in signatures)

    def parse(self, text: str, user_id: UUID) -> ParsedStatement:
        transactions = []
        month_map = {
            'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
        }
        
        # Regex to match Banamex transactions
        pattern = r"(\d{1,2})-([a-z]{3})-(\d{4})\s+\d{1,2}-[a-z]{3}-\d{4}\s+(.*?)\s+([+-])\s+\$([\d,]+\.\d{2})"
        
        matches = re.finditer(pattern, text, re.IGNORECASE)
        
        for match in matches:
            day, month_str, year = match.group(1), match.group(2).lower(), match.group(3)
            description = match.group(4).strip()
            sign = match.group(5)
            amount_str = match.group(6).replace(',', '')
            
            month = month_map.get(month_str, 1)
            date_obj = datetime(int(year), month, int(day))
            amount = float(amount_str)
            
            if sign == '-':
                amount = -amount
                
            transactions.append(Transaction(
                amount=amount,
                description=description,
                date=date_obj,
                user_id=user_id,
                merchant_name=BANAMEX_MERCHANT_NAME
            ))
            
        return ParsedStatement(transactions=transactions)

class BBVAParser(BankParser):
    @property
    def bank_name(self) -> str:
        return BBVA_MERCHANT_NAME

    def can_parse(self, text: str) -> bool:
        # Detection points for BBVA
        return "BBVA" in text.upper() or "BANCOMER" in text.upper()

    def parse(self, text: str, user_id: UUID) -> ParsedStatement:
        # Placeholder for specific BBVA logic
        logger.info(f"BBVAParser statement text: {text}")
        return ParsedStatement()

class SantanderParser(BankParser):
    @property
    def bank_name(self) -> str:
        return SANTANDER_MERCHANT_NAME

    def can_parse(self, text: str) -> bool:
        # Detection points for Santander
        return "SANTANDER" in text.upper()

    def parse(self, text: str, user_id: UUID) -> ParsedStatement:
        # Placeholder for specific Santander logic
        logger.info(f"SantanderParser statement text: {text}")
        return ParsedStatement()

class NuParser(BankParser):
    @property
    def bank_name(self) -> str:
        return NUBANK_MERCHANT_NAME

    def can_parse(self, text: str) -> bool:
        # Detection points for Nu
        signatures = [
            "Cuenta Nu:",
            "Nu México Financiera",
            "ayuda@nu.com.mx",
            "Detalle de movimientos en tu cuenta",
            "Cajitas"
        ]
        return any(sig.upper() in text.upper() for sig in signatures)

    def parse(self, text: str, user_id: UUID) -> ParsedStatement:
    # def parse(self, text: str, user_id: UUID, categories: List[Category]) -> ParsedStatement:
        # TODO: Implement categorization
        # strategy:
        # Categories will match the description of the transaction
        # If the description matches a category, the category will be assigned to the transaction
        # If the description does not match any category, the transaction will be assigned to the default category
        # default category will be unknown 
        # later in the flow the user will be able to categorize the transactions using PATCH /transaction/{transaction_id}/category/{category_id}
        # only the admin will be able to create new categories using POST /category
        # only the admin will be able to delete categories using DELETE /category/{category_id}
        # categories will have a GET /categories/{category_id}/categorization-labels
        # categorization-labels will have a POST /categories/{category_id}/categorization-labels which will accept a array of strings which will be used to match the description of the transaction
        # this will be stored in the database and used to match the description of the transaction
        
        transactions = []
        savings_movements = []
        month_map = {
            'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
        }
        
        # Regex for Nu transactions
        pattern = r"(\d{1,2})\s+([A-Z]{3})\s+(\d{4})\s+(.*?)\s+([+-])\$([\d,]+\.\d{2})"
        
        matches = re.finditer(pattern, text)
        
        for match in matches:
            day, month_str, year = match.group(1), match.group(2).upper(), match.group(3)
            description = match.group(4).strip()
            sign = match.group(5)
            amount_str = match.group(6).replace(',', '')
                
            month = month_map.get(month_str, 1)
            date_obj = datetime(int(year), month, int(day))
            amount = float(amount_str)
            
            if sign == '-':
                amount = -amount

            # Differentiate Savings vs Transactions
            if "Cajita" in description:
                savings_movements.append(SavingsMovement(
                    amount=amount,
                    description=description,
                    date=date_obj,
                    user_id=user_id,
                    type="deposit" if sign == '+' else "withdrawal",
                    goal_name=description.split(":")[-1].strip() if ":" in description else "Cajita"
                ))
            else:
                transactions.append(Transaction(
                    amount=amount,
                    description=description,
                    date=date_obj,
                    user_id=user_id,
                    merchant_name=NUBANK_MERCHANT_NAME
                ))
            
        return ParsedStatement(transactions=transactions, savings_movements=savings_movements)

class GenericBankParser(BankParser):
    @property
    def bank_name(self) -> str:
        return "Generic / LLM"

    def can_parse(self, text: str) -> bool:
        return True # Fallback

    def parse(self, text: str, user_id: UUID) -> ParsedStatement:
        # This is where LLM logic would go
        logger.info(f"GenericBankParser statement text: {text}")
        return ParsedStatement()
