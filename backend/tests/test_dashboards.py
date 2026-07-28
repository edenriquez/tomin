"""The command center's persistence layer (docs/redesign-plan.md §7, B4).

The load-bearing property under test is that a layout can only hold widgets the
metric catalog can actually answer: validation at save, not a broken card at
render.
"""

from __future__ import annotations


def test_get_home_creates_a_starter_layout_on_first_read(client):
    resp = client.get("/api/dashboards/home")
    assert resp.status_code == 200
    body = resp.get_json()

    assert body["is_default"] is True
    assert [(w["metric_id"], w["size"]) for w in body["widgets"]] == [
        ("spend_by_category", "md"),
        ("monthly_cash_flow", "md"),
        ("accumulated_spend", "lg"),
    ]
    assert [w["position"] for w in body["widgets"]] == [0, 1, 2]


def test_get_home_is_idempotent(client):
    first = client.get("/api/dashboards/home").get_json()
    second = client.get("/api/dashboards/home").get_json()
    # Same dashboard, not a new one per read.
    assert first["id"] == second["id"]
    assert len(second["widgets"]) == 3


def test_put_then_get_round_trips(client):
    saved = client.put(
        "/api/dashboards/home",
        json={
            "widgets": [
                {"metric_id": "accumulated_spend", "size": "lg"},
                {
                    "metric_id": "investment_projection",
                    "size": "md",
                    "title_override": "Mi retiro",
                    "params": {"starting_balance": 1000, "annual_rate": 0.12, "months": 24},
                },
            ]
        },
    )
    assert saved.status_code == 200, saved.get_data(as_text=True)

    body = client.get("/api/dashboards/home").get_json()
    assert [w["metric_id"] for w in body["widgets"]] == [
        "accumulated_spend",
        "investment_projection",
    ]
    assert [w["position"] for w in body["widgets"]] == [0, 1]
    assert body["widgets"][1]["title_override"] == "Mi retiro"
    assert body["widgets"][1]["params"]["months"] == 24


def test_put_replaces_rather_than_appends(client):
    client.get("/api/dashboards/home")  # starter layout: 3 widgets
    client.put("/api/dashboards/home", json={"widgets": [{"metric_id": "monthly_cash_flow"}]})

    body = client.get("/api/dashboards/home").get_json()
    assert [w["metric_id"] for w in body["widgets"]] == ["monthly_cash_flow"]


def test_put_with_an_unknown_metric_is_rejected(client):
    client.put("/api/dashboards/home", json={"widgets": [{"metric_id": "monthly_cash_flow"}]})

    resp = client.put(
        "/api/dashboards/home",
        json={"widgets": [{"metric_id": "spend_by_category"}, {"metric_id": "no_such_metric"}]},
    )
    assert resp.status_code == 400
    assert "no_such_metric" in resp.get_json()["detail"]

    # Nothing was written, not even the valid first widget: the whole list is
    # validated before storage, so a rejected save leaves the layout intact.
    body = client.get("/api/dashboards/home").get_json()
    assert [w["metric_id"] for w in body["widgets"]] == ["monthly_cash_flow"]


def test_put_with_params_the_metric_does_not_declare_is_rejected(client):
    resp = client.put(
        "/api/dashboards/home",
        json={"widgets": [{"metric_id": "spend_by_category", "params": {"months": 12}}]},
    )
    assert resp.status_code == 400


def test_put_with_an_out_of_range_param_is_rejected(client):
    resp = client.put(
        "/api/dashboards/home",
        json={
            "widgets": [
                {
                    "metric_id": "investment_projection",
                    "params": {"starting_balance": 1000, "annual_rate": 0.1, "months": 5000},
                }
            ]
        },
    )
    assert resp.status_code == 400


def test_put_with_an_unknown_size_is_rejected(client):
    resp = client.put(
        "/api/dashboards/home",
        json={"widgets": [{"metric_id": "spend_by_category", "size": "enormous"}]},
    )
    assert resp.status_code == 400


def test_put_rejects_a_malformed_body(client):
    assert client.put("/api/dashboards/home", json={}).status_code == 400
    assert client.put("/api/dashboards/home", json={"widgets": ["nope"]}).status_code == 400


def test_an_empty_layout_is_allowed(client):
    """Removing every widget is a legitimate state, not a validation failure."""
    client.get("/api/dashboards/home")
    assert client.put("/api/dashboards/home", json={"widgets": []}).status_code == 200
    assert client.get("/api/dashboards/home").get_json()["widgets"] == []


def test_saved_widgets_are_queryable(client):
    """The point of validating at save: every stored widget can be run."""
    client.put(
        "/api/dashboards/home",
        json={
            "widgets": [
                {"metric_id": "spend_by_category"},
                {
                    "metric_id": "investment_projection",
                    "params": {"starting_balance": 500, "annual_rate": 0.05, "months": 6},
                },
            ]
        },
    )
    widgets = client.get("/api/dashboards/home").get_json()["widgets"]

    results = client.post(
        "/api/metrics/query",
        json={
            "queries": [
                {"key": w["id"], "metric": w["metric_id"], "params": w["params"]}
                for w in widgets
            ]
        },
    ).get_json()["results"]

    assert len(results) == 2
    assert all("error" not in r for r in results.values())
