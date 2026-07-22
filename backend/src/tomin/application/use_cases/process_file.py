from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from uuid import UUID

from ...domain.entities import Statement, Transaction
from ...domain.services.categorization import CategorizationService
from ...domain.value_objects.enums import StatementStatus
from ..ports.outbound import (
    CategoryRepository,
    CubeWriter,
    Extractor,
    FileStorage,
    MerchantRepository,
    ParserFactory,
    StatementRepository,
    TemplateClassifier,
    TransactionRepository,
)

logger = logging.getLogger(__name__)


class DuplicateStatementError(Exception):
    """Raised when the same file (by content hash) was already processed."""


class UnsupportedFileError(Exception):
    """Raised when no extractor supports the uploaded file."""


@dataclass(frozen=True)
class ProcessFileResult:
    statement_id: UUID
    template: str
    transactions_created: int


class ProcessFileUseCase:
    """Orchestrates the ingestion pipeline.

    upload -> extract -> classify -> parse -> categorize -> persist -> discard raw.
    The raw file is only held transiently in :class:`FileStorage` and is always
    discarded before returning.
    """

    def __init__(
        self,
        *,
        extractors: list[Extractor],
        classifier: TemplateClassifier,
        parser_factory: ParserFactory,
        statements: StatementRepository,
        transactions: TransactionRepository,
        categories: CategoryRepository,
        merchants: MerchantRepository,
        cube: CubeWriter,
        file_storage: FileStorage,
    ) -> None:
        self._extractors = extractors
        self._classifier = classifier
        self._parser_factory = parser_factory
        self._statements = statements
        self._transactions = transactions
        self._categories = categories
        self._merchants = merchants
        self._cube = cube
        self._file_storage = file_storage

    def execute(
        self, *, user_id: UUID, data: bytes, filename: str, mime: str | None = None
    ) -> ProcessFileResult:
        file_hash = hashlib.sha256(data).hexdigest()
        if self._statements.exists_hash(user_id, file_hash):
            raise DuplicateStatementError(filename)

        extractor = self._select_extractor(filename, mime)
        if extractor is None:
            raise UnsupportedFileError(filename)

        handle = self._file_storage.save(data, filename)
        try:
            doc = extractor.extract(self._file_storage.read(handle), filename, mime)
            template = self._classifier.classify(doc)
            parser = self._parser_factory.get(template)
            parsed = parser.parse(doc)

            statement = Statement(
                user_id=user_id,
                source_type=parsed.source_type,
                bank=parsed.bank,
                period_start=parsed.period_start,
                period_end=parsed.period_end,
                status=StatementStatus.PROCESSING,
                file_hash=file_hash,
            )
            self._statements.add(statement)

            categorizer = CategorizationService(
                self._categories.get_all(), self._merchants.get_all()
            )
            domain_txs: list[Transaction] = []
            for p in parsed.transactions:
                cls = categorizer.classify(p.raw_description)
                domain_txs.append(
                    Transaction(
                        user_id=user_id,
                        statement_id=statement.id,
                        tx_date=p.tx_date,
                        amount=p.amount,
                        raw_description=p.raw_description,
                        currency=p.currency,
                        tx_type=p.tx_type,
                        status=p.status,
                        category_id=cls.category_id,
                        merchant_id=cls.merchant_id,
                    )
                )

            self._transactions.add_many(domain_txs)
            statement.mark(StatementStatus.PROCESSED)
            self._statements.update(statement)

            self._cube.upsert_transactions(domain_txs)
            self._cube.refresh_rollups(user_id)

            return ProcessFileResult(
                statement_id=statement.id,
                template=template,
                transactions_created=len(domain_txs),
            )
        finally:
            # Raw file is transient and must never be persisted server-side.
            self._file_storage.discard(handle)

    def _select_extractor(self, filename: str, mime: str | None) -> Extractor | None:
        for extractor in self._extractors:
            if extractor.supports(filename, mime):
                return extractor
        return None
