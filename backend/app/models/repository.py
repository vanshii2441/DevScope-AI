from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from .base import Base

class RepositoryStatus(str, enum.Enum):
    PENDING = "PENDING"
    INDEXING = "INDEXING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    url = Column(String, nullable=False)
    status = Column(Enum(RepositoryStatus), default=RepositoryStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="repositories")
    chats = relationship("Chat", back_populates="repository")
