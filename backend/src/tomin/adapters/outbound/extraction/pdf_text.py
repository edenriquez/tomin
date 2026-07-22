from __future__ import annotations

import io

from ....application.dtos.extraction import ExtractedDocument


class PdfTextExtractor:
    """Extracts embedded text from digital PDFs using pdfplumber.

    This is the fast path for statements that already contain a text layer
    (most bank e-statements). Scanned/image PDFs yield little text and should
    fall through to :class:`OcrPdfExtractor`.
    """

    MIN_TEXT_CHARS = 40

    def supports(self, filename: str, mime: str | None) -> bool:
        return filename.lower().endswith(".pdf")

    def extract(self, data: bytes, filename: str, mime: str | None) -> ExtractedDocument:
        import pdfplumber

        lines: list[str] = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                lines.extend(ln for ln in text.splitlines() if ln.strip())

        joined = "\n".join(lines)
        if len(joined) < self.MIN_TEXT_CHARS:
            # Signal to the pipeline that OCR is required.
            raise NeedsOcrError(filename)
        return ExtractedDocument(
            kind="text", filename=filename, text=joined, lines=lines, mime=mime
        )


class NeedsOcrError(Exception):
    """Raised when a PDF has no usable text layer and needs OCR."""
