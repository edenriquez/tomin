from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import json
from src.infrastructure.notifications import notification_manager

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("/{user_id}")
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
