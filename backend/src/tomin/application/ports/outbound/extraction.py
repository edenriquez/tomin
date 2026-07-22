from __future__ import annotations

from typing import Protocol, runtime_checkable

from ...dtos.extraction import ExtractedDocument, ParsedStatement


@runtime_checkable
class Extractor(Protocol):
    """Turns raw uploaded bytes into an :class:`ExtractedDocument`."""

    def supports(self, filename: str, mime: str | None) -> bool: ...

    def extract(self, data: bytes, filename: str, mime: str | None) -> ExtractedDocument: ...


@runtime_checkable
class TemplateClassifier(Protocol):
    """Identifies which parser template an extracted document belongs to.

    Returns a template key such as ``"banamex"``, ``"sat_cfdi"`` or
    ``"unknown"``.
    """

    def classify(self, doc: ExtractedDocument) -> str: ...


@runtime_checkable
class StatementParser(Protocol):
    """Parses an extracted document of a known template into a statement."""

    template_key: str

    def parse(self, doc: ExtractedDocument) -> ParsedStatement: ...


@runtime_checkable
class ParserFactory(Protocol):
    def get(self, template_key: str) -> StatementParser: ...
