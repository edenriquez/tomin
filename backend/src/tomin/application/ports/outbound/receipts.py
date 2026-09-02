"""The seam between "someone read the ticket" and "the application stores it".

Two implementations ship, and the split is the same one the chat port makes:
the deterministic one always works, the model-backed one works better, and
nothing above this line knows which is wired.

* ``HeuristicReceiptReader`` — regexes over the OCR lines. No key, no network,
  no third party sees the basket.
* ``LlmReceiptReader`` — the configured model, which reads a mangled
  two-column thermal print far better than a regex can, and falls back to the
  heuristic whenever its answer does not survive checking.

Both are handed the *lines*, never an image: the photo stays on the phone
(docs/custody-plan.md G1/G2), and this port could not accept one if it wanted.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol, runtime_checkable

from ...dtos.receipts import ParsedReceipt


@runtime_checkable
class ReceiptReader(Protocol):
    """Turns OCR lines into a store, a date, a total and product lines."""

    def read(self, lines: Sequence[str]) -> ParsedReceipt:
        """Never raises for unreadable input.

        A ticket that yields nothing returns an empty :class:`ParsedReceipt`,
        because "I could not read this photo" is an answer the user can act on
        (retake it) and an exception here would lose the upload instead.
        """
        ...
