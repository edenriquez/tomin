"""Photographed tickets: reading them, and attaching them to the right movement.

Two things are worth guarding here and the second is the important one.

The reader is a pile of regexes over OCR output, so it gets fixtures shaped
like real Mexican tickets — a barcode before the name, the quantity on its own
line, a tax flag after the price — and the assertions are as much about what it
*refuses* (TOTAL, CAMBIO, a row of digits) as about what it finds.

The matcher decides which movement a basket belongs to, and a wrong answer
there is invisible and permanent: the receipt looks attached, the prices are
filed under the wrong day, and nothing ever says so. So the tests that matter
are the ones where it must **decline** — no total, an ambiguous pair, a
movement that already has a ticket.
"""

from __future__ import annotations

import base64
import hashlib
import json
from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from nacl.public import Box, PrivateKey, PublicKey
from nacl.utils import random as random_bytes

from tomin.domain.entities import Transaction
from tomin.domain.services.receipt_reading import read_receipt
from tomin.domain.value_objects.enums import TxType

DEV_USER = UUID("00000000-0000-0000-0000-000000000001")

SORIANA = [
    "SORIANA HIPER",
    "SUCURSAL MIXCOAC",
    "RFC SOR810511HN9",
    "FECHA 22/08/2026 HORA 19:42",
    "7501020510010 LECHE LALA ENT 1L 28.50 T",
    "COCA COLA 600ML",
    "2 X 20.00 40.00 T",
    "JIT SALADETTE",
    "0.850 KG X 32.00 27.20 T",
    "PAN BIMBO GRANDE 45.90 T",
    "SUBTOTAL 141.60",
    "IVA 0.00",
    "TOTAL 141.60",
    "EFECTIVO 200.00",
    "CAMBIO 58.40",
    "GRACIAS POR SU COMPRA",
]


# --- the reader ----------------------------------------------------------
def test_reads_store_date_total_and_items():
    parsed = read_receipt(SORIANA)
    assert parsed.store == "Soriana"
    assert parsed.purchased_at == date(2026, 8, 22)
    assert parsed.total == Decimal("141.60")
    assert [i.description for i in parsed.items] == [
        "LECHE LALA ENT 1L",
        "COCA COLA 600ML",
        "JIT SALADETTE",
        "PAN BIMBO GRANDE",
    ]
    # The basket adds up to the printed total: the property the LLM reader is
    # scored on, and the one that says nothing was dropped or invented.
    assert sum(i.amount for i in parsed.items) == parsed.total


def test_quantity_line_belongs_to_the_product_above_it():
    """``COCA COLA 600ML`` / ``2 X 20.00 40.00`` is one item, not two."""
    coca = next(i for i in read_receipt(SORIANA).items if "COCA" in i.description)
    assert coca.quantity == Decimal("2")
    assert coca.unit_price == Decimal("20.00")
    assert coca.amount == Decimal("40.00")
    # The evidence keeps both printed lines.
    assert "COCA COLA 600ML" in coca.raw_text and "2 X 20.00" in coca.raw_text


def test_weight_bought_is_a_quantity_not_a_size():
    jitomate = next(i for i in read_receipt(SORIANA).items if "JIT" in i.description)
    assert jitomate.quantity == Decimal("0.850")
    assert jitomate.unit_price == Decimal("32.00")


def test_the_ticket_talking_about_itself_is_never_a_product():
    descriptions = " ".join(i.description for i in read_receipt(SORIANA).items).lower()
    for word in ("total", "iva", "efectivo", "cambio", "gracias"):
        assert word not in descriptions


def test_a_row_of_numbers_is_dropped_rather_than_guessed_at():
    """A fiscal code ending in money looks exactly like a product line."""
    parsed = read_receipt(["OXXO", "AUT 004512 55.00", "0000 1234 5678 99.00", "TOTAL 55.00"])
    assert parsed.items == []


def test_an_unreadable_photo_returns_an_empty_receipt_not_an_error():
    parsed = read_receipt(["", "   ", "|||"])
    assert parsed.items == []
    assert parsed.total is None


# --- ingest, end to end over the sealed envelope --------------------------
def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def _seal(client, payload: dict) -> dict:
    key = client.get("/api/ingest/key").get_json()
    ephemeral = PrivateKey.generate()
    nonce = random_bytes(Box.NONCE_SIZE)
    box = Box(ephemeral, PublicKey(base64.b64decode(key["public_key"])))
    sealed = box.encrypt(json.dumps(payload).encode("utf-8"), nonce)
    return {
        "v": 1,
        "key_id": key["key_id"],
        "epk": _b64(bytes(ephemeral.public_key)),
        "nonce": _b64(nonce),
        "box": _b64(sealed.ciphertext),
    }


def _payload(lines=None, *, photo: bytes = b"the photo that stayed home", **extra) -> dict:
    return {
        "v": 1,
        "kind": "receipt",
        "filename": "ticket.jpg",
        # Over the ORIGINAL image, which the server never sees.
        "content_sha256": hashlib.sha256(photo).hexdigest(),
        "lines": list(SORIANA if lines is None else lines),
        "captured_at": "2026-08-22T19:45:00Z",
        "extractor": "mlkit-ios",
        **extra,
    }


