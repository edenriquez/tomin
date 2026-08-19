"""The one seam an LLM may reach the product through.

Everything else in Tomin is deterministic by design -- a closed metric catalog,
a rule engine that returns a dormant principle rather than a guess. A chat
answer is the first thing here that cannot be reproduced from the data alone,
so it gets a narrow port with a null implementation, and every caller is written
against the possibility that no model is configured at all.

Deliberately provider-agnostic. The adapter speaks OpenAI-shaped Chat
Completions against a configurable base URL, which is the lingua franca of every
gateway worth pointing at -- OpenRouter, Groq, Together, a local Ollama. Nothing
above this line names a vendor, and swapping one is three environment variables.
"""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

Role = Literal["user", "assistant"]


@dataclass(frozen=True)
class ChatMessage:
    """One turn. The system prompt is passed separately, never as a message."""

    role: Role
    content: str


class ChatPort(Protocol):
    """Streams an answer, token by token.

    Streaming is not decoration: a grounded answer over six months of movements
    takes seconds, and a request that returns all at once both risks the HTTP
    timeout and shows the user a blank panel while it thinks.
    """

    @property
    def available(self) -> bool:
        """False when no model is configured.

        Callers branch on this rather than catching an exception, because
        "the owner has not set a key" is a normal state of a fresh clone and
        must render as a disabled panel, not an error.
        """
        ...

    @property
    def model_label(self) -> str:
        """What to name in the UI's disclosure. The user is entitled to know
        which third party their movements are about to be described to."""
        ...

    def stream(self, *, system: str, messages: Sequence[ChatMessage]) -> Iterator[str]:
        """Yield answer fragments in order. Raises :class:`ChatUnavailable`."""
        ...


class ChatUnavailable(RuntimeError):
    """The configured provider could not be reached, or refused the request.

    Distinct from "not configured": this one is worth showing the user as a
    failure, because they did set it up and it did not work.
    """
