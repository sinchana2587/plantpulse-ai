from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_optional_current_user
from app.models.user import User
from app.services.treatment_service import TreatmentService
from app.schemas.analysis import (
    TreatmentPlanResponse,
    TreatmentActionResponse,
    RecoveryObservationResponse,
    TreatmentActionUpdateRequest
)

router = APIRouter()

@router.get("/latest", response_model=Optional[TreatmentPlanResponse])
def get_latest_treatment(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve the active treatment and recovery plan for the user's latest analysed plant.
    Grounds immediate cultural practices and monitoring schedule.
    """
    user_id = current_user.id if current_user else None
    return TreatmentService.get_latest_user_treatment(db, user_id=user_id)

@router.get("/{treatment_id}", response_model=TreatmentPlanResponse)
def get_treatment_by_id(
    treatment_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve treatment plan details by ID."""
    return TreatmentService.get_treatment_by_id(db, treatment_id)

@router.patch("/{treatment_id}/actions/{action_id}", response_model=TreatmentActionResponse)
def update_action_completion(
    treatment_id: str,
    action_id: str,
    payload: TreatmentActionUpdateRequest,
    db: Session = Depends(get_db)
):
    """Toggle completion status of a specific treatment action item."""
    return TreatmentService.update_action_completion(
        db=db,
        treatment_id=treatment_id,
        action_id=action_id,
        is_completed=payload.is_completed
    )

@router.post("/{treatment_id}/follow-up", response_model=RecoveryObservationResponse, status_code=status.HTTP_201_CREATED)
async def add_recovery_follow_up(
    treatment_id: str,
    symptom_status: str = Form(..., description="'improved', 'unchanged', or 'worsened'"),
    notes: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Log an interactive follow-up recovery observation with photographic evidence
    and farmer-reported symptom progression status.
    """
    return TreatmentService.add_recovery_follow_up(
        db=db,
        treatment_id=treatment_id,
        symptom_status=symptom_status,
        notes=notes,
        image_file=image
    )
