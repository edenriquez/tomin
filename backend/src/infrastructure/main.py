from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from uuid import UUID
from src.domain.entities.models import Category
from src.infrastructure.database import SessionLocal, engine, Base
from src.infrastructure.supabase_repositories import (
    SupabaseTransactionRepository, 
    SupabaseCategoryRepository
)
from src.infrastructure.api import (
    transactions_router,
    forecast_router,
    notifications_router,
    merchants_router
)
from src.infrastructure.models import MerchantModel, MerchantLabelModel
from src.application.use_cases.detect_recurring_transactions import normalize_merchant

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Tomin API")

# Seed data logic for Supabase
def seed_data():
    db = SessionLocal()
    try:
        cat_repo = SupabaseCategoryRepository(db)
        
        existing_cats = cat_repo.get_all()
        if not existing_cats:
            # Seed default categories if none exist
            new_cats = [
                Category(
                    name="Sin Categoría", 
                    color="#94a3b8", 
                    icon="", 
                    categorization_labels=[]
                ),
                Category(
                    name="Vivienda & Servicios", 
                    color="#3b82f6", 
                    icon="home", 
                    categorization_labels=["CFE", "AGUA", "RENTA", "IZZI", "TELMEX", "SKY", "TOTALPLAY", "INTERNET", "LUZ", "GAS"]
                ),
                Category(
                    name="Comida & Supermercados", 
                    color="#a855f7", 
                    icon="shopping_cart",
                    categorization_labels=["OXXO", "UBER EATS", "WALMART", "SORIANA", "CHEDRAUI", "COSTCO", "RAPPI", "RESTAURANTE", "STARBUCKS", "VIPS", "TOKS", "BURGER"]
                ),
                Category(
                    name="Transporte", 
                    color="#eab308", 
                    icon="commute",
                    categorization_labels=["UBER", "DIDI", "GASOLINA", "SHELL", "MOBIL", "BP", "G500", "TAXI", "ADO", "AEROMEXICO", "VOLARIS"]
                ),
                Category(
                    name="Entretenimiento", 
                    color="#ec4899", 
                    icon="movie",
                    categorization_labels=["NETFLIX", "SPOTIFY", "CINEPOLIS", "CINEMEX", "PRIME", "AMAZON VIDEO", "DISNEY", "HBO", "APPLE TV", "YOUTUBE", "GAMEPASS"]
                ),
                Category(
                    name="Transferencias & Ajustes", 
                    color="#64748b", 
                    icon="payments",
                    categorization_labels=["TRANSFERENCIA", "SPEI", "PAGO TC", "ABONO", "DEPOSITO", "RETIRO", "CAJERO"]
                ),
            ]
            # Manual save since we want to ensure they are in DB
            from src.infrastructure.models import CategoryModel
            db.add_all([CategoryModel(id=c.id, name=c.name, color=c.color, icon=c.icon, categorization_labels=c.categorization_labels) for c in new_cats])
            db.commit()

        
        existing_merchants = db.query(MerchantModel).all()
        if not existing_merchants:
            merchant_seeds = [
                {"name": "Netflix", "labels": ["netflix", "netflix nme", "netflix.com"]},
                {"name": "Spotify", "labels": ["spotify", "spotify mexico", "spotify p1"]},
                {"name": "Uber", "labels": ["uber", "uber trip", "stripe uber trip"]},
                {"name": "Didi", "labels": ["didi", "didi food"]},
                {"name": "Amazon", "labels": ["amazon", "amazon.com", "str amazon", "marketp amazon"]},
                {"name": "Walmart", "labels": ["walmart", "supercenter vicente gu", "mi bga aurrera tlalman", "bodega aurrera", "sams club"]},
                {"name": "OXXO", "labels": ["oxxo", "oxxo san rafael mex", "oxxo tlalmannalco"]},
                {"name": "CFE", "labels": ["cfe", "cfe contigo mu", "cfe sum serv bas cr mu"]},
                {"name": "Mercado Pago", "labels": ["mercado pago", "merpago", "merpago imptlal", "merpago agregador"]},
                {"name": "Starbucks", "labels": ["starbucks"]},
                {"name": "Uber Eats", "labels": ["uber eats", "uber eats trip"]},
                {"name": "Rappi", "labels": ["rappi"]},
                {"name": "Apple", "labels": ["apple.com/bill", "itunes.com", "icloud"]},
                {"name": "Microsoft", "labels": ["microsoft", "xbox", "gamepass", "msft"]},
                {"name": "Soriana", "labels": ["soriana", "tiendas soriana"]},
                {"name": "Chedraui", "labels": ["chedraui", "tiendas chedraui"]},
                {"name": "Costco", "labels": ["costco", "costco gas"]},
                {"name": "La Comer", "labels": ["la comer", "fresko", "city market"]},
                {"name": "Telmex", "labels": ["telmex", "pago telmex"]},
                {"name": "Izzi", "labels": ["izzi", "izzi telecom", "paypal*cableycomun tci 770922c22mx"]},
                {"name": "Totalplay", "labels": ["totalplay"]},
                {"name": "Sky", "labels": ["sky", "vetv"]},
                {"name": "Naturgy", "labels": ["naturgy", "gas natural"]},
                {"name": "SACMEX", "labels": ["sacmex", "sistema de aguas"]},
                {"name": "7-Eleven", "labels": ["7 eleven", "7-eleven"]},
                {"name": "Farmacias Guadalajara", "labels": ["farmacia guadalajara", "farmacias guadalajara"]},
                {"name": "Farmacias del Ahorro", "labels": ["farmacia del ahorro", "farmacias del ahorro"]},
                {"name": "Liverpool", "labels": ["liverpool", "distribuidora liverpool"]},
                {"name": "Coppel", "labels": ["coppel"]},
                {"name": "Sears", "labels": ["sears"]},
                {"name": "Elektra", "labels": ["elektra"]},
                {"name": "Pemex", "labels": ["pemex"]},
                {"name": "Shell", "labels": ["shell"]},
                {"name": "Mobil", "labels": ["mobil"]},
                {"name": "BP", "labels": ["british petroleum", "bp"]},
                {"name": "Aeromexico", "labels": ["aeromexico"]},
                {"name": "Volaris", "labels": ["volaris"]},
                {"name": "Viva Aerobus", "labels": ["viva aerobus", "vivaaerobus"]},
                {"name": "ADO", "labels": ["ado", "autobuses de oriente"]},
                {"name": "Smart Fit", "labels": ["smart fit"]},
                {"name": "Vips", "labels": ["vips"]},
                {"name": "Toks", "labels": ["toks"]},
                {"name": "McDonalds", "labels": ["mcdonalds", "mcdonald s"]},
                {"name": "Burger King", "labels": ["burger king"]},
                {"name": "KFC", "labels": ["kfc", "kentucky fried chicken"]},
                {"name": "Domino's Pizza", "labels": ["dominos", "dominos pizza"]},
                {"name": "Cinemex", "labels": ["cinemex"]},
                {"name": "Cinepolis", "labels": ["cinepolis"]},
            ]

            for m_data in merchant_seeds:
                merchant = MerchantModel(name=m_data["name"])
                db.add(merchant)
                db.flush() # Get ID
                
                # Add labels (normalized)
                seen_labels = set()
                # Use name itself as a label too
                labels_to_add = [m_data["name"]] + m_data["labels"]
                
                for lbl in labels_to_add:
                    norm_lbl = normalize_merchant(lbl)
                    if norm_lbl and norm_lbl not in seen_labels:
                        label_obj = MerchantLabelModel(
                            merchant_id=merchant.id,
                            label=norm_lbl
                        )
                        db.add(label_obj)
                        seen_labels.add(norm_lbl)
            
            db.commit()
            logger.info("Successfully seeded default merchants and labels.")
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    # Create tables on startup (In production use Alembic)
    Base.metadata.create_all(bind=engine)
    # Seed data
    seed_data()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(transactions_router)
app.include_router(forecast_router)
app.include_router(notifications_router)
app.include_router(merchants_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
