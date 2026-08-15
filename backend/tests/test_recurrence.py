from datetime import date
from decimal import Decimal
from uuid import uuid4

from tomin.domain.entities import Transaction
from tomin.domain.services.recurrence import RecurrenceService, series_key
from tomin.domain.value_objects.enums import TxType


def _tx(day: date, desc: str, amount: str, tx_type: TxType = TxType.EXPENSE):
    return Transaction(
        user_id=uuid4(),
        tx_date=day,
        amount=Decimal(amount),
        raw_description=desc,
        tx_type=tx_type,
    )


def test_detects_monthly_subscription():
    txs = [
        _tx(date(2024, 1, 5), "Netflix", "299"),
        _tx(date(2024, 2, 5), "Netflix", "299"),
        _tx(date(2024, 3, 5), "Netflix", "299"),
        _tx(date(2024, 1, 9), "One off store", "50"),
    ]
    groups = RecurrenceService().detect(txs)
    assert len(groups) == 1
    g = groups[0]
    assert g.label == "Netflix"
    assert g.frequency == "monthly"
    assert g.occurrences == 3
    assert g.typical_amount == Decimal("299.00")
    assert g.amount_stable is True
    assert g.monthly_equivalent > Decimal("280")
    assert g.next_expected == date(2024, 4, 4)  # last + 30 (median interval)


def test_date_prefixes_do_not_split_a_series():
    """The reported case, verbatim: only the leading date token differs."""
    assert series_key("07-may-2026 PAYPAL *CABLEYCOMUN OPM 150323DI1MX +") == series_key(
        "06-abr-2026 PAYPAL *CABLEYCOMUN OPM 150323DI1MX +"
    )
    # Numeric and ISO date shapes too.
    assert series_key("07/05/2026 NETFLIX") == series_key("06/04/2026 NETFLIX")
    assert series_key("2026-05-07 NETFLIX") == series_key("2026-04-06 NETFLIX")

    txs = [
        _tx(date(2026, 4, 6), "06-abr-2026 PAYPAL *CABLEYCOMUN OPM 150323DI1MX +", "389"),
        _tx(date(2026, 5, 7), "07-may-2026 PAYPAL *CABLEYCOMUN OPM 150323DI1MX +", "389"),
        _tx(date(2026, 6, 6), "06-jun-2026 PAYPAL *CABLEYCOMUN OPM 150323DI1MX +", "389"),
    ]
    groups = RecurrenceService().detect(txs)
    assert len(groups) == 1
    assert groups[0].frequency == "monthly"


def test_month_names_survive_outside_date_shapes():
    """A merchant named MAYO must not lose its identity to the date strip."""
    assert "mayo" in series_key("MAYO SEGUROS SA DE CV")
    assert "diciembre" in series_key("RESTAURANTE DICIEMBRE")


def test_branch_numbers_collapse_into_one_series():
    """"OXXO SUC 4412" and "OXXO SUC 8891" are the same habit."""
    assert series_key("OXXO SUC 4412 MX") == series_key("OXXO SUC 8891 MX")
    txs = [
        _tx(date(2024, 1, 3), "GYM SUC 4412 MENSUALIDAD", "500"),
        _tx(date(2024, 2, 3), "GYM SUC 8891 MENSUALIDAD", "500"),
        _tx(date(2024, 3, 3), "GYM SUC 1001 MENSUALIDAD", "500"),
    ]
    groups = RecurrenceService().detect(txs)
    assert len(groups) == 1
    assert groups[0].occurrences == 3


def test_two_occurrences_is_a_coincidence():
    txs = [
        _tx(date(2024, 1, 5), "Spotify", "129"),
        _tx(date(2024, 2, 5), "Spotify", "129"),
    ]
    assert RecurrenceService().detect(txs) == []


def test_irregular_visits_are_not_a_subscription():
    """A merchant you merely visit often has no rhythm."""
    txs = [
        _tx(date(2024, 1, 2), "Cafetería", "80"),
        _tx(date(2024, 1, 5), "Cafetería", "95"),
        _tx(date(2024, 2, 28), "Cafetería", "70"),
        _tx(date(2024, 3, 2), "Cafetería", "88"),
    ]
    assert RecurrenceService().detect(txs) == []


def test_variable_amount_recurs_but_is_flagged_unstable():
    """CFE varies charge to charge; it still recurs on a rhythm."""
    txs = [
        _tx(date(2024, 1, 10), "CFE RECIBO", "300"),
        _tx(date(2024, 2, 9), "CFE RECIBO", "520"),
        _tx(date(2024, 3, 11), "CFE RECIBO", "410"),
    ]
    groups = RecurrenceService().detect(txs)
    assert len(groups) == 1
    assert groups[0].frequency == "monthly"
    assert groups[0].amount_stable is False


def test_biweekly_cadence():
    txs = [
        _tx(date(2024, 1, 1), "Prestamo quincenal", "750"),
        _tx(date(2024, 1, 15), "Prestamo quincenal", "750"),
        _tx(date(2024, 1, 30), "Prestamo quincenal", "750"),
        _tx(date(2024, 2, 14), "Prestamo quincenal", "750"),
    ]
    groups = RecurrenceService().detect(txs)
    assert len(groups) == 1
    assert groups[0].frequency == "biweekly"


def test_income_and_excluded_are_ignored():
    nomina = [
        _tx(date(2024, m, 1), "Nomina", "1000", TxType.INCOME) for m in (1, 2, 3)
    ]
    excluded = []
    for m in (1, 2, 3):
        t = _tx(date(2024, m, 5), "Transfer propio", "500")
        t.excluded_from_stats = True
        excluded.append(t)
    assert RecurrenceService().detect(nomina + excluded) == []


def test_taught_alias_merges_differently_worded_series():
    """Naming a charge and grouping its series are the same act."""
    txs = [
        _tx(date(2026, 3, 6), "06-mar-2026 PAYPAL *CABLEYCOMUN OPM 150323DI1MX +", "389"),
        _tx(date(2026, 4, 6), "06-abr-2026 CABLEYCOMUN SA CV MX 998812", "389"),
        _tx(date(2026, 5, 7), "07-may-2026 PAYPAL *CABLEYCOMUN OPM 441209XX2MX +", "389"),
    ]
    # Without the alias, the two wordings are different heuristic series —
    # neither reaches three occurrences, so nothing qualifies.
    assert RecurrenceService().detect(txs) == []

    # With the taught label, they are one series under the user's name.
    groups = RecurrenceService().detect(txs, aliases=[("cableycomun", "Cable e Internet")])
    assert len(groups) == 1
    g = groups[0]
    assert g.label == "Cable e Internet"
    assert g.key == "alias:cableycomun"
    assert g.occurrences == 3
    assert g.frequency == "monthly"


def test_alias_changes_the_label_but_never_splits_the_series():
    """Identity is the raw text; display is the freshest description."""
    txs = [
        _tx(date(2024, 1, 5), "POCK*SUPERLECLERC MX", "400"),
        _tx(date(2024, 2, 5), "POCK*SUPERLECLERC MX", "400"),
        _tx(date(2024, 3, 5), "POCK*SUPERLECLERC MX", "400"),
    ]
    # Only the most recent row has been renamed so far (mid-transition).
    txs[-1].description = "Súper cerca de casa"
    groups = RecurrenceService().detect(txs)
    assert len(groups) == 1
    assert groups[0].occurrences == 3
    assert groups[0].label == "Súper cerca de casa"
