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


def test_upload_response_carries_the_full_statement(client, sample_cfdi_bytes):
    """The onboarding review step reads bank/period straight off the 201."""
    created = client.post(
        "/api/statements",
        data={"file": (sample_cfdi_bytes, "factura.xml")},
        content_type="multipart/form-data",
    )
    body = created.get_json()
    statement = body["statement"]
    assert statement["id"] == body["statement_id"]
    assert statement["status"] == "processed"
    assert statement["source_type"] == "sat_xml"
    assert "bank" in statement and "period_start" in statement
    assert statement["account_kind"] is None


def test_label_statement_account_kind(client, sample_cfdi_bytes):
    created = client.post(
        "/api/statements",
        data={"file": (sample_cfdi_bytes, "factura.xml")},
        content_type="multipart/form-data",
    )
    statement_id = created.get_json()["statement_id"]

    # Fresh statements are unlabelled — an honest unknown, not a default.
    assert client.get("/api/statements").get_json()["items"][0]["account_kind"] is None

    # Label it, and the label round-trips through the listing.
    patched = client.patch(f"/api/statements/{statement_id}", json={"account_kind": "credit"})
    assert patched.status_code == 200, patched.get_data(as_text=True)
    assert patched.get_json()["account_kind"] == "credit"
    assert client.get("/api/statements").get_json()["items"][0]["account_kind"] == "credit"

    # Explicit null clears it.
    cleared = client.patch(f"/api/statements/{statement_id}", json={"account_kind": None})
    assert cleared.status_code == 200
    assert cleared.get_json()["account_kind"] is None

    # Garbage is rejected with the valid vocabulary, and an empty body is a
    # 400 rather than a silent no-op.
    assert (
        client.patch(f"/api/statements/{statement_id}", json={"account_kind": "bitcoin"}).status_code
        == 400
    )
    assert client.patch(f"/api/statements/{statement_id}", json={}).status_code == 400


def test_correct_statement_bank(client, sample_cfdi_bytes):
    """The generic template stores no bank; the user can name it after review."""
    created = client.post(
        "/api/statements",
        data={"file": (sample_cfdi_bytes, "factura.xml")},
        content_type="multipart/form-data",
    )
    statement_id = created.get_json()["statement_id"]

    # Bank alone, kind alone, or both — each field is independently optional.
    patched = client.patch(f"/api/statements/{statement_id}", json={"bank": "  BBVA  "})
    assert patched.status_code == 200, patched.get_data(as_text=True)
    assert patched.get_json()["bank"] == "BBVA"  # trimmed

    both = client.patch(
        f"/api/statements/{statement_id}",
        json={"bank": "Banorte", "account_kind": "payroll"},
    )
    assert both.get_json()["bank"] == "Banorte"
    assert both.get_json()["account_kind"] == "payroll"

    # Patching one field leaves the other alone.
    kind_only = client.patch(f"/api/statements/{statement_id}", json={"account_kind": "debit"})
    assert kind_only.get_json()["bank"] == "Banorte"

    # Explicit null clears; whitespace and unknown fields are rejected.
    cleared = client.patch(f"/api/statements/{statement_id}", json={"bank": None})
    assert cleared.get_json()["bank"] is None
    assert cleared.get_json()["account_kind"] == "debit"
    assert client.patch(f"/api/statements/{statement_id}", json={"bank": "   "}).status_code == 400
    assert (
        client.patch(f"/api/statements/{statement_id}", json={"periodo": "2026"}).status_code
        == 400
    )


def test_label_unknown_statement_returns_404(client):
    resp = client.patch(
        "/api/statements/2b1f9a3c-0000-4000-8000-000000000000",
        json={"account_kind": "credit"},
    )
    assert resp.status_code == 404


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


def test_categories_catalog(client):
    """The taxonomy the transaction editor renders: names and colors."""
    items = client.get("/api/categories").get_json()["items"]
    names = {c["name"] for c in items}
    assert "Sin Categoria" in names
    assert len(items) >= 5
    # Every category carries the fields the UI colors charts with.
    assert all({"id", "name", "color", "icon"} <= set(c) for c in items)
    # The matcher's internal vocabulary is not exposed.
    assert all("categorization_labels" not in c for c in items)


def _category_id(client, name):
    items = client.get("/api/categories").get_json()["items"]
    return next(c["id"] for c in items if c["name"] == name)


