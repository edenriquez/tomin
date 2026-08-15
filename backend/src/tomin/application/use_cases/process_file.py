from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from uuid import UUID

from ...domain.entities import Statement, Transaction
from ...domain.services.aliases import AliasService
from ...domain.services.categorization import CategorizationService
from ...domain.services.flags import detect_flags
from ...domain.value_objects.enums import StatementSource, StatementStatus
from ..dtos.extraction import ExtractedDocument
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
    UserAliasRepository,
    UserLabelRepository,
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


class _StatementIngestion:
    """Everything the pipeline does *after* it holds an ``ExtractedDocument``.

    classify -> parse -> categorize -> flag -> alias -> persist -> cube.

    This half is deliberately ignorant of where the text came from, which is
    the seam docs/custody-plan.md leans on: the phone does not replace the
    pipeline, it replaces one step (extraction). Both entry points below share
    this class so a device statement and a web upload can never drift into
    meaning different things — the alternative, a second copy of the tail, is
    exactly how learned labels start applying on one path and not the other.
    """

    def __init__(
        self,
        *,
        classifier: TemplateClassifier,
        parser_factory: ParserFactory,
        statements: StatementRepository,
        transactions: TransactionRepository,
        categories: CategoryRepository,
        merchants: MerchantRepository,
        user_labels: UserLabelRepository,
        user_aliases: UserAliasRepository,
        cube: CubeWriter,
    ) -> None:
        self._classifier = classifier
        self._parser_factory = parser_factory
        self._statements = statements
        self._transactions = transactions
        self._categories = categories
        self._merchants = merchants
        self._user_labels = user_labels
        self._user_aliases = user_aliases
        self._cube = cube

    def _reject_duplicate(self, user_id: UUID, file_hash: str, filename: str) -> None:
        """Dedup on the content hash, whoever computed it.

        The web path hashes the bytes it received; the device path trusts the
        ``content_sha256`` the phone computed over the file it kept. Same
        column, same meaning — re-sending the same statement from either
        surface is still the same statement.
        """
        if self._statements.exists_hash(user_id, file_hash):
            raise DuplicateStatementError(filename)

    def _ingest(
        self,
        *,
        user_id: UUID,
        doc: ExtractedDocument,
        file_hash: str,
        source: StatementSource,
    ) -> ProcessFileResult:
        template = self._classifier.classify(doc)
        parser = self._parser_factory.get(template)
        parsed = parser.parse(doc)

        statement = Statement(
            user_id=user_id,
            source_type=parsed.source_type,
            # The parser knows its own bank only when a dedicated template
            # matched; for generic parses the classifier's scored
            # detection still names the issuer.
            bank=parsed.bank or self._classifier.detect_bank(doc),
            period_start=parsed.period_start,
            period_end=parsed.period_end,
            status=StatementStatus.PROCESSING,
            file_hash=file_hash,
            source=source,
        )
        self._statements.add(statement)

        # The user's own learned vocabulary rides along with the global
        # reference data, so a correction taught yesterday categorizes
        # today's upload — no restart, no rebuild.
        categorizer = CategorizationService(
            self._categories.get_all(),
            self._merchants.get_all(),
            extra_labels=self._user_labels.list_for_user(user_id),
        )
        # Same trick for display names: an alias taught yesterday renames
        # today's upload at ingest, raw_description untouched.
        aliaser = AliasService(self._user_aliases.list_for_user(user_id))
        domain_txs: list[Transaction] = []
        for p in parsed.transactions:
            cls = categorizer.classify(p.raw_description)
            # Derived once, at ingest, so every later read agrees. A
            # transfer is not spend and a withdrawal is not a category.
            flags = detect_flags(p.raw_description)
            domain_txs.append(
                Transaction(
                    user_id=user_id,
                    statement_id=statement.id,
                    tx_date=p.tx_date,
                    amount=p.amount,
                    raw_description=p.raw_description,
                    description=aliaser.apply(p.raw_description),
                    currency=p.currency,
                    tx_type=p.tx_type,
                    status=p.status,
                    category_id=cls.category_id,
                    merchant_id=cls.merchant_id,
                    is_transfer=flags.is_transfer,
                    is_cash_withdrawal=flags.is_cash_withdrawal,
                )
            )

        self._transactions.add_many(domain_txs)
        statement.mark(StatementStatus.PROCESSED)
        self._statements.update(statement)

        self._cube.upsert_transactions(domain_txs)

        return ProcessFileResult(
            statement_id=statement.id,
            template=template,
            transactions_created=len(domain_txs),
        )


class ProcessFileUseCase(_StatementIngestion):
    """Orchestrates the ingestion pipeline for a file the server must read.

    upload -> extract -> classify -> parse -> categorize -> persist -> discard raw.
    The raw file is only held transiently in :class:`FileStorage` and is always
    discarded before returning. Statements land with ``source="web"``: honest
    about the fact that the file did touch the server here, unlike the device
    path.
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
        user_labels: UserLabelRepository,
        user_aliases: UserAliasRepository,
        cube: CubeWriter,
        file_storage: FileStorage,
    ) -> None:
        super().__init__(
            classifier=classifier,
            parser_factory=parser_factory,
            statements=statements,
            transactions=transactions,
            categories=categories,
            merchants=merchants,
            user_labels=user_labels,
            user_aliases=user_aliases,
            cube=cube,
        )
        self._extractors = extractors
        self._file_storage = file_storage

    def execute(
        self, *, user_id: UUID, data: bytes, filename: str, mime: str | None = None
    ) -> ProcessFileResult:
        file_hash = hashlib.sha256(data).hexdigest()
        # Checked before extraction, not inside `_ingest`: OCR is the expensive
        # step and a re-upload should not pay for it.
        self._reject_duplicate(user_id, file_hash, filename)

        extractor = self._select_extractor(filename, mime)
        if extractor is None:
            raise UnsupportedFileError(filename)

        handle = self._file_storage.save(data, filename)
        try:
            doc = extractor.extract(self._file_storage.read(handle), filename, mime)
            return self._ingest(
                user_id=user_id,
                doc=doc,
                file_hash=file_hash,
                source=StatementSource.WEB,
            )
        finally:
            # Raw file is transient and must never be persisted server-side.
            self._file_storage.discard(handle)

    def _select_extractor(self, filename: str, mime: str | None) -> Extractor | None:
        for extractor in self._extractors:
            if extractor.supports(filename, mime):
                return extractor
        return None


class ProcessExtractedUseCase(_StatementIngestion):
    """The same pipeline, entered one step later: the text is already extracted.

    The device did the reading, so there is no file to store, no extractor to
    select and nothing to discard — the transient-storage dance the web path
    performs exists only because the server had bytes it was not supposed to
    keep. Here it never had them (docs/custody-plan.md G1/G2).

    ``file_hash`` is the phone's ``content_sha256`` over the **original file**,
    not over the extracted text: two OCR runs of the same PDF may differ by a
    character, and a hash that wobbled with the extractor would silently let
    the same statement in twice.
    """

    def execute(
        self,
        *,
        user_id: UUID,
        document: ExtractedDocument,
        file_hash: str,
        source: StatementSource = StatementSource.DEVICE,
    ) -> ProcessFileResult:
        self._reject_duplicate(user_id, file_hash, document.filename)
        return self._ingest(
            user_id=user_id, doc=document, file_hash=file_hash, source=source
        )
