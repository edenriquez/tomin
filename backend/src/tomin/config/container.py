from __future__ import annotations

from functools import cached_property

from ..adapters.outbound.cube import DuckDbCube
from ..adapters.outbound.extraction import (
    KeywordTemplateClassifier,
    PdfExtractor,
    SatXmlExtractor,
)
from ..adapters.outbound.parsing import DefaultParserFactory
from ..adapters.outbound.persistence import (
    Database,
    SqlAccountRepository,
    SqlCategoryRepository,
    SqlGoalRepository,
    SqlMerchantRepository,
    SqlStatementRepository,
    SqlTransactionRepository,
)
from ..adapters.outbound.persistence.migrator import upgrade_to_head
from ..adapters.outbound.persistence.seed import seed_reference_data
from ..adapters.outbound.storage import TransientFileStorage
from ..application.use_cases import (
    DetectRecurringUseCase,
    GetForecastUseCase,
    GetSpendingSummaryUseCase,
    ListTransactionsUseCase,
    ManageGoalsUseCase,
    ProcessFileUseCase,
    SimulateForecastUseCase,
)
from .settings import Settings


class Container:
    """Composition root: wires adapters into use cases.

    This is the only place allowed to know about both concrete adapters and
    application use cases. Everything else depends on interfaces.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    # --- infrastructure singletons --------------------------------------
    @cached_property
    def database(self) -> Database:
        return Database(self.settings.database_url)

    @cached_property
    def cube(self) -> DuckDbCube:
        return DuckDbCube(self.settings.cube_path)

    @cached_property
    def file_storage(self) -> TransientFileStorage:
        return TransientFileStorage()

    # --- repositories ----------------------------------------------------
    @cached_property
    def transactions(self) -> SqlTransactionRepository:
        return SqlTransactionRepository(self.database)

    @cached_property
    def statements(self) -> SqlStatementRepository:
        return SqlStatementRepository(self.database)

    @cached_property
    def accounts(self) -> SqlAccountRepository:
        return SqlAccountRepository(self.database)

    @cached_property
    def goals_repo(self) -> SqlGoalRepository:
        return SqlGoalRepository(self.database)

    @cached_property
    def categories(self) -> SqlCategoryRepository:
        return SqlCategoryRepository(self.database)

    @cached_property
    def merchants(self) -> SqlMerchantRepository:
        return SqlMerchantRepository(self.database)

    # --- pipeline components --------------------------------------------
    @cached_property
    def classifier(self) -> KeywordTemplateClassifier:
        return KeywordTemplateClassifier()

    @cached_property
    def parser_factory(self) -> DefaultParserFactory:
        return DefaultParserFactory()

    @cached_property
    def extractors(self) -> list:
        # Order matters: XML is matched before the PDF extractor.
        return [SatXmlExtractor(), PdfExtractor()]

    # --- use cases -------------------------------------------------------
    @cached_property
    def process_file(self) -> ProcessFileUseCase:
        return ProcessFileUseCase(
            extractors=self.extractors,
            classifier=self.classifier,
            parser_factory=self.parser_factory,
            statements=self.statements,
            transactions=self.transactions,
            categories=self.categories,
            merchants=self.merchants,
            cube=self.cube,
            file_storage=self.file_storage,
        )

    @cached_property
    def list_transactions(self) -> ListTransactionsUseCase:
        return ListTransactionsUseCase(self.transactions)

    @cached_property
    def spending_summary(self) -> GetSpendingSummaryUseCase:
        return GetSpendingSummaryUseCase(self.cube)

    @cached_property
    def detect_recurring(self) -> DetectRecurringUseCase:
        return DetectRecurringUseCase(self.transactions)

    @cached_property
    def get_forecast(self) -> GetForecastUseCase:
        return GetForecastUseCase(self.cube)

    @cached_property
    def simulate_forecast(self) -> SimulateForecastUseCase:
        return SimulateForecastUseCase()

    @cached_property
    def manage_goals(self) -> ManageGoalsUseCase:
        return ManageGoalsUseCase(self.goals_repo)

    # --- bootstrap -------------------------------------------------------
    def bootstrap(self) -> None:
        """Migrate the schema, then seed reference data + cube dimensions."""
        if self.settings.run_migrations:
            upgrade_to_head(self.database, self.settings.database_url)
        else:
            # Test path only: a fresh throwaway database per test, where
            # replaying migration history would test Alembic, not the app.
            self.database.create_all()
        seed_reference_data(self.categories, self.merchants)
        self.cube.sync_categories(self.categories.get_all())
