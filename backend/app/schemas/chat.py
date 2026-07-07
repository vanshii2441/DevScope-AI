from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MessageBase(BaseModel):
    role: str
    content: str

class MessageResponse(MessageBase):
    id: str
    created_at: datetime
    
    model_config = {"from_attributes": True}

class ChatBase(BaseModel):
    repository_id: str
    title: Optional[str] = "New Chat"

class ChatCreate(ChatBase):
    pass

class ChatResponse(ChatBase):
    id: str
    user_id: str
    created_at: datetime
    
    model_config = {"from_attributes": True}

class ChatInput(BaseModel):
    message: str
