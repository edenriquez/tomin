from abc import ABC, abstractmethod
from typing import List
from ...domain.entities.models import Transaction, ParsedStatement

class BankParser(ABC):
    @property
    @abstractmethod
    def bank_name(self) -> str:
        pass

    @abstractmethod
    def can_parse(self, text: str) -> bool:
        """Determines if this parser can handle the given text (detection points)."""
        pass

    @abstractmethod
    def parse(self, text: str, user_id) -> ParsedStatement:
        """Extracts transactions and savings movements from the text."""
        pass
