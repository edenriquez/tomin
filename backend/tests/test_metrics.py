"""Golden-data tests for the metric registry (docs/redesign-plan.md §1, §9).

Transactions are inserted through the repository + cube writer rather than
through an upload, so the arithmetic under test is the metric engine's and not
the parser's.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from tomin.domain.entities import Category, Transaction
from tomin.domain.value_objects.enums import TxType

DEV_USER = UUID("00000000-0000-0000-0000-000000000001")


@pytest.fixture
def seeded(app):
    """Two months of transactions for the dev user, with two categories.

    Jan: 100 + 300 Comida expense, 5000 income.
    Feb: 250 Transporte expense.
    Total expense 650, total income 5000.
    """
    container = app.extensions["container"]
    comida = Category(name="Comida")
    transporte = Category(name="Transporte")
    container.categories.add_many([comida, transporte])
    container.cube.sync_categories(container.categories.get_all())

    txs = [
        Transaction(
            user_id=DEV_USER,
            tx_date=date(2024, 1, 5),
            amount=Decimal("100"),
            raw_description="OXXO",
            tx_type=TxType.EXPENSE,
            category_id=comida.id,
        ),
        Transaction(
            user_id=DEV_USER,
            tx_date=date(2024, 1, 20),
            amount=Decimal("300"),
            raw_description="Walmart",
            tx_type=TxType.EXPENSE,
            category_id=comida.id,
        ),
        Transaction(
            user_id=DEV_USER,
            tx_date=date(2024, 1, 31),
            amount=Decimal("5000"),
            raw_description="Nomina",
            tx_type=TxType.INCOME,
        ),
        Transaction(
            user_id=DEV_USER,
            tx_date=date(2024, 2, 10),
            amount=Decimal("250"),
            raw_description="Uber",
            tx_type=TxType.EXPENSE,
            category_id=transporte.id,
        ),
    ]
    container.transactions.add_many(txs)
    container.cube.upsert_transactions(txs)
    return {"comida": comida, "transporte": transporte}


def _query(client, queries, period=None):
    body = {"queries": queries}
    if period:
        body["period"] = period
    resp = client.post("/api/metrics/query", json=body)
    return resp


# --- catalog --------------------------------------------------------------
def test_catalog_lists_every_metric_with_its_declaration(client):
    resp = client.get("/api/metrics")
    assert resp.status_code == 200
    items = resp.get_json()["items"]

    by_id = {i["id"]: i for i in items}
    assert set(by_id) == {
        "spend_by_category",
        "tag_totals",
        "monthly_cash_flow",
        "accumulated_spend",
        "cash_withdrawn",
        "lifetime_flow",
        "investment_projection",
        "financial_advice",
    }
    for item in items:
        assert item["shape"] in {"scalar", "series", "breakdown", "table"}
        assert isinstance(item["requires"], list)
    # Every metric is a peso figure except the advisor, whose rows are
    # sentences: labelling that card "MXN" would name a currency for a widget
    # that has no headline amount.
    assert {i["unit"] for i in items if i["id"] != "financial_advice"} == {"MXN"}
    assert by_id["financial_advice"]["unit"] == "none"

    assert by_id["spend_by_category"]["shape"] == "breakdown"
    assert by_id["spend_by_category"]["requires"] == ["transactions"]
    assert by_id["accumulated_spend"]["cumulative"] is True

    # The computed metric publishes its params so the picker can build a form.
    params = {p["name"]: p for p in by_id["investment_projection"]["params"]}
    assert params["starting_balance"]["required"] is True
    assert params["months"]["default"] == "12"

    # `kind` stays private: a client that couples to it blocks the migration
    # from resolver to SQL.
    assert "kind" not in items[0]


# --- batching and failure isolation --------------------------------------
def test_batch_isolates_a_failing_query(client, seeded):
    resp = _query(
        client,
        [
            {"key": "w1", "metric": "spend_by_category"},
            {"key": "w2", "metric": "monthly_cash_flow"},
            {"key": "w3", "metric": "no_such_metric"},
        ],
    )
    assert resp.status_code == 200
    results = resp.get_json()["results"]
    assert set(results) == {"w1", "w2", "w3"}

    assert results["w1"]["metric"] == "spend_by_category"
    assert results["w2"]["metric"] == "monthly_cash_flow"
    assert results["w3"]["error"]["code"] == "unknown_metric"
    assert "error" not in results["w1"]


def test_disallowed_dimension_is_a_per_query_error(client, seeded):
    results = _query(
        client,
        [{"key": "a", "metric": "accumulated_spend", "dimensions": ["category"]}],
    ).get_json()["results"]
    assert results["a"]["error"]["code"] == "dimension_not_allowed"


def test_disallowed_filter_is_a_per_query_error(client, seeded):
    resp = _query(
        client,
        [{"key": "a", "metric": "spend_by_category", "filters": {"user_id": "someone-else"}}],
    )
    # Not a 500, and not a tenant switch either: `user_id` is simply not in the
    # filter vocabulary.
    assert resp.status_code == 200
    assert resp.get_json()["results"]["a"]["error"]["code"] == "filter_not_allowed"


def test_malformed_envelope_is_a_400(client):
    assert client.post("/api/metrics/query", json={}).status_code == 400
    assert (
        client.post("/api/metrics/query", json={"queries": [{"metric": "x"}]}).status_code == 400
    )


# --- aggregation arithmetic ----------------------------------------------
def test_spend_by_category_math_and_string_money(client, seeded):
    results = _query(client, [{"key": "k", "metric": "spend_by_category"}]).get_json()["results"]
    result = results["k"]

    assert result["shape"] == "breakdown"
    assert result["meta"]["currency"] == "MXN"
    assert result["meta"]["source_txn_count"] == 3  # 2 Comida + 1 Transporte

    rows = result["rows"]
    assert [r["category"] for r in rows] == ["Comida", "Transporte"]
    # Money is a string with fixed 2dp, never a float.
    assert rows[0]["expense_amount"] == "400.00"
    assert rows[1]["expense_amount"] == "250.00"
    assert all(isinstance(r["expense_amount"], str) for r in rows)
    assert result["value"] == "650.00"

    # The category id travels alongside the label so the client can drill in.
    assert rows[0]["category_id"] == str(seeded["comida"].id)


def test_income_is_excluded_from_spend(client, seeded):
    results = _query(client, [{"key": "k", "metric": "spend_by_category"}]).get_json()["results"]
    # The 5000 income row must not appear anywhere in a spend breakdown.
    assert "5000.00" not in [r["expense_amount"] for r in results["k"]["rows"]]


def test_period_narrows_the_result(client, seeded):
    results = _query(
        client,
        [{"key": "k", "metric": "spend_by_category"}],
        period={"start": "2024-02-01", "end": "2024-02-28"},
    ).get_json()["results"]
    assert [r["category"] for r in results["k"]["rows"]] == ["Transporte"]
    assert results["k"]["value"] == "250.00"


def test_monthly_cash_flow_series(client, seeded):
    results = _query(client, [{"key": "k", "metric": "monthly_cash_flow"}]).get_json()["results"]
    result = results["k"]

    assert result["shape"] == "series"
    assert [r["month"] for r in result["rows"]] == ["2024-01", "2024-02"]
    assert result["rows"][0] == {
        "month": "2024-01",
        "income_amount": "5000.00",
        "expense_amount": "400.00",
    }
    assert result["rows"][1]["income_amount"] == "0.00"
    # Two measures have no single headline number.
    assert result["value"] is None


def test_accumulated_spend_is_monotonically_non_decreasing(client, seeded):
    results = _query(client, [{"key": "k", "metric": "accumulated_spend"}]).get_json()["results"]
    rows = results["k"]["rows"]

    assert [r["month"] for r in rows] == ["2024-01", "2024-02"]
    values = [Decimal(r["expense_amount"]) for r in rows]
    assert values == [Decimal("400.00"), Decimal("650.00")]
    assert all(b >= a for a, b in zip(values, values[1:]))
    # The headline of a running sum is where it ended up, not the sum of it.
    assert results["k"]["value"] == "650.00"


def test_empty_result_reports_no_value_rather_than_zero(client):
    """A zero is a claim about someone's finances; absence of data is not."""
    results = _query(client, [{"key": "k", "metric": "spend_by_category"}]).get_json()["results"]
    assert results["k"]["rows"] == []
    assert results["k"]["value"] is None