def _send(client, payload: dict):
    return client.post("/api/ingest/receipt", json=_seal(client, payload))


def _expense(container, *, amount: str, day: int, description: str) -> Transaction:
    tx = Transaction(
        user_id=DEV_USER,
        tx_date=date(2026, 8, day),
        amount=Decimal(amount),
        raw_description=description,
        tx_type=TxType.EXPENSE,
    )
    container.transactions.add_many([tx])
    return tx


@pytest.fixture
def container(app):
    return app.extensions["container"]


def test_sealed_receipt_becomes_a_basket_of_products(client):
    resp = _send(client, _payload())
    assert resp.status_code == 201, resp.get_data(as_text=True)
    body = resp.get_json()
    receipt = body["receipt"]
    assert receipt["store"] == "Soriana"
    assert receipt["purchased_at"] == "2026-08-22"
    assert receipt["total"] == 141.60
    assert receipt["items_total"] == 141.60
    assert len(receipt["items"]) == 4
    # The photo never travelled, so provenance is all the server can say about it.
    assert receipt["extractor"] == "mlkit-ios"
    assert receipt["reader"] == "heuristic"


def test_the_same_photo_twice_is_the_same_event(client):
    assert _send(client, _payload()).status_code == 201
    assert _send(client, _payload()).status_code == 409


def test_a_matching_movement_is_attached_automatically(client, container):
    tx = _expense(container, amount="141.60", day=22, description="SORIANA HIPER 4062")
    body = _send(client, _payload()).get_json()
    assert body["attached"] is True
    assert body["receipt"]["transaction_id"] == str(tx.id)
    assert body["receipt"]["match_source"] == "auto"
    assert body["suggestions"] == []


def test_two_identical_charges_are_a_question_not_a_coin_flip(client, container):
    _expense(container, amount="141.60", day=22, description="COMPRA TIENDA A")
    _expense(container, amount="141.60", day=22, description="COMPRA TIENDA B")
    body = _send(client, _payload()).get_json()
    assert body["attached"] is False
    assert body["receipt"]["transaction_id"] is None
    # Both are offered, each with the reason it scored.
    assert len(body["suggestions"]) == 2
    assert all(s["reason"] for s in body["suggestions"])


def test_a_different_amount_is_a_different_purchase(client, container):
    _expense(container, amount="980.00", day=22, description="SORIANA HIPER 4062")
    body = _send(client, _payload()).get_json()
    assert body["attached"] is False
    assert body["suggestions"] == []


def test_a_ticket_with_no_readable_total_never_attaches(client, container):
    _expense(container, amount="141.60", day=22, description="SORIANA HIPER 4062")
    lines = [line for line in SORIANA if "TOTAL" not in line]
    body = _send(client, _payload(lines)).get_json()
    assert body["attached"] is False
    assert body["suggestions"] == []


def test_the_phone_can_name_the_movement_itself(client, container):
    tx = _expense(container, amount="141.60", day=22, description="COMPRA TIENDA A")
    _expense(container, amount="141.60", day=22, description="COMPRA TIENDA B")
    body = _send(client, _payload(transaction_id=str(tx.id))).get_json()
    assert body["receipt"]["transaction_id"] == str(tx.id)
    # A person answered, so no later automatic pass may overturn it.
    assert body["receipt"]["match_source"] == "user"


def test_a_movement_carries_at_most_one_ticket(client, container):
    tx = _expense(container, amount="141.60", day=22, description="SORIANA HIPER 4062")
    assert _send(client, _payload()).status_code == 201
    second = _send(client, _payload(photo=b"another angle", transaction_id=str(tx.id)))
    assert second.status_code == 409


def test_someone_elses_movement_is_reported_as_missing(client):
    resp = _send(client, _payload(transaction_id=str(uuid4())))
    assert resp.status_code == 404


# --- the rest of the lifecycle -------------------------------------------
def test_attach_and_detach_by_hand(client, container):
    tx = _expense(container, amount="141.60", day=22, description="COMPRA TIENDA A")
    _expense(container, amount="141.60", day=22, description="COMPRA TIENDA B")
    receipt_id = _send(client, _payload()).get_json()["receipt_id"]

    attached = client.patch(
        f"/api/receipts/{receipt_id}", json={"transaction_id": str(tx.id)}
    ).get_json()
    assert attached["transaction_id"] == str(tx.id)
    assert attached["match_source"] == "user"

    detached = client.patch(
        f"/api/receipts/{receipt_id}", json={"transaction_id": None}
    ).get_json()
    assert detached["transaction_id"] is None


def test_attaching_without_saying_to_what_is_a_bad_request(client):
    receipt_id = _send(client, _payload()).get_json()["receipt_id"]
    assert client.patch(f"/api/receipts/{receipt_id}", json={}).status_code == 400


