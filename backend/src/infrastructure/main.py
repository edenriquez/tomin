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
    notifications_router
)

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
                    name="Vivienda & Servicios", 
                    color="#3b82f6", 
                    icon="home", 
                    categorization_labels=["CFE", "AGUA", "RENTA", "IZZI", "TELMEX", "SKY", "TOTALPLAY", "INTERNET", "LUZ", "GAS"]
                ),
                Category(
                    name="Comida & Supermerk", 
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
