from fastapi import APIRouter
from app.api.endpoints import repositories, chat

api_router = APIRouter()
api_router.include_router(repositories.router, prefix="/repos", tags=["repositories"])
api_router.include_router(chat.router, prefix="/chats", tags=["chats"])
