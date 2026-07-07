from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import json
import asyncio

from langchain_core.messages import HumanMessage
from app.core.database import get_db
from app.models.chat import Chat, Message
from app.schemas.chat import ChatCreate, ChatResponse, MessageResponse, ChatInput
from app.services.ai.agent import app_agent
from app.api.endpoints.repositories import get_current_user_id

router = APIRouter()

@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
def create_chat(
    chat_in: ChatCreate, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Create a new chat session for a repository.
    """
    new_chat = Chat(
        user_id=user_id,
        repository_id=chat_in.repository_id,
        title=chat_in.title
    )
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    return new_chat

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
def get_messages(
    chat_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Get all messages for a specific chat.
    """
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    return chat.messages

@router.post("/{chat_id}/completions")
async def chat_completion(
    chat_id: str,
    chat_in: ChatInput,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Stream a response from the LangGraph agent.
    """
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Save user message
    user_msg = Message(chat_id=chat_id, role="user", content=chat_in.message)
    db.add(user_msg)
    db.commit()

    async def event_generator():
        try:
            # Reconstruct message history (simple version)
            messages = []
            for m in chat.messages[-5:]: # Get last 5 context messages
                # Basic mapping to langchain messages
                if m.role == "user":
                    messages.append(HumanMessage(content=m.content))
            
            messages.append(HumanMessage(content=chat_in.message))

            # Run LangGraph Agent stream
            async for chunk in app_agent.astream({"messages": messages, "repo_id": chat.repository_id}, stream_mode="messages"):
                # chunk is a tuple: (Message, dict)
                msg = chunk[0]
                if getattr(msg, "content", None) and not getattr(msg, "tool_calls", None):
                    # We stream the content token by token if the LLM supports it, 
                    # but here we yield whatever chunks the graph gives us
                    if isinstance(msg.content, str):
                        data = json.dumps({"text": msg.content})
                        yield f"data: {data}\n\n"
                        await asyncio.sleep(0.01)

            # Save the final AI message to DB (simplified, usually we'd collect all chunks)
            # This is a bit tricky with SSE because we can't easily execute DB calls after yielding
            # In a real production app, we would accumulate the text and save it at the end.
            
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