def test_recategorize_applies_learns_and_respects_human_edits(client, sample_cfdi_bytes):
    client.post(
        "/api/statements",
        data={"file": (sample_cfdi_bytes, "factura.xml")},
        content_type="multipart/form-data",
    )
    tx = client.get("/api/transactions").get_json()["items"][0]
    assert tx["category_source"] == "auto"
    target = _category_id(client, "Entretenimiento")
    assert tx["category_id"] != target

    # Dry run reports the blast radius and writes nothing.
    preview = client.post(
        "/api/transactions/recategorize",
        json={"category_id": target, "label": "OXXO", "dry_run": True},
    ).get_json()
    assert preview == {"matched": 1, "updated": 0, "label": "oxxo"}
    assert client.get("/api/transactions").get_json()["items"][0]["category_id"] != target

    # The real run applies, and the row stays machine-owned ("auto").
    applied = client.post(
        "/api/transactions/recategorize",
        json={"category_id": target, "label": "OXXO"},
    ).get_json()
    assert applied["updated"] == 1
    after = client.get("/api/transactions").get_json()["items"][0]
    assert after["category_id"] == target
    assert after["category_source"] == "auto"

    # A human edit is sacred: flip the row to user-sourced, then try to
    # recategorize it elsewhere — it must not move.
    other = _category_id(client, "Transporte")
    client.patch(f"/api/transactions/{after['id']}", json={"category_id": other})
    again = client.post(
        "/api/transactions/recategorize",
        json={"category_id": target, "label": "OXXO"},
    ).get_json()
    assert again["updated"] == 0
    assert (
        client.get("/api/transactions").get_json()["items"][0]["category_id"] == other
    )


def test_recategorize_label_learned_for_future_uploads(client):
    """The point is the NEXT statement: taught vocabulary categorizes it."""
    target = _category_id(client, "Entretenimiento")
    # Teach a label before any matching transaction exists.
    taught = client.post(
        "/api/transactions/recategorize",
        json={"category_id": target, "label": "Cinepolis Plaza"},
    ).get_json()
    assert taught == {"matched": 0, "updated": 0, "label": "cinepolis plaza"}

    xml = (
        '<?xml version="1.0"?>'
        '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" '
        'Total="180.00" Fecha="2024-03-01T20:00:00" TipoDeComprobante="I">'
        '<cfdi:Emisor Nombre="CINEPOLIS PLAZA CENTRO" Rfc="CIN999999"/>'
        "</cfdi:Comprobante>"
    )
    import io as _io

    client.post(
        "/api/statements",
        data={"file": (_io.BytesIO(xml.encode()), "cine.xml")},
        content_type="multipart/form-data",
    )
    tx = client.get("/api/transactions").get_json()["items"][0]
    assert tx["category_id"] == target
    assert tx["category_source"] == "auto"


def test_realias_renames_learns_and_respects_hand_edits(client, sample_cfdi_bytes):
    client.post(
        "/api/statements",
        data={"file": (sample_cfdi_bytes, "factura.xml")},
        content_type="multipart/form-data",
    )
    tx = client.get("/api/transactions").get_json()["items"][0]
    assert "OXXO" in tx["raw_description"]

    # Dry run reports the blast radius and writes nothing.
    preview = client.post(
        "/api/transactions/realias",
        json={"label": "OXXO", "alias": "Tiendita de la esquina", "dry_run": True},
    ).get_json()
    assert preview == {"matched": 1, "updated": 0, "label": "oxxo"}
    assert (
        client.get("/api/transactions").get_json()["items"][0]["description"]
        == tx["description"]
    )

    # Real run renames; raw_description survives untouched.
    applied = client.post(
        "/api/transactions/realias",
        json={"label": "OXXO", "alias": "Tiendita de la esquina"},
    ).get_json()
    assert applied["updated"] == 1
    after = client.get("/api/transactions").get_json()["items"][0]
    assert after["description"] == "Tiendita de la esquina"
    assert after["raw_description"] == tx["raw_description"]

    # Re-teaching the same label replaces the previous alias on those rows...
    replaced = client.post(
        "/api/transactions/realias", json={"label": "OXXO", "alias": "Súper de la esquina"}
    ).get_json()
    assert replaced["updated"] == 1
    assert (
        client.get("/api/transactions").get_json()["items"][0]["description"]
        == "Súper de la esquina"
    )

    # ...but a name the user typed by hand on a row is never steamrolled.
    client.patch(f"/api/transactions/{after['id']}", json={"description": "Mi nombre"})
    third = client.post(
        "/api/transactions/realias", json={"label": "OXXO", "alias": "Otra cosa"}
    ).get_json()
    assert third["updated"] == 0
    assert (
        client.get("/api/transactions").get_json()["items"][0]["description"]
        == "Mi nombre"
    )


