"""Chat over the OpenAI-shaped Completions protocol, against any base URL.

One adapter covers OpenRouter, Groq, Together, DeepSeek, LM Studio and a local
Ollama, because they all speak the same request and the same SSE frames. That is
the entire reason this is the protocol rather than a vendor SDK: switching
providers is three environment variables, and no vendor name appears above the
adapter line.

Written against ``urllib`` rather than a client library on purpose. The protocol
is a POST and a stream of ``data:`` lines; pulling in an HTTP stack (or a vendor
SDK, which would defeat the point) to spell that is a dependency this repo does
not need -- the same judgement that kept it to Flask, SQLAlchemy and DuckDB.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from collections.abc import Iterator, Sequence

from ....application.ports.outbound.chat import ChatMessage, ChatPort, ChatUnavailable

logger = logging.getLogger(__name__)

#: Long enough for a slow free-tier queue, short enough that a wedged provider
#: does not hold a worker forever.
_CONNECT_TIMEOUT = 30.0


class OpenAiCompatibleChat:
    """Implements :class:`ChatPort` against an OpenAI-shaped endpoint."""

    def __init__(self, *, base_url: str, api_key: str, model: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._model = model

    @property
    def available(self) -> bool:
        return bool(self._base_url and self._api_key and self._model)

    @property
    def model_label(self) -> str:
        return self._model

    def stream(self, *, system: str, messages: Sequence[ChatMessage]) -> Iterator[str]:
        payload = {
            "model": self._model,
            "stream": True,
            # System first and unchanging, so a gateway that caches prefixes can.
            # Nothing here depends on it working -- caching is a bonus, not a
            # behaviour this code relies on.
            "messages": [{"role": "system", "content": system}]
            + [{"role": m.role, "content": m.content} for m in messages],
        }

        request = urllib.request.Request(
            f"{self._base_url}/chat/completions",
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._api_key}",
            },
            method="POST",
        )

        try:
            response = urllib.request.urlopen(request, timeout=_CONNECT_TIMEOUT)
        except urllib.error.HTTPError as exc:
            # The provider's own message is the useful half ("model not found",
            # "rate limited"); the status alone sends the user hunting.
            detail = _safe_read(exc)
            logger.warning("chat provider returned %s: %s", exc.code, detail)
            raise ChatUnavailable(f"El proveedor respondió {exc.code}: {detail}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise ChatUnavailable(f"No se pudo contactar al proveedor: {exc}") from exc

        with response:
            yield from _parse_sse(response)


class FallbackChat:
    """Primary model, then the configured fallback if that one refuses.

    The HTTP error happens before any token is yielded, so a 429 or an
    outage on the first model can still produce a full answer from the
    second. A mid-stream failure is left as-is — half an answer plus an
    error is better than restarting the question on a different model.
    """

    def __init__(self, primary: ChatPort, fallback: ChatPort) -> None:
        self._primary = primary
        self._fallback = fallback

    @property
    def available(self) -> bool:
        return self._primary.available

    @property
    def model_label(self) -> str:
        return f"{self._primary.model_label} · {self._fallback.model_label}"

    def stream(self, *, system: str, messages: Sequence[ChatMessage]) -> Iterator[str]:
        try:
            iterator = self._primary.stream(system=system, messages=messages)
            first = next(iterator)
        except ChatUnavailable:
            yield from self._fallback.stream(system=system, messages=messages)
            return
        except StopIteration:
            return
        yield first
        yield from iterator


def _parse_sse(response) -> Iterator[str]:
    """Yield the content deltas out of an SSE stream.

    Frames that are not JSON, or that carry no delta, are skipped rather than
    raised on: providers interleave keep-alive comments and usage frames, and a
    strict parser here would turn a working stream into an error on the first
    one it had not seen before.
    """
    for raw in response:
        line = raw.decode("utf-8", errors="replace").strip()
        if not line or not line.startswith("data:"):
            continue
        data = line[len("data:") :].strip()
        if data == "[DONE]":
            return
        try:
            frame = json.loads(data)
        except json.JSONDecodeError:
            continue
        for choice in frame.get("choices") or []:
            piece = (choice.get("delta") or {}).get("content")
            if piece:
                yield piece


def _safe_read(exc: urllib.error.HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8", errors="replace")
    except Exception:  # pragma: no cover - the error path of an error path
        return exc.reason or "sin detalle"
    # Providers wrap the message differently; try the common shape, fall back to
    # the raw body truncated, never to an empty string.
    try:
        parsed = json.loads(body)
        message = parsed.get("error", {}).get("message") or parsed.get("message")
        if message:
            return str(message)
    except json.JSONDecodeError:
        pass
    return body[:200] or (exc.reason or "sin detalle")


class NullChat:
    """What the container injects when no model is configured.

    A fresh clone has no key, and that is a normal state rather than a broken
    one: the Workspace view still reads, and only the chat band renders disabled
    with its reason. Raising from here instead would make the absence of an
    optional integration look like a bug in the product.
    """

    available = False
    model_label = ""

    def stream(self, *, system: str, messages: Sequence[ChatMessage]) -> Iterator[str]:
        raise ChatUnavailable(
            "No hay un modelo configurado. Define LLM_BASE_URL, LLM_API_KEY y LLM_MODEL."
        )
