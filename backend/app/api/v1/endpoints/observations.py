from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_optional_current_user
from app.models.user import User
from app.schemas.observation import (
    ObservationResponse,
    ImageAnalysisResponse,
    ObservationStageCorrection,
    PaginatedObservationResponse
)
from app.services.observation_service import ObservationService
from app.services.forecast_service import ForecastService

router = APIRouter()

@router.get("", response_model=PaginatedObservationResponse)
def get_observations(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    crop_type: Optional[str] = Query(None, description="Filter by crop (Tomato, Chilli, etc.)"),
    plant_id: Optional[str] = Query(None, description="Filter by plant UUID"),
    growth_stage: Optional[str] = Query(None, description="Filter by growth stage"),
    stage: Optional[str] = Query(None, description="Alias filter for growth stage"),
    search: Optional[str] = Query(None, description="Search plant name or location"),
    include_demo: bool = Query(True, description="Whether to include demonstration observations"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve paginated, database-derived plant observations with filtering and search."""
    effective_stage_filter = stage or growth_stage
    user_id = current_user.id if current_user else None
    return ObservationService.get_all_observations(
        db=db,
        page=page,
        page_size=page_size,
        crop_type=crop_type,
        plant_id=plant_id,
        growth_stage=effective_stage_filter,
        search=search,
        include_demo=include_demo,
        user_id=user_id
    )

@router.get("/{observation_id}", response_model=ObservationResponse)
def get_observation(observation_id: str, db: Session = Depends(get_db)):
    obs = ObservationService.get_observation_by_id(db, observation_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    return ObservationService._to_response(obs)

@router.post("/{observation_id}/analyse", response_model=ImageAnalysisResponse)
def analyse_observation(observation_id: str, db: Session = Depends(get_db)):
    res = ObservationService.analyze_observation_image(db, observation_id)
    # Refresh forecast with updated classification
    obs = ObservationService.get_observation_by_id(db, observation_id)
    if obs:
        ForecastService.generate_and_save_forecast(db, obs.plant_id)
    return res

@router.patch("/{observation_id}/stage", response_model=ObservationResponse)
def correct_growth_stage(
    observation_id: str,
    correction: ObservationStageCorrection,
    db: Session = Depends(get_db)
):
    obs = ObservationService.correct_growth_stage(db, observation_id, correction.manual_growth_stage)
    # Re-evaluate forecast
    ForecastService.generate_and_save_forecast(db, obs.plant_id)
    return obs
