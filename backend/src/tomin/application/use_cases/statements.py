from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...domain.entities import Statement
from ..ports.outbound import CubeWriter, StatementRepository, TransactionRepository


class StatementNotFoundError(Exception):
    """Raised when a statement does not exist or belongs to another user."""


@dataclass(frozen=True)
class DeleteStatementResult:
    statement_id: UUID
    transactions_deleted: int


class ManageStatementsUseCase:
    """Read and delete previously ingested statements.

    Creation lives in :class:`ProcessFileUseCase`; this use case covers the rest
    of the lifecycle. Deleting a statement also removes the transactions derived
    from it -- in the relational store and in the analytics cube -- so the
    dashboards stop counting them. The user's own copy of the raw file lives on
    their phone and is untouched by this.
    """

    def __init__(
        self,
        *,
        statements: StatementRepository,
        transactions: TransactionRepository,
        cube: CubeWriter,
    ) -> None:
        self._statements = statements
        self._transactions = transactions
        self._cube = cube

    def list(self, *, user_id: UUID) -> list[Statement]:
        return self._statements.list_for_user(user_id)

    def delete(self, *, user_id: UUID, statement_id: UUID) -> DeleteStatementResult:
        statement = self._statements.get(statement_id)
        # Treat someone else's statement as missing rather than forbidden, so the
        # response does not disclose that the id exists.
        if statement is None or statement.user_id != user_id:
            raise StatementNotFoundError(str(statement_id))

        tx_ids = self._transactions.delete_for_statement(statement_id)
        self._statements.delete(statement_id)

        self._cube.delete_transactions(tx_ids)

        return DeleteStatementResult(
            statement_id=statement_id, transactions_deleted=len(tx_ids)
        )
