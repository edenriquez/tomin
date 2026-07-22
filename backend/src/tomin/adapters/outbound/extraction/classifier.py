from __future__ import annotations

from ....application.dtos.extraction import ExtractedDocument

# Template keys understood by the parser factory.
TEMPLATE_SAT_CFDI = "sat_cfdi"
TEMPLATE_BANAMEX = "banamex"
TEMPLATE_GENERIC = "generic_bank"
TEMPLATE_UNKNOWN = "unknown"


class KeywordTemplateClassifier:
    """Routes an extracted document to a parser template.

    XML documents are treated as SAT CFDI. Text documents are matched against
    per-bank keyword signatures, falling back to a generic bank parser.
    """

    # bank template key -> signature keywords (lowercased) expected in the text
    BANK_SIGNATURES: dict[str, tuple[str, ...]] = {
        TEMPLATE_BANAMEX: ("banamex", "banco nacional de mexico", "citibanamex"),
    }

    def classify(self, doc: ExtractedDocument) -> str:
        if doc.kind == "xml":
            xml = (doc.xml or "").lower()
            if "cfdi" in xml or "comprobante" in xml:
                return TEMPLATE_SAT_CFDI
            return TEMPLATE_UNKNOWN

        text = (doc.text or "").lower()
        for template, signatures in self.BANK_SIGNATURES.items():
            if any(sig in text for sig in signatures):
                return template
        return TEMPLATE_GENERIC if text.strip() else TEMPLATE_UNKNOWN
