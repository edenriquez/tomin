import re
import statistics
from uuid import UUID
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from collections import defaultdict
import logging
from ...domain.repositories.interfaces import TransactionRepository

logger = logging.getLogger(__name__)

def normalize_merchant(text: str) -> str:
    """Rule 1: Strict Normalization (non-negotiable)"""
    if not text: return ""
    text = text.lower()
    
    # Remove numbers, dates, IDs
    text = re.sub(r'\*?\d+', '', text)
    text = re.sub(r'\d{2}/\d{2}/\d{2,4}', '', text)
    text = re.sub(r'[/.-]', ' ', text)
    
    # Remove common stopwords (Mexican banking context)
    stop_words = ["payment", "transfer", "debit", "card", "pago", "transferencia", "debito", "tarjeta", "compra", "spei", "ref"]
    for sw in stop_words:
        text = re.sub(r'\b' + sw + r'\b', '', text)
        
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

class DetectRecurringTransactions:
    def __init__(self, tx_repo: TransactionRepository):
        self.tx_repo = tx_repo

    async def execute(self, user_id: UUID, file_hash: str):
        """
        Detects recurring transactions for a user by analyzing their history.
        Logic follows 9 strictly defined rules for normalization, partitioning,
        amount similarity, interval detection, and confidence scoring.
        """
        logger.info(f"Running Advanced Recurring Detection for user {user_id}")
        
        # 1. Fetch History (Non-negotiable)
        # We need historical context (18 months) to detect patterns correctly
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365 + 180)
        
        # Fetch all transactions to look for cross-file patterns
        history = self.tx_repo.get_by_user(user_id, start_date, end_date)
        
        if len(history) < 3:
            logger.info("Insufficient transaction history for recurring detection.")
            return 0

        # 2. Normalize and Partition
        # Partition by merchant (normalized)
        # Note: Ideally we partitioning by account source too, but here we group by user context.
        groups = defaultdict(list)
        for tx in history:
            normalized_name = normalize_merchant(tx.merchant_name or tx.description)
            if not normalized_name:
                continue
            groups[normalized_name].append(tx)

        recurrent_ids = []
        
        for merchant, group in groups.items():
            # Rule 5: Minimum evidence threshold (at least 2 occurrences)
            if len(group) < 2:
                continue
            
            # Sort by date
            group.sort(key=lambda x: x.date)
            
            # Rule 4: Date interval detection
            intervals = []
            for i in range(1, len(group)):
                delta = (group[i].date - group[i-1].date).days
                intervals.append(delta)
            
            freq_analysis = self._detect_frequency(intervals)
            if freq_analysis["type"] == "unknown":
                continue

            # Rule 3: Amount similarity (±3-5%)
            amounts = [tx.amount for tx in group]
            avg_amount = statistics.mean(amounts)
            
            amt_matches = 0
            for a in amounts:
                # Rule 3: abs(a - b) <= max(1, a * 0.03) -- extended slightly for volatility
                if abs(a - avg_amount) <= max(1.0, avg_amount * 0.05):
                    amt_matches += 1
            amount_consistency_weight = amt_matches / len(amounts)
            
            # Rule 6: Confidence scoring
            interval_consistency_weight = freq_analysis["consistency"]
            occurrence_count_weight = min(len(group) / 6, 1.0)
            
            # Weights: Similarity(0.2), Amount(0.3), Interval(0.3), Count(0.2)
            confidence = (
                (1.0 * 0.2) + 
                (amount_consistency_weight * 0.3) + 
                (interval_consistency_weight * 0.3) + 
                (occurrence_count_weight * 0.2)
            )

            # Threshold for marking (Rule 6)
            if confidence >= 0.7:
                logger.info(f"Pattern confirmed: {merchant} ({freq_analysis['type']}) | Confidence: {confidence:.2f}")
                for tx in group:
                    recurrent_ids.append(tx.id)
                    # Rule 9: Store structured metadata
                    tx.metadata["recurring_analysis"] = {
                        "merchant": merchant,
                        "frequency": freq_analysis["type"],
                        "avg_amount": round(avg_amount, 2),
                        "confidence": round(confidence, 2),
                        "occurrences": len(group),
                        "last_seen": group[-1].date.isoformat(),
                        "next_expected": (group[-1].date + timedelta(days=sum(intervals)/len(intervals))).date().isoformat()
                    }

        # Update in repository
        if recurrent_ids:
            logger.info(f"Updating {len(recurrent_ids)} transactions as recurring.")
            self.tx_repo.update_recurrent_status(recurrent_ids, True)
            
        return len(recurrent_ids)


    def _detect_frequency(self, intervals: List[int]) -> Dict:
        """Rule 4: Common recurrence buckets"""
        buckets = {
            "weekly": (6, 10),
            "bi-weekly": (13, 18),
            "monthly": (26, 35),
            "quarterly": (80, 100),
            "yearly": (350, 385)
        }
        
        counts = defaultdict(int)
        for d in intervals:
            matched = False
            for type, (low, high) in buckets.items():
                if low <= d <= high:
                    counts[type] += 1
                    matched = True
                    break
            if not matched: counts["unknown"] += 1
            
        most_common = max(counts, key=counts.get)
        if most_common == "unknown":
            return {"type": "unknown", "consistency": 0}
            
        consistency = counts[most_common] / len(intervals)
        return {
            "type": most_common,
            "consistency": consistency
        }
