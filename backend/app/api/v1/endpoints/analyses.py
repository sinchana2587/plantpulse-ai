from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_optional_current_user
from app.models.user import User
from app.services.plant_analysis_service import PlantAnalysisService
from app.services.digital_twin_service import DigitalTwinService
from app.schemas.analysis import (
    PlantAnalysisResponse,
    DigitalTwinResponse,
    WhatIfRequest,
    WhatIfResponse,
    NextBestObservationData,
    AnalysisFeedbackRequest
)

router = APIRouter()

@router.get("/{analysis_id}", response_model=PlantAnalysisResponse)
def get_analysis_by_id(
    analysis_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve a complete historical AI analysis report (Sections A through I)."""
    return PlantAnalysisService.get_analysis_by_id(db, analysis_id)

@router.post("/{analysis_id}/feedback")
def submit_analysis_feedback(
    analysis_id: str,
    feedback_in: AnalysisFeedbackRequest,
    db: Session = Depends(get_db)
):
    """Record farmer validation or correction feedback on an AI analysis report."""
    return PlantAnalysisService.record_feedback(db, analysis_id, feedback_in.feedback, feedback_in.notes)