def test_a_movement_reports_its_ticket_and_its_absence(client, container):
    tx = _expense(container, amount="141.60", day=22, description="SORIANA HIPER 4062")
    other = _expense(container, amount="12.00", day=1, description="OXXO")
    _send(client, _payload())

    found = client.get(f"/api/receipts/for-transaction/{tx.id}").get_json()
    assert found["receipt"]["store"] == "Soriana"
    # No ticket is the ordinary state of almost every row, not an error.
    empty = client.get(f"/api/receipts/for-transaction/{other.id}").get_json()
    assert empty["receipt"] is None


def test_deleting_a_statement_keeps_the_ticket_and_drops_the_link(client, container):
    """The ticket is the user's document; the statement explained a charge."""
    from tomin.domain.entities import Statement
    from tomin.domain.value_objects.enums import SourceType, StatementStatus

    statement = Statement(
        user_id=DEV_USER,
        source_type=SourceType.BANK_PDF,
        status=StatementStatus.PROCESSED,
    )
    container.statements.add(statement)
    tx = Transaction(
        user_id=DEV_USER,
        statement_id=statement.id,
        tx_date=date(2026, 8, 22),
        amount=Decimal("141.60"),
        raw_description="SORIANA HIPER 4062",
        tx_type=TxType.EXPENSE,
    )
    container.transactions.add_many([tx])
    receipt_id = _send(client, _payload()).get_json()["receipt_id"]

    assert client.delete(f"/api/statements/{statement.id}").status_code == 200

    receipt = client.get(f"/api/receipts/{receipt_id}").get_json()
    assert receipt["transaction_id"] is None
    assert len(receipt["items"]) == 4


def test_deleting_a_receipt_takes_its_items_with_it(client):
    receipt_id = _send(client, _payload()).get_json()["receipt_id"]
    assert client.delete(f"/api/receipts/{receipt_id}").status_code == 200
    assert client.get(f"/api/receipts/{receipt_id}").status_code == 404
    assert client.get("/api/receipts").get_json()["total"] == 0


# --- the model-backed reader ---------------------------------------------
class ScriptedChat:
    """A ChatPort that returns one canned answer. Never touches the network."""

    available = True
    model_label = "fake/model"

    def __init__(self, answer: str) -> None:
        self._answer = answer

    def stream(self, *, system, messages):
        yield self._answer


def _llm(answer: str):
    from tomin.adapters.outbound.receipts import LlmReceiptReader

    return LlmReceiptReader(ScriptedChat(answer))


def test_a_model_read_that_adds_up_wins():
    """The heuristic drops the two-line item; a better read replaces it."""
    answer = json.dumps(
        {
            "store": "SORIANA HIPER",
            "purchased_at": "2026-08-22",
            "total": "141.60",
            "items": [
                {"line_no": 4, "description": "LECHE LALA ENT 1L", "amount": "28.50"},
                {"line_no": 5, "description": "COCA COLA 600ML", "amount": "40.00",
                 "quantity": "2", "unit_price": "20.00"},
                {"line_no": 7, "description": "JITOMATE SALADETTE", "amount": "27.20"},
                {"line_no": 9, "description": "PAN BIMBO GRANDE", "amount": "45.90"},
            ],
        }
    )
    parsed = _llm(answer).read(SORIANA)
    assert parsed.reader == "llm:fake/model"
    assert [i.description for i in parsed.items][2] == "JITOMATE SALADETTE"
    # The evidence stays the OCR line, not the model's paraphrase of it.
    assert parsed.items[2].raw_text == "JIT SALADETTE"


def test_a_model_read_that_does_not_add_up_loses_to_the_regexes():
    """Two items missing is a worse read, however confident the prose."""
    answer = json.dumps(
        {
            "store": "SORIANA",
            "total": "141.60",
            "items": [{"line_no": 4, "description": "LECHE LALA ENT 1L", "amount": "28.50"}],
        }
    )
    parsed = _llm(answer).read(SORIANA)
    assert parsed.reader == "heuristic"
    assert len(parsed.items) == 4


def test_an_answer_that_is_not_json_is_not_an_error():
    parsed = _llm("Claro, aquí está tu ticket: leche, coca…").read(SORIANA)
    assert parsed.reader == "heuristic"
    assert len(parsed.items) == 4


def test_an_empty_basket_never_wins():
    """A model that returned nothing failed to read; it did not prove emptiness."""
    parsed = _llm(json.dumps({"store": None, "total": None, "items": []})).read(SORIANA)
    assert len(parsed.items) == 4


def test_the_model_is_asked_with_numbered_lines():
    """`line_no` is only answerable if the prompt says which line is which."""
    chat = ScriptedChat("{}")
    sent = []

    def stream(*, system, messages):
        sent.extend(messages)
        yield "{}"

    chat.stream = stream
    from tomin.adapters.outbound.receipts import LlmReceiptReader

    LlmReceiptReader(chat).read(SORIANA)
    assert "4: 7501020510010 LECHE LALA ENT 1L 28.50 T" in sent[0].content
