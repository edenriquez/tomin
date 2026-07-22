from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from ..value_objects.enums import SourceType, StatementStatus


@dataclass(slots=True)
class Statement:
    user_id: UUID
    source_type: SourceType
    bank: str | None = None
    account_id: UUID | None = None
    period_start: date | None = None
    period_end: date | None = None
    status: StatementStatus = StatementStatus.PENDING
    file_hash: str | None = None
    uploaded_at: datetime = None  # type: ignore[assignment]
    id: UUID = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.id is None:
            self.id = uuid4()
        if self.uploaded_at is None:
            self.uploaded_at = datetime.now(timezone.utc)

    def mark(self, status: StatementStatus) -> None:
        self.status = status