def test_realias_learned_for_future_uploads(client):
    """Teach the alias first; the next statement arrives already readable."""
    taught = client.post(
        "/api/transactions/realias",
        json={"label": "SUPERLECLERC", "alias": "Súper cerca de casa"},
    ).get_json()
    assert taught == {"matched": 0, "updated": 0, "label": "superleclerc"}

    xml = (
        '<?xml version="1.0"?>'
        '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" '
        'Total="420.00" Fecha="2024-03-05T18:00:00" TipoDeComprobante="I">'
        '<cfdi:Emisor Nombre="POCK*SUPERLECLERC MX" Rfc="SLE999999"/>'
        "</cfdi:Comprobante>"
    )
    import io as _io

    client.post(
        "/api/statements",
        data={"file": (_io.BytesIO(xml.encode()), "super.xml")},
        content_type="multipart/form-data",
    )
    tx = client.get("/api/transactions").get_json()["items"][0]
    assert tx["description"] == "Súper cerca de casa"
    assert "SUPERLECLERC" in tx["raw_description"]


def test_realias_rejects_bad_input(client):
    assert (
        client.post(
            "/api/transactions/realias", json={"label": "ab", "alias": "X"}
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/transactions/realias", json={"label": "oxxo", "alias": "   "}
        ).status_code
        == 400
    )
    assert client.post("/api/transactions/realias", json={"label": "oxxo"}).status_code == 400


def test_taught_alias_names_the_recurring_series(client):
    """Teach an alias, upload rhythmic charges, and the Recurrentes endpoint
    reports one series under the user's name for it."""
    client.post(
        "/api/transactions/realias",
        json={"label": "CABLEYCOMUN", "alias": "Cable e Internet"},
    )
    import io as _io

    for i, day in enumerate(("2024-01-06", "2024-02-06", "2024-03-06")):
        xml = (
            '<?xml version="1.0"?>'
            '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" '
            f'Total="389.00" Fecha="{day}T09:00:00" TipoDeComprobante="I">'
            f'<cfdi:Emisor Nombre="PAYPAL *CABLEYCOMUN OPM {i}50323DI1MX" Rfc="CYC999999"/>'
            "</cfdi:Comprobante>"
        )
        client.post(
            "/api/statements",
            data={"file": (_io.BytesIO(xml.encode()), f"cable{i}.xml")},
            content_type="multipart/form-data",
        )

    items = client.get("/api/analytics/recurring").get_json()["items"]
    assert len(items) == 1
    assert items[0]["key"] == "alias:cableycomun"
    assert items[0]["label"] == "Cable e Internet"
    assert items[0]["frequency"] == "monthly"
    assert items[0]["occurrences"] == 3


def test_statement_filter_scopes_transactions_metrics_and_recurring(client):
    """The bank filter's seam: everything scopes by source statement id."""
    import io as _io

    ids = []
    for i, (name, total) in enumerate([("OXXO", "100.00"), ("SORIANA", "250.00")]):
        xml = (
            '<?xml version="1.0"?>'
            '<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" '
            f'Total="{total}" Fecha="2024-02-1{i}T09:00:00" TipoDeComprobante="I">'
            f'<cfdi:Emisor Nombre="{name}" Rfc="XAXX99999{i}"/>'
            "</cfdi:Comprobante>"
        )
        res = client.post(
            "/api/statements",
            data={"file": (_io.BytesIO(xml.encode()), f"f{i}.xml")},
            content_type="multipart/form-data",
        )
        ids.append(res.get_json()["statement_id"])

    # Transactions: scoped to the first statement only.
    page = client.get(f"/api/transactions?statement_id={ids[0]}").get_json()
    assert page["total"] == 1
    assert page["items"][0]["statement_id"] == ids[0]

    # Metrics: the statement filter reaches the cube.
    body = {
        "period": {"start": "2024-01-01", "end": "2024-12-31"},
        "queries": [
            {"key": "k", "metric": "spend_by_category", "filters": {"statement": [ids[1]]}}
        ],
    }
    result = client.post("/api/metrics/query", json=body).get_json()["results"]["k"]
    assert result["value"] == "250.00"
    assert result["meta"]["source_txn_count"] == 1

    # Recurring accepts the same scope (empty here, but the param must parse).
    assert (
        client.get(f"/api/analytics/recurring?statement_id={ids[0]}").status_code == 200
    )


def test_recategorize_rejects_bad_input(client):
    target_missing = client.post(
        "/api/transactions/recategorize",
        json={"category_id": "2b1f9a3c-0000-4000-8000-000000000000", "label": "oxxo"},
    )
    assert target_missing.status_code == 400

    real = _category_id(client, "Transporte")
    too_short = client.post(
        "/api/transactions/recategorize", json={"category_id": real, "label": "a"}
    )
    assert too_short.status_code == 400
    assert (
        client.post("/api/transactions/recategorize", json={"label": "oxxo"}).status_code
        == 400
    )


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
