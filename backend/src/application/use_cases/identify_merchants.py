import logging
from uuid import UUID
from typing import List
from ...domain.entities.models import Transaction, MerchantLabel
from ...domain.repositories.interfaces import TransactionRepository, MerchantRepository
from .detect_recurring_transactions import normalize_merchant

logger = logging.getLogger(__name__)

class IdentifyMerchants:
    def __init__(self, tx_repo: TransactionRepository, merchant_repo: MerchantRepository):
        self.tx_repo = tx_repo
        self.merchant_repo = merchant_repo

    async def execute(self, user_id: UUID):
        """
        Background/manual process to link transactions to verified merchants
        based on global labels.
        """
        # 1. Fetch all labels
        labels = self.merchant_repo.get_labels()
        if not labels:
            logger.info("No merchant labels found for identification.")
            return 0

        # Sort labels by length (descending) to match more specific labels first (e.g., "Uber Eats" before "Uber")
        labels.sort(key=lambda x: len(x.label), reverse=True)

        import re
        from datetime import datetime, timedelta
        
        # 2. Fetch recent transactions for a user that don't have a merchant_id yet
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        transactions = self.tx_repo.get_by_user(user_id, start_date, end_date)
        unlinked_transactions = [tx for tx in transactions if tx.merchant_id is None]
        
        if not unlinked_transactions:
            return 0

        match_count = 0
        for tx in unlinked_transactions:
            normalized_desc = normalize_merchant(tx.description)
            if not normalized_desc:
                continue
            
            for ml in labels:
                # Use word boundaries to avoid partial matches (e.g., "Aba" matching "Abarrotes")
                # We use re.escape to handle labels with special characters or spaces
                pattern = r'\b' + re.escape(ml.label) + r'\b'
                
                if re.search(pattern, normalized_desc, re.IGNORECASE):
                    # Found a match!
                    tx.merchant_id = ml.merchant_id
                    
                    merchant = self.merchant_repo.get_by_id(ml.merchant_id)
                    if merchant:
                        tx.merchant_name = merchant.name
                        logger.info(f"Matched transaction '{tx.description}' to merchant '{merchant.name}' via label '{ml.label}'")
                    
                    self.merchant_repo.update_transaction_merchant_and_name(tx.id, ml.merchant_id, merchant.name)
                    match_count += 1
                    break
        
        return match_count
