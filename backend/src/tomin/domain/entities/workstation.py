from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID, uuid4

#: The rule's whole surface. Deliberately a fixed set of *named* conditions
#: rather than a tree of AND/OR: every one of them maps to a filter the metric
#: catalog already declares, which is what keeps a saved rule and a runnable
#: query the same object. A rule the engine would reject can never be stored.
RULE_FIELDS = ("description_contains", "amount_min", "amount_max", "category_id", "tag_id")

#: Above this many hand-excluded rows, the rule is wrong and the exclusions are
#: papering over it. The cap is a product judgement, not a storage limit: a
#: workstation is a lens, and a lens with 200 exceptions is a list.
MAX_EXCLUSIONS = 200


@dataclass(slots=True)
class WorkstationRule:
    """What makes a movement part of this set.

    Every condition is optional and they compose as AND -- "contains 'recarga'
    *and* between 10 and 300". OR was cut on purpose: a user who needs it can
    make a second workstation, and the cost of a rule builder nobody can read at
    a glance is that the numbers under it stop being trusted.
    """

    description_contains: str | None = None
    amount_min: Decimal | None = None
    amount_max: Decimal | None = None
    category_id: UUID | None = None
    tag_id: UUID | None = None

    def __post_init__(self) -> None:
        if self.description_contains is not None:
            self.description_contains = self.description_contains.strip()
            if not self.description_contains:
                # An empty needle matches every movement. That is never what a
                # rule meant, and a set that silently becomes "all your money"
                # is worse than a rejected save.
                raise ValueError("description_contains must not be empty.")

        self.amount_min = _amount(self.amount_min, "amount_min")
        self.amount_max = _amount(self.amount_max, "amount_max")
        if self.amount_min is not None and self.amount_max is not None:
            if self.amount_min > self.amount_max:
                raise ValueError(
                    f"amount_min ({self.amount_min}) is above amount_max ({self.amount_max}); "
                    "no movement can satisfy that."
                )

        if not self.conditions:
            # A workstation with no conditions is the whole ledger wearing a
            # name. Movimientos already shows that, better.
            raise ValueError("A rule needs at least one condition.")

    @property
    def conditions(self) -> dict[str, Any]:
        """The stated conditions, in domain types. Absent keys are unset."""
        return {
            name: value
            for name, value in (
                (field_name, getattr(self, field_name)) for field_name in RULE_FIELDS
            )
            if value is not None
        }

    def to_filters(self, excluded: list[UUID]) -> dict[str, Any]:
        """The rule as a metric-query ``filters`` dict.

        This method is the whole reason the rule is modelled rather than stored
        as opaque JSON: a saved rule and a runnable query are the same thing in
        two shapes, and the translation lives in exactly one place. The names on
        the right are the catalog's, so drift between them is an import error
        rather than an empty widget.
        """
        filters: dict[str, Any] = {}
        if self.description_contains:
            filters["description_contains"] = self.description_contains
        if self.amount_min is not None:
            filters["amount_min"] = str(self.amount_min)
        if self.amount_max is not None:
            filters["amount_max"] = str(self.amount_max)
        if self.category_id:
            filters["category"] = str(self.category_id)
        if self.tag_id:
            filters["tag"] = str(self.tag_id)
        if excluded:
            filters["exclude_tx"] = [str(tx_id) for tx_id in excluded]
        return filters


@dataclass(slots=True)
class Workstation:
    """A user's saved lens over the ledger: a rule, a name, and its exceptions.

    ``excluded_tx_ids`` is not a second rule -- it is the escape hatch a text
    predicate always eventually needs. A user who matched 47 movements and knows
    two of them are not top-ups must be able to say so without abandoning the
    rule that got them the other 45.
    """

    user_id: UUID
    name: str
    rule: WorkstationRule
    excluded_tx_ids: list[UUID] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    id: UUID = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.id is None:
            self.id = uuid4()
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("Workstation name must not be empty.")
        if len(self.name) > 120:
            raise ValueError("Workstation name must be 120 characters or fewer.")

        # Order-independent and duplicate-free: two saves of the same set of
        # exclusions must produce the same row, or every diff is noise.
        self.excluded_tx_ids = sorted(set(self.excluded_tx_ids), key=str)
        if len(self.excluded_tx_ids) > MAX_EXCLUSIONS:
            raise ValueError(
                f"A workstation carries at most {MAX_EXCLUSIONS} manual exclusions; "
                f"got {len(self.excluded_tx_ids)}. Narrow the rule instead."
            )

    def to_filters(self) -> dict[str, Any]:
        """The filters every metric read of this workstation is made under."""
        return self.rule.to_filters(self.excluded_tx_ids)


def _amount(value: Any, name: str) -> Decimal | None:
    if value is None:
        return None
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be a number, got {value!r}.") from exc
    if amount < 0:
        # Amounts are magnitudes here, as everywhere in this domain: direction
        # lives in tx_type. A negative bound would silently match nothing.
        raise ValueError(f"{name} must not be negative, got {amount}.")
    return amount
