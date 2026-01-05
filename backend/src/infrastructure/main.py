from fastapi import FastAPI, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4, UUID
from datetime import datetime, timedelta
from typing import List

from src.infrastructure.repositories import InMemoryTransactionRepository, InMemoryCategoryRepository
from src.application.use_cases.get_spending_distribution import GetSpendingDistribution
from src.application.use_cases.generate_forecast import GenerateForecast
from src.application.use_cases.process_bank_statement import ProcessBankStatement
from src.infrastructure.notifications import notification_manager
import json
import asyncio
from src.domain.entities.models import Transaction

app = FastAPI(title="Tomin API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton-ish repos for demo
tx_repo = InMemoryTransactionRepository()
cat_repo = InMemoryCategoryRepository()

# Seed data
def seed_data():
    cats = cat_repo.get_all()
    user_id = UUID('00000000-0000-0000-0000-000000000000')
    
    # Add various transactions for the last 30 days
    for i in range(50):
        for cat in cats:
            tx_repo.save(Transaction(
                amount=100.0 * (i % 5 + 1),
                description=f"Gasto en {cat.name} {i}",
                date=datetime.now() - timedelta(days=i),
                category_id=cat.id,
                user_id=user_id
            ))
            
seed_data()

@app.get("/api/spending-distribution")
def get_distribution(user_id: str = '00000000-0000-0000-0000-000000000000'):
    use_case = GetSpendingDistribution(tx_repo, cat_repo)
    return use_case.execute(UUID(user_id), datetime.now() - timedelta(days=30), datetime.now())

@app.get("/api/forecast")
def get_forecast(user_id: str = '00000000-0000-0000-0000-000000000000'):
    use_case = GenerateForecast(tx_repo, cat_repo)
    return use_case.execute(UUID(user_id), datetime.now().month, datetime.now().year)

@app.post("/api/upload-bank-statement")
async def upload_bank_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = '00000000-0000-0000-0000-000000000000'
):
    use_case = ProcessBankStatement(tx_repo, cat_repo, notification_manager)
    # Read file content safely
    file_content = await file.read()
    
    # Process asynchronously
    background_tasks.add_task(use_case.execute, UUID(user_id), file_content)
    
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
