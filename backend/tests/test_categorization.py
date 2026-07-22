from tomin.domain.entities import Category, Merchant
from tomin.domain.services.categorization import CategorizationService, normalize


def test_normalize_strips_accents_and_noise():
    assert normalize("  CAFÉ  Münchën!! ") == "cafe munchen"
    assert normalize("OXXO #123-A") == "oxxo 123 a"


def _service():
    categories = [
        Category(name="Sin Categoria", categorization_labels=[]),
        Category(name="Entretenimiento", categorization_labels=["netflix", "spotify"]),
        Category(name="Comida", categorization_labels=["oxxo", "uber eats"]),
    ]
    merchants = [
        Merchant(name="Netflix", labels=["netflix", "netflix.com"]),
        Merchant(name="OXXO", labels=["oxxo"]),
    ]
    return CategorizationService(categories, merchants), categories, merchants


def test_classify_matches_category_and_merchant():
    svc, categories, merchants = _service()
    result = svc.classify("PAGO NETFLIX.COM 12345")
    entertainment = next(c for c in categories if c.name == "Entretenimiento")
    netflix = next(m for m in merchants if m.name == "Netflix")
    assert result.category_id == entertainment.id
    assert result.merchant_id == netflix.id


def test_classify_falls_back_to_sin_categoria():
    svc, categories, _ = _service()
    result = svc.classify("SOME UNKNOWN MERCHANT")
    fallback = next(c for c in categories if c.name == "Sin Categoria")
    assert result.category_id == fallback.id
    assert result.merchant_id is None


def test_longest_label_wins():
    categories = [
        Category(name="A", categorization_labels=["uber"]),
        Category(name="B", categorization_labels=["uber eats"]),
    ]
    svc = CategorizationService(categories, [])
    result = svc.classify("compra uber eats centro")
    b = next(c for c in categories if c.name == "B")
    assert result.category_id == b.id
