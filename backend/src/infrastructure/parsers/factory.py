from .base import BankParser
from .bank_parsers import BBVAParser, SantanderParser, NuParser, BanamexParser, GenericBankParser

class BankParserFactory:
    def __init__(self):
        self.parsers = [
            BBVAParser(),
            SantanderParser(),
            NuParser(),
            BanamexParser()
        ]
        self.fallback = GenericBankParser()

    def get_parser(self, text: str) -> BankParser:
        for parser in self.parsers:
            if parser.can_parse(text):
                return parser
        return self.fallback