def test_metrics_are_scoped_to_the_authenticated_user(app, client, seeded):
    """Another user's rows are in the same cube and must not be counted."""
    other = uuid4()
    app.extensions["container"].cube.upsert_transactions(
        [
            Transaction(
                user_id=other,
                tx_date=date(2024, 1, 9),
                amount=Decimal("99999"),
                raw_description="Ajeno",
                tx_type=TxType.EXPENSE,
            )
        ]
    )
    results = _query(client, [{"key": "k", "metric": "spend_by_category"}]).get_json()["results"]
    assert results["k"]["value"] == "650.00"


# --- computed metric ------------------------------------------------------
def test_investment_projection_compounds_monthly(client):
    results = _query(
        client,
        [
            {
                "key": "p",
                "metric": "investment_projection",
                "params": {
                    "starting_balance": 1000,
                    "annual_rate": 0.12,
                    "monthly_contribution": 0,
                    "months": 12,
                },
            }
        ],
    ).get_json()["results"]
    result = results["p"]

    assert result["shape"] == "series"
    assert len(result["rows"]) == 12
    assert result["rows"][0]["value"] == "1010.00"  # 1000 * 1.01

    # ForecastingService compounds at annual_rate/12 and rounds to cents each
    # step, so the closed form is approached rather than hit exactly.
    expected = Decimal(1000) * (Decimal("1.01") ** 12)
    assert abs(Decimal(result["value"]) - expected) < Decimal("0.05")
    # Not derived from transactions, so it makes no claim about a row count.
    assert result["meta"]["source_txn_count"] is None


def test_projection_rejects_an_undeclared_param(client):
    results = _query(
        client,
        [
            {
                "key": "p",
                "metric": "investment_projection",
                "params": {"starting_balance": 1000, "annual_rate": 0.1, "nonsense": 3},
            }
        ],
    ).get_json()["results"]
    assert results["p"]["error"]["code"] == "param_not_allowed"


def test_projection_requires_its_required_params(client):
    results = _query(
        client, [{"key": "p", "metric": "investment_projection", "params": {}}]
    ).get_json()["results"]
    assert results["p"]["error"]["code"] == "param_required"


def test_aggregation_metrics_take_no_params(client, seeded):
    results = _query(
        client,
        [{"key": "k", "metric": "spend_by_category", "params": {"starting_balance": 1}}],
    ).get_json()["results"]
    assert results["k"]["error"]["code"] == "param_not_allowed"


# --- the analytics endpoints stay untouched (deletion is a later phase) ---
def test_legacy_analytics_endpoints_still_work(client, seeded):
    summary = client.get("/api/analytics/summary")
    assert summary.status_code == 200
    assert summary.get_json()["total_expense"] == 650.0
    assert client.get("/api/analytics/spending-by-category").status_code == 200
    assert client.get("/api/analytics/monthly").status_code == 200
