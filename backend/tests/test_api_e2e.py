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


def test_list_and_delete_statement(client, sample_cfdi_bytes):
    created = client.post(
        "/api/statements",
        data={"file": (sample_cfdi_bytes, "factura.xml")},
        content_type="multipart/form-data",
    )
    assert created.status_code == 201
    statement_id = created.get_json()["statement_id"]

    listing = client.get("/api/statements").get_json()
    assert listing["total"] == 1
    assert listing["items"][0]["id"] == statement_id
    assert listing["items"][0]["status"] == "processed"

    deleted = client.delete(f"/api/statements/{statement_id}")
    assert deleted.status_code == 200, deleted.get_data(as_text=True)
    assert deleted.get_json()["transactions_deleted"] == 1

    # The statement, its transactions, and its cube rows are all gone.
    assert client.get("/api/statements").get_json()["total"] == 0
    assert client.get("/api/transactions").get_json()["items"] == []
    assert client.get("/api/analytics/summary").get_json()["total_expense"] == 0.0


def test_delete_unknown_statement_returns_404(client):
    resp = client.delete("/api/statements/2b1f9a3c-0000-4000-8000-000000000000")
    assert resp.status_code == 404


def test_delete_statement_frees_the_duplicate_hash(client, sample_cfdi_bytes):
    data = sample_cfdi_bytes.getvalue()
    import io

    first = client.post(
        "/api/statements",
        data={"file": (io.BytesIO(data), "factura.xml")},
        content_type="multipart/form-data",
    )
    client.delete(f"/api/statements/{first.get_json()['statement_id']}")

    # Deleting removes the stored hash, so the same file can be re-uploaded.
    again = client.post(
        "/api/statements",
        data={"file": (io.BytesIO(data), "factura.xml")},
        content_type="multipart/form-data",
    )
    assert again.status_code == 201


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
