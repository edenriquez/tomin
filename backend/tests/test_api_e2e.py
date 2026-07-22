def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_upload_cfdi_then_query(client, sample_cfdi_bytes):
    # Upload a SAT CFDI XML through the transient pipeline.
    resp = client.post(
        "/api/statements",
        data={"file": (sample_cfdi_bytes, "factura.xml")},
        content_type="multipart/form-data",
    )
    assert resp.status_code == 201, resp.get_data(as_text=True)
    body = resp.get_json()
    assert body["template"] == "sat_cfdi"
    assert body["transactions_created"] == 1

    # It should now be queryable via transactions.
    resp = client.get("/api/transactions")
    items = resp.get_json()["items"]
    assert len(items) == 1
    assert items[0]["description"] == "OXXO"
    assert items[0]["amount"] == 500.0

    # And aggregated in the cube summary.
    resp = client.get("/api/analytics/summary")
    summary = resp.get_json()
    assert summary["total_expense"] == 500.0
    assert summary["top_category"] is not None


def test_duplicate_upload_rejected(client, sample_cfdi_bytes):
    data = sample_cfdi_bytes.getvalue()
    import io

    first = client.post(
        "/api/statements",
        data={"file": (io.BytesIO(data), "factura.xml")},
        content_type="multipart/form-data",
    )
    assert first.status_code == 201
    second = client.post(
        "/api/statements",
        data={"file": (io.BytesIO(data), "factura.xml")},
        content_type="multipart/form-data",
    )
    assert second.status_code == 409


def test_goals_crud(client):
    created = client.post("/api/goals", json={"name": "Viaje a Cancun", "target_amount": 15000})
    assert created.status_code == 201
    goal_id = created.get_json()["id"]

    updated = client.patch(f"/api/goals/{goal_id}", json={"current_amount": 9750})
    assert updated.status_code == 200
    assert updated.get_json()["progress"] == 0.65

    listing = client.get("/api/goals").get_json()["items"]
    assert len(listing) == 1


def test_forecast_simulate(client):
    resp = client.post(
        "/api/forecast/simulate",
        json={
            "starting_net_worth": 1000,
            "monthly_income": 5000,
            "monthly_expenses": 3000,
            "monthly_savings": 3000,
            "months": 6,
        },
    )
    assert resp.status_code == 200
    points = resp.get_json()["points"]
    assert len(points) == 6
    assert points[-1]["optimized"] > points[-1]["baseline"]
