from __future__ import annotations

import logging
import re
import unicodedata

from ....application.dtos.extraction import ExtractedDocument

logger = logging.getLogger(__name__)

# Template keys understood by the parser factory.
TEMPLATE_SAT_CFDI = "sat_cfdi"
TEMPLATE_BANAMEX = "banamex"
TEMPLATE_GENERIC = "generic_bank"
TEMPLATE_UNKNOWN = "unknown"

#: A line that starts with a date is a movement — and any bank named inside a
#: movement is likely a *counterparty* ("SPEI enviado Banamex"), weak evidence
#: of the issuer.
_TRANSACTION_LINE = re.compile(r"^\s*\d{1,2}[-/]")

#: Signature classes, by how much a hit proves the issuer:
#:
#: - "product": the issuer's own product vocabulary — "Cajita" can only appear
#:   on a Nu statement, never as a counterparty. Near-proof anywhere, movement
#:   lines included ("07-may Retiro de Cajita…" IS a Nu movement).
#: - "legal": the institution's full or formal name. Strong in prose (mastheads,
#:   footers) — but SPEI detail blocks also print the *receiving* bank's formal
#:   name in prose, so this is deliberately weaker than "product".
#: - "brand": a short brand word. Ambient noise — capped everywhere.
_PRODUCT_W = 100
_LEGAL_W = 50
_BRAND_PROSE_W = 10
_BRAND_PROSE_CAP = 3
_MOVEMENT_W = 1
_MOVEMENT_CAP = 3

SignatureClass = str  # "product" | "legal" | "brand"


def _fold(text: str) -> str:
    """Lowercase + strip accents, preserving line structure.

    The previous classifier lowercased only, so "Nu México" never matched the
    signature "nu mexico" — and the statement fell through to whichever bank
    a stray counterparty line mentioned.
    """
    text = unicodedata.normalize("NFKD", text)
    return "".join(c for c in text if not unicodedata.combining(c)).lower()


class KeywordTemplateClassifier:
    """Routes an extracted document to a parser template, and names the bank.

    XML documents are treated as SAT CFDI. For text documents the issuing
    bank is *scored*: product vocabulary is near-proof anywhere, formal names
    count in prose, bare brand words are capped ambient noise. First-match-wins
    over the full text — the original design — classified a Nubank statement
    as Banamex off a single transfer line; scoring by evidence class is what
    prevents that family of mistakes.

    Two separable answers come out of one pass:
    - :meth:`classify` — which *parser template* to use (only banks with a
      dedicated parser map to their own template; everyone else parses as
      ``generic_bank``);
    - :meth:`detect_bank` — the display name for the statement, independent
      of whether a dedicated parser exists.
    """

    #: display name -> (signature, class) pairs. Signatures are accent-free
    #: lowercase; multi-word where a bare word would collide with noise.
    BANK_SIGNATURES: dict[str, tuple[tuple[str, SignatureClass], ...]] = {
        "Nu": (
            ("cajita", "product"),
            ("nu mexico financiera", "legal"),
            ("nu mexico", "legal"),
            ("nubank", "legal"),
            ("nu bank", "legal"),
        ),
        "Banamex": (
            ("citibanamex", "legal"),
            ("banco nacional de mexico", "legal"),
            ("banamex", "brand"),
        ),
        "BBVA": (("bbva mexico", "legal"), ("bbva", "brand"), ("bancomer", "brand")),
        "Santander": (("banco santander", "legal"), ("santander", "brand")),
        "Banorte": (("banco mercantil del norte", "legal"), ("banorte", "brand")),
        "HSBC": (("hsbc mexico", "legal"), ("hsbc", "brand")),
        "Scotiabank": (("scotiabank", "brand"),),
        "Banregio": (("banregio", "brand"),),
        "Banco Azteca": (("banco azteca", "brand"),),
        "Hey Banco": (("hey banco", "brand"),),
    }

    #: Banks with a dedicated parser template. Everyone else parses generic.
    _TEMPLATES: dict[str, str] = {"Banamex": TEMPLATE_BANAMEX}

    def classify(self, doc: ExtractedDocument) -> str:
        if doc.kind == "xml":
            xml = (doc.xml or "").lower()
            if "cfdi" in xml or "comprobante" in xml:
                return TEMPLATE_SAT_CFDI
            return TEMPLATE_UNKNOWN

        text = (doc.text or "").lower()
        if not text.strip():
            return TEMPLATE_UNKNOWN
        bank = self.detect_bank(doc)
        return self._TEMPLATES.get(bank or "", TEMPLATE_GENERIC)

    def detect_bank(self, doc: ExtractedDocument) -> str | None:
        """The issuing bank's display name, or None when nothing convincing."""
        scores = self._scores(doc)
        if not scores:
            return None
        best = max(scores, key=lambda bank: scores[bank])
        logger.debug("bank detection scores: %s -> %s", scores, best)
        return best if scores[best] > 0 else None

    def _scores(self, doc: ExtractedDocument) -> dict[str, int]:
        text = _fold(doc.text or "")
        if not text.strip():
            return {}

        prose_lines: list[str] = []
        movement_lines: list[str] = []
        for line in text.splitlines():
            (movement_lines if _TRANSACTION_LINE.match(line) else prose_lines).append(line)

        scores: dict[str, int] = {}
        for bank, signatures in self.BANK_SIGNATURES.items():
            score = 0
            for sig, klass in signatures:
                if klass == "product":
                    # Product vocabulary is the issuer's own voice; one
                    # mention anywhere decides. Counted once — evidence of
                    # identity, not of volume.
                    if sig in text:
                        score += _PRODUCT_W
                    continue
                prose_hits = sum(1 for line in prose_lines if sig in line)
                movement_hits = sum(1 for line in movement_lines if sig in line)
                if klass == "legal":
                    if prose_hits:
                        score += _LEGAL_W
                    score += _MOVEMENT_W * min(_MOVEMENT_CAP, movement_hits)
                else:  # brand
                    score += _BRAND_PROSE_W * min(_BRAND_PROSE_CAP, prose_hits)
                    score += _MOVEMENT_W * min(_MOVEMENT_CAP, movement_hits)
            if score:
                scores[bank] = score
        return scores
