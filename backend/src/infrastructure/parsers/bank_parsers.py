from .base import BankParser
from ...domain.entities.models import Transaction, ParsedStatement, SavingsMovement, Category
from uuid import UUID
from typing import List
from datetime import datetime
import re
import logging
from ...application.use_cases.detect_recurring_transactions import normalize_merchant
logger = logging.getLogger(__name__)

NUBANK = "NuBank"
BBVA = "BBVA"
BANAMEX = "Banamex"
SANTANDER = "Santander"

class BanamexParser(BankParser):
    @property
    def bank_name(self) -> str:
        return BANAMEX

    def can_parse(self, text: str) -> bool:
        signatures = ["BANAMEX", "Tarjetas Banamex", "GRUPO FINANCIERO BANAMEX", "www.banamex.com"]
        return any(sig.upper() in text.upper() for sig in signatures)

    def _match_category(self, description: str, categorization_map: List, uncategorized_id: UUID) -> UUID:
        desc_upper = description.upper()
        for label, cat_id in categorization_map:
            if label in desc_upper:
                return cat_id
        return uncategorized_id

    def parse(self, text: str, user_id: UUID, categories: List[Category] = []) -> ParsedStatement:
        # Pre-process categorization metadata once
        uncategorized_id = None
        categorization_map = []
        for cat in categories:
            if cat.name == "Sin Categoría":
                uncategorized_id = cat.id
            if cat.categorization_labels:
                for label in cat.categorization_labels:
                    categorization_map.append((label.upper(), cat.id))

        if "DETALLE DE OPERACIONES" in text and ("RETIROS" in text or "DEPOSITOS" in text):
            logger.info("BanamexParser: DEBIT")
            return self._parse_debit(text, user_id, categorization_map, uncategorized_id)
        else:
            logger.info("BanamexParser: CREDIT")
            return self._parse_credit(text, user_id, categorization_map, uncategorized_id)

    def _parse_credit(self, text: str, user_id: UUID, categorization_map: List, uncategorized_id: UUID) -> ParsedStatement:
        transactions = []
        month_map = {'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12}
        pattern = re.compile(r"(\d{1,2})-([a-z]{3})-(\d{4})\s+\d{1,2}-[a-z]{3}-\d{4}\s+(.*?)\s+([+-])\s+\$([\d,]+\.\d{2})", re.IGNORECASE)
        
        for match in pattern.finditer(text):
            day, month_str, year, description, sign, amount_str = match.groups()
            month = month_map.get(month_str.lower(), 1)
            date_obj = datetime(int(year), month, int(day))
            amount = float(amount_str.replace(',', ''))
            if sign == '-': amount = -amount
            
            category_id = self._match_category(description, categorization_map, uncategorized_id)
            transactions.append(Transaction(
                amount=amount, description=description.strip(), date=date_obj,
                user_id=user_id, merchant_name=normalize_merchant(description),
                category_id=category_id
            ))
        return ParsedStatement(transactions=transactions, account_type="credit")

    def _parse_debit(self, text: str, user_id: UUID, categorization_map: List, uncategorized_id: UUID) -> ParsedStatement:
        """
        New implementation of the Banamex Debit Parser.
        Uses a state-machine to handle multi-line descriptions and relies on balance tracking 
        to identify transaction amounts and signage.
        """
        transactions = []
        month_map = {
            'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
        }

        # 1. Determine statement year
        year_match = re.search(r"AL \d+ DE [A-ZÉ]+ DE (\d{4})", text, re.IGNORECASE)
        year = int(year_match.group(1)) if year_match else datetime.now().year

        # 2. Extract Initial Balance (SALDO ANTERIOR)
        # We look for the first instance of SALDO ANTERIOR as the baseline for balance math.
        current_balance = 0.0
        bal_match = re.search(r"SALDO ANTERIOR\s+([\d,]+\.\d{2})", text, re.IGNORECASE)
        if not bal_match:
            bal_match = re.search(r"Saldo Anterior\s+\$([\d,]+\.\d{2})", text, re.IGNORECASE)
        
        if bal_match:
            current_balance = float(bal_match.group(1).replace(',', ''))
            logger.info(f"BanamexParser: Initial balance set to {current_balance}")
        else:
            logger.warning("BanamexParser: Could not find initial balance, starting from 0.0")

        # 3. State-machine variables
        lines = text.split('\n')
        current_tx_date = None
        current_tx_desc_buffer = []

        # Cleanup text: remove noise that interrupts transaction blocks
        noise_keywords = ["Página:", "ESTADO DE CUENTA", "CLIENTE:", "Centro de Atención", "DETALLE DE OPERACIONES", "FECHA CONCEPTO"]

        for line in lines:
            line = line.strip()
            if not line or any(k in line for k in noise_keywords):
                continue

            # Check for a new transaction date (e.g., "11 NOV")
            # We use a strict regex to avoid matching dates inside the description
            date_match = re.match(r"^(\d{2})\s+([A-Z]{3})(?:\s+|$)", line)
            
            if date_match:
                # If we were already building a description but didn't finish it with HORA,
                # we just ignore that buffer as it likely wasn't a transaction or was a header.
                day = int(date_match.group(1))
                mon_str = date_match.group(2).upper()
                month = month_map.get(mon_str, 1)
                
                current_tx_date = datetime(year, month, day)
                # Keep the rest of the line as part of the description
                current_tx_desc_buffer = [line[6:].strip()]
                continue

            # If we are in a transaction block, check for the "HORA" line which contains the numbers
            if current_tx_date:
                if "HORA" in line:
                    # Capture numerical values at the end of the line (The columns: [Amount?, Balance])
                    # Example: "HORA 11:53 SUC 0859  10,171.00 10,171.57"
                    numeric_matches = re.findall(r"([\d,]+\.\d{2})", line)
                    
                    if numeric_matches:
                        # Transaction detection logic
                        tx_amount = 0.0
                        new_balance = current_balance

                        if len(numeric_matches) >= 2:
                            # Typical case: [Value, New Balance]
                            val = float(numeric_matches[-2].replace(',', ''))
                            new_bal = float(numeric_matches[-1].replace(',', ''))
                            
                            # Rule A: Deposit? (Prev + Val = New)
                            if abs((current_balance + val) - new_bal) < 0.05:
                                tx_amount = val
                                new_balance = new_bal
                            # Rule B: Withdrawal? (Prev - Val = New)
                            elif abs((current_balance - val) - new_bal) < 0.05:
                                tx_amount = -val
                                new_balance = new_bal
                            else:
                                # Logic mismatch (maybe missed a line). Heuristic fallback.
                                # Check keywords in gathered description
                                desc_full = " ".join(current_tx_desc_buffer).upper()
                                is_income = any(k in desc_full for k in ["PAGO RECIBIDO", "NOMINA", "ABONO", "TRANSFERENCIA RECIBIDA", "DEPOSITO"])
                                tx_amount = val if is_income else -val
                                new_balance = new_bal
                        else:
                            # Only one number - check if it matches current balance (info line)
                            # or if it's a new balance (meaning we missed the amount but have the total)
                            val = float(numeric_matches[0].replace(',', ''))
                            if abs(val - current_balance) < 0.05:
                                # Just a balance restatement, ignore
                                tx_amount = 0.0
                            else:
                                # Missing amount but have balance movement?
                                # This shouldn't happen often in this format.
                                new_balance = val
                                tx_amount = new_balance - current_balance

                        # Save transaction if amount is non-zero
                        if abs(tx_amount) > 0.001:
                            # Finalize description by removing meta words
                            desc = " ".join(current_tx_desc_buffer).strip()
                            # Strip common meta indicators from description
                            desc = re.sub(r"\s+(SUC|CAJA|AUT|RASTREO|REF)\.?\s*.*", "", desc, flags=re.IGNORECASE).strip()
                            if not desc: desc = "Operación Bancaria"
                            
                            category_id = self._match_category(desc, categorization_map, uncategorized_id)
                            transactions.append(Transaction(
                                amount=tx_amount, description=desc[:255], date=current_tx_date,
                                user_id=user_id, merchant_name=normalize_merchant(desc),
                                category_id=category_id
                            ))
                            logger.info(f"BanamexParser: Extracted {tx_amount} - {desc}")
                        
                        current_balance = new_balance
                        # Transaction is finished. Reset for next one.
                        current_tx_date = None
                        current_tx_desc_buffer = []
                else:
                    # Append more description lines
                    current_tx_desc_buffer.append(line)

        logger.info(f"BanamexParser: Finished parsing. Total transactions: {len(transactions)}")
        return ParsedStatement(transactions=transactions, account_type="credit")

class BBVAParser(BankParser):
    @property
    def bank_name(self) -> str:
        return BBVA

    def can_parse(self, text: str) -> bool:
        # Detection points for BBVA
        return BBVA in text.upper() or "BANCOMER" in text.upper()

    def parse(self, text: str, user_id: UUID, categories: List[Category] = []) -> ParsedStatement:
        # Placeholder for specific BBVA logic
        logger.info(f"BBVAParser statement text: {text}")
        return ParsedStatement()

class SantanderParser(BankParser):
    @property
    def bank_name(self) -> str:
        return SANTANDER

    def can_parse(self, text: str) -> bool:
        # Detection points for Santander
        return SANTANDER in text.upper()

    def parse(self, text: str, user_id: UUID, categories: List[Category] = []) -> ParsedStatement:
        # Placeholder for specific Santander logic
        logger.info(f"SantanderParser statement text: {text}")
        return ParsedStatement()

class NuParser(BankParser):
    @property
    def bank_name(self) -> str:
        return NUBANK

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

    def parse(self, text: str, user_id: UUID, categories: List[Category] = []) -> ParsedStatement:
        transactions = []
        savings_movements = []
        month_map = {
            'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
        }
        
        # Get default category ID once
        uncategorized_id = None
        for cat in categories:
            if cat.name == "Sin Categoría":
                uncategorized_id = cat.id
                break
        
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
                # Categorization logic
                category_id = None
                for category in categories:
                    if category.categorization_labels:
                        for label in category.categorization_labels:
                            if label.upper() in description.upper():
                                category_id = category.id
                                break
                    if category_id:
                        break
                
                # Use pre-calculated default if no match found
                if not category_id:
                    category_id = uncategorized_id

                transactions.append(Transaction(
                    amount=amount,
                    description=description,
                    date=date_obj,
                    user_id=user_id,
                    merchant_name=normalize_merchant(description),
                    category_id=category_id
                ))
            
        return ParsedStatement(transactions=transactions, savings_movements=savings_movements, account_type="debit")

class GenericBankParser(BankParser):
    @property
    def bank_name(self) -> str:
        return "Generic / LLM"

    def can_parse(self, text: str) -> bool:
        return True # Fallback

    def parse(self, text: str, user_id: UUID, categories: List[Category] = []) -> ParsedStatement:
        # This is where LLM logic would go
        logger.info(f"GenericBankParser statement text: {text}")
        return ParsedStatement()
