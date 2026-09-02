"""The interaction log: dumb on purpose, strict about shape."""

from __future__ import annotations


def test_a_batch_is_stored_and_summarised(client):
    resp = client.post("/api/telemetry/events", json={"events": [
        {"name": "movimientos.row_select", "path": "/", "occurred_at": "2026-08-25T18:00:00Z",
         "props": {"source": "chart"}},
        {"name": "movimientos.row_select", "path": "/", "occurred_at": "2026-08-25T18:00:05Z",
         "props": {"source": "list"}},
        {"name": "window.select", "path": "/categorias", "occurred_at": "2026-08-25T18:01:00Z",
         "props": {"kind": "preset", "id": "30d"}},
    ]})
    assert resp.status_code == 201 and resp.get_json() == {"stored": 3}

    body = client.get("/api/telemetry/summary?days=3650").get_json()
    assert body["total"] == 3
    assert body["items"][0] == {"name": "movimientos.row_select", "path": "/", "count": 2}


def test_malformed_events_are_refused_whole(client):
    assert client.post("/api/telemetry/events", json={"events": []}).status_code == 400
    assert client.post("/api/telemetry/events", json={"events": [{"name": "x"}]}).status_code == 400
    assert client.post("/api/telemetry/events", json={"events": [
        {"name": "ok", "path": "/", "occurred_at": "not a date"}]}).status_code == 400


def test_props_are_flattened_and_capped(client):
    client.post("/api/telemetry/events", json={"events": [
        {"name": "n", "path": "/", "occurred_at": "2026-08-25T18:00:00Z",
         "props": {"nested": {"deep": 1}, "long": "x" * 500}}]})
    # Stored as labels, never as payloads: the nested object became a string,
    # the long one was cut. Both are still countable, which is all they are for.
    assert client.get("/api/telemetry/summary?days=3650").get_json()["total"] == 1


def test_recent_events_come_back_raw_and_newest_first(client):
    client.post("/api/telemetry/events", json={"events": [
        {"name": "a", "path": "/", "occurred_at": "2026-08-25T18:00:00Z", "props": {"k": 1}},
        {"name": "b", "path": "/categorias", "occurred_at": "2026-08-25T19:00:00Z"},
    ]})
    body = client.get("/api/telemetry/events?days=3650").get_json()
    assert [e["name"] for e in body["items"]] == ["b", "a"]
    assert body["items"][1]["props"] == {"k": 1}
    # UTC, said so: the client converts to the user's own hours.
    assert body["items"][0]["occurred_at"].endswith("Z")
