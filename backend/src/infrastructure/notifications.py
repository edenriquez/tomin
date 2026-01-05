import asyncio
from typing import Dict, List
import json
from uuid import UUID

class NotificationManager:
    def __init__(self):
        # Dictionary mapping user_id to a list of active queues
        self.user_queues: Dict[str, List[asyncio.Queue]] = {}

    async def subscribe(self, user_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        if user_id not in self.user_queues:
            self.user_queues[user_id] = []
        self.user_queues[user_id].append(queue)
        return queue

    def unsubscribe(self, user_id: str, queue: asyncio.Queue):
        if user_id in self.user_queues:
            self.user_queues[user_id].remove(queue)
            if not self.user_queues[user_id]:
                del self.user_queues[user_id]

    async def notify_user(self, user_id: str, message: dict):
        if user_id in self.user_queues:
            # Send notification to all active connections for this user
            for queue in self.user_queues[user_id]:
                await queue.put(message)

# Global notification manager
notification_manager = NotificationManager()
