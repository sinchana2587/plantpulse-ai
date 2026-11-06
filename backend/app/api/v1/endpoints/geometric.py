from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.geometric_inspector_service import GeometricInspectorService
from app.schemas.analysis import GeometricAnalysisResponse

router = APIRouter()

@router.get("/{analysis_id}", response_model=GeometricAnalysisResponse)
def get_geometric_analysis_by_id(
    analysis_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve full geometric inspection record, OpenCV contour overlay, and segmentation mask."""
    return GeometricInspectorService.get_analysis_by_id(db, analysis_id)
