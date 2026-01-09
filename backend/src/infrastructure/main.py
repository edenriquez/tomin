from fastapi import FastAPI, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4, UUID
from datetime import datetime, timedelta
from typing import List


from src.application.use_cases.get_spending_distribution import GetSpendingDistribution
from src.application.use_cases.generate_forecast import GenerateForecast
from src.application.use_cases.process_bank_statement import ProcessBankStatement
from src.infrastructure.notifications import notification_manager
import json
import asyncio
import logging
from typing import List
from src.domain.entities.models import Transaction, Category, ProcessedFile
from src.infrastructure.database import SessionLocal, engine, Base, get_db
from src.infrastructure.supabase_repositories import (
    SupabaseTransactionRepository, 
    SupabaseCategoryRepository, 
    SupabaseProcessedFileRepository,
    SupabaseSavingsMovementRepository
)
from sqlalchemy.orm import Session

app = FastAPI(title="Tomin API")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Seed data logic for Supabase
def seed_data():
    db = SessionLocal()
    try:
        cat_repo = SupabaseCategoryRepository(db)
        tx_repo = SupabaseTransactionRepository(db)
        
        existing_cats = cat_repo.get_all()
        if not existing_cats:
            # Seed default categories if none exist
            from src.domain.entities.models import Category
            new_cats = [
                Category(name="Vivienda & Servicios", color="#3b82f6", icon="home"),
                Category(name="Comida & Supermerk", color="#a855f7", icon="shopping_cart"),
                Category(name="Transporte", color="#eab308", icon="commute"),
                Category(name="Entretenimiento", color="#ec4899", icon="movie"),
            ]
            # Manual save since we want to ensure they are in DB
            from src.infrastructure.models import CategoryModel
            db.add_all([CategoryModel(id=c.id, name=c.name, color=c.color, icon=c.icon) for c in new_cats])
            db.commit()
            existing_cats = new_cats

        user_id = UUID('00000000-0000-0000-0000-000000000000')
        # Only seed transactions if DB is empty for this user
        if not tx_repo.get_by_user(user_id, datetime.now() - timedelta(days=365), datetime.now()):
            all_demo_txs = []
            for i in range(50):
                for cat in existing_cats:
                    all_demo_txs.append(Transaction(
                        amount=100.0 * (i % 5 + 1),
                        description=f"Gasto en {cat.name} {i}",
                        date=datetime.now() - timedelta(days=i),
                        category_id=cat.id,
                        user_id=user_id
                    ))
            tx_repo.save_all(all_demo_txs)
    finally:
        db.close()



@app.get("/api/spending-distribution")
def get_distribution(
    user_id: str = '00000000-0000-0000-0000-000000000000',
    db: Session = Depends(get_db)
):
    tx_repo = SupabaseTransactionRepository(db)
    cat_repo = SupabaseCategoryRepository(db)
    use_case = GetSpendingDistribution(tx_repo, cat_repo)
    return use_case.execute(UUID(user_id), datetime.now() - timedelta(days=30), datetime.now())

@app.get("/api/forecast")
def get_forecast(
    user_id: str = '00000000-0000-0000-0000-000000000000',
    db: Session = Depends(get_db)
):
    tx_repo = SupabaseTransactionRepository(db)
    cat_repo = SupabaseCategoryRepository(db)
    use_case = GenerateForecast(tx_repo, cat_repo)
    return use_case.execute(UUID(user_id), datetime.now().month, datetime.now().year)

@app.post("/api/upload-bank-statement")
async def upload_bank_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = '00000000-0000-0000-0000-000000000000',
    db: Session = Depends(get_db)
):
    tx_repo = SupabaseTransactionRepository(db)
    cat_repo = SupabaseCategoryRepository(db)
    file_repo = SupabaseProcessedFileRepository(db)
    savings_repo = SupabaseSavingsMovementRepository(db)
    
    use_case = ProcessBankStatement(tx_repo, cat_repo, file_repo, savings_repo, notification_manager)
    # Read file content safely
    file_content = await file.read()
    
    # Process asynchronously
    # Create a wrapper for background task to manage its own DB session
    async def run_process_use_case(u_id: UUID, content: bytes):
        db_bg = SessionLocal()
        try:
            tx_repo_bg = SupabaseTransactionRepository(db_bg)
            cat_repo_bg = SupabaseCategoryRepository(db_bg)
            file_repo_bg = SupabaseProcessedFileRepository(db_bg)
            savings_repo_bg = SupabaseSavingsMovementRepository(db_bg)
            use_case_bg = ProcessBankStatement(tx_repo_bg, cat_repo_bg, file_repo_bg, savings_repo_bg, notification_manager)
            await use_case_bg.execute(u_id, content)
        finally:
            db_bg.close()

    background_tasks.add_task(run_process_use_case, UUID(user_id), file_content)
    
    return {
        "message": "Bank statement upload received and processing started.",
        "filename": file.filename,
        "status": "processing"
    }

@app.get("/api/notifications/{user_id}")
async def stream_notifications(user_id: str):
    async def event_generator():
        queue = await notification_manager.subscribe(user_id)
        try:
            while True:
                message = await queue.get()
                yield f"data: {json.dumps(message)}\n\n"
        finally:
            notification_manager.unsubscribe(user_id, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
