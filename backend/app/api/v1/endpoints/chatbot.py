from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.chatbot_service import ChatbotService

router = APIRouter()

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    plant_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    is_agricultural: bool
    sources: List[str] = []
    plant_context_used: bool = False
    plant_name: Optional[str] = None

class HistoryItem(BaseModel):
    id: str
    role: str
    content: str
    sources: List[str] = []
    created_at: str

@router.post("/message", response_model=ChatResponse)
def send_chat_message(
    chat_in: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits an inquiry to the PlantPulse Agricultural Assistant.
    Enforces strict agricultural domain boundaries and personal plant data isolation.
    """
    return ChatbotService.answer_query(
        db=db,
        user=current_user,
        user_message=chat_in.message,
        plant_id=chat_in.plant_id
    )

@router.get("/history", response_model=List[HistoryItem])
def get_chat_history(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves previous conversation history for the authenticated user.
    """
    return ChatbotService.get_history(db, current_user, limit=limit)

@router.delete("/history", status_code=status.HTTP_200_OK)
def clear_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clears conversation history for the authenticated user.
    """
    ChatbotService.clear_history(db, current_user)
    return {"message": "Chat history cleared successfully.", "status": "success"}
