from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
from app.models.repository import RepositoryStatus

class RepositoryBase(BaseModel):
    name: str
    url: str

class RepositoryCreate(RepositoryBase):
    pass

class RepositoryResponse(RepositoryBase):
    id: str
    user_id: str
    status: RepositoryStatus
    chat_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
