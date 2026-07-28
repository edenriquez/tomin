from __future__ import annotations

from ....domain.entities import Category, Merchant
from ....application.ports.outbound import CategoryRepository, MerchantRepository

DEFAULT_CATEGORIES: list[dict] = [
    {"name": "Sin Categoria", "color": "#94a3b8", "icon": "", "labels": []},
    {
        "name": "Vivienda & Servicios",
        "color": "#3b82f6",
        "icon": "home",
        "labels": ["cfe", "agua", "renta", "izzi", "telmex", "sky", "totalplay",
                   "internet", "luz", "gas"],
    },
    {
        "name": "Comida & Supermercados",
        "color": "#a855f7",
        "icon": "shopping_cart",
        "labels": ["oxxo", "uber eats", "walmart", "soriana", "chedraui", "costco",
                   "rappi", "restaurante", "starbucks", "vips", "toks", "burger"],
    },
    {
        "name": "Transporte",
        "color": "#eab308",
        "icon": "commute",
        "labels": ["uber", "didi", "gasolina", "shell", "mobil", "bp", "g500",
                   "taxi", "ado", "aeromexico", "volaris"],
    },
    {
        "name": "Entretenimiento",
        "color": "#ec4899",
        "icon": "movie",
        "labels": ["netflix", "spotify", "cinepolis", "cinemex", "prime", "disney",
                   "hbo", "apple tv", "youtube", "gamepass"],
    },
    {
        "name": "Transferencias & Ajustes",
        "color": "#64748b",
        "icon": "payments",
        # "retiro"/"cajero" deliberately absent: a withdrawal's category is
        # unknown -- the statement cannot see what the cash bought -- so it is
        # a flag (`is_cash_withdrawal`), not a category (plan §2). Filing them
        # here made every ATM visit look like an internal transfer.
        "labels": ["transferencia", "spei", "pago tc", "abono", "deposito"],
    },
]

DEFAULT_MERCHANTS: list[dict] = [
    {"name": "Netflix", "labels": ["netflix", "netflix.com"]},
    {"name": "Spotify", "labels": ["spotify", "spotify mexico"]},
    {"name": "Uber", "labels": ["uber", "uber trip"]},
    {"name": "Didi", "labels": ["didi", "didi food"]},
    {"name": "Amazon", "labels": ["amazon", "amazon.com", "marketp amazon"]},
    {"name": "Walmart", "labels": ["walmart", "bodega aurrera", "sams club"]},
    {"name": "OXXO", "labels": ["oxxo"]},
    {"name": "CFE", "labels": ["cfe", "cfe contigo"]},
    {"name": "Mercado Pago", "labels": ["mercado pago", "merpago"]},
    {"name": "Starbucks", "labels": ["starbucks"]},
    {"name": "Uber Eats", "labels": ["uber eats"]},
    {"name": "Rappi", "labels": ["rappi"]},
    {"name": "Apple", "labels": ["apple.com/bill", "itunes.com", "icloud"]},
    {"name": "Telmex", "labels": ["telmex", "pago telmex"]},
    {"name": "Izzi", "labels": ["izzi", "izzi telecom"]},
    {"name": "Totalplay", "labels": ["totalplay"]},
    {"name": "Soriana", "labels": ["soriana"]},
    {"name": "Chedraui", "labels": ["chedraui"]},
    {"name": "Costco", "labels": ["costco", "costco gas"]},
    {"name": "Pemex", "labels": ["pemex"]},
    {"name": "Shell", "labels": ["shell"]},
    {"name": "Cinemex", "labels": ["cinemex"]},
    {"name": "Cinepolis", "labels": ["cinepolis"]},
]


def seed_reference_data(
    categories: CategoryRepository, merchants: MerchantRepository
) -> None:
    """Idempotently seed default categories and merchants when empty."""
    if not categories.get_all():
        categories.add_many(
            [
                Category(
                    name=c["name"],
                    color=c["color"],
                    icon=c["icon"],
                    categorization_labels=c["labels"],
                )
                for c in DEFAULT_CATEGORIES
            ]
        )
    if not merchants.get_all():
        merchants.add_many(
            [Merchant(name=m["name"], labels=m["labels"]) for m in DEFAULT_MERCHANTS]
        )
