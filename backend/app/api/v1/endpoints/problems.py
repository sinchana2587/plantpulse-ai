from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_optional_current_user
from app.models.user import User
from app.services.problem_reporting_service import ProblemReportingService
from app.schemas.analysis import (
    PlantProblemResponse,
    ProblemAnalysisResponse
)

router = APIRouter()

@router.get("/{problem_id}", response_model=PlantProblemResponse)
def get_problem_by_id(
    problem_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve details and AI diagnosis for a specific reported plant problem."""
    return ProblemReportingService.get_problem_by_id(db, problem_id)

@router.post("/{problem_id}/analyse", response_model=ProblemAnalysisResponse)
def reanalyze_problem(
    problem_id: str,
    db: Session = Depends(get_db)
):
    """Re-run AI agronomic diagnosis on a reported plant problem."""
    return ProblemReportingService.reanalyze_problem(db, problem_id)
