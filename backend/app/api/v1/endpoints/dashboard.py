from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_optional_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService
from app.services.demo_service import DemoService

router = APIRouter()

@router.get("", response_model=DashboardResponse)
def get_dashboard(
    include_demo: bool = Query(True, description="Whether to include demonstration dataset"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return DashboardService.get_dashboard_summary(db, include_demo=include_demo, user_id=user_id)

@router.post("/seed-demo")
def seed_demo(db: Session = Depends(get_db)):
    plant = DemoService.seed_demo_data(db)
    return {"message": "Demonstration plant created successfully", "plant_id": plant.id}

@router.post("/reset-demo")
def reset_demo(db: Session = Depends(get_db)):
    DemoService.reset_demo_data(db)
    return {"message": "Demonstration data safely reset to baseline"}
