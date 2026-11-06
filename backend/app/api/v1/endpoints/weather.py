from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.weather_service import WeatherService

router = APIRouter()

@router.get("/comparison")
def get_temperature_comparison(
    days: int = Query(7, ge=1, le=90, description="Calendar days window (default 7)"),
    location: Optional[str] = Query(None, description="Plot or greenhouse location"),
    db: Session = Depends(get_db)
):
    """
    Transparent comparison between PlantPulse microclimate sensor measurements
    and external regional meteorological weather station temperatures.
    """
    return WeatherService.get_weather_comparison(db, location=location, days=days)
