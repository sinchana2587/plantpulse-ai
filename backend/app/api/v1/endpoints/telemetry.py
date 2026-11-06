from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.telemetry import (
    TelemetryReadingCreate,
    TelemetryReadingResponse,
    TelemetrySummaryResponse
)
from app.services.telemetry_service import TelemetryService

router = APIRouter()

@router.get("/summary", response_model=TelemetrySummaryResponse)
def get_telemetry_summary(
    range: str = Query("all", description="24h, 7d, 30d, 90d, all"),
    plant_id: Optional[str] = Query(None, description="Optional plant filter"),
    crop_type: Optional[str] = Query(None, description="Optional crop filter"),
    source: Optional[str] = Query(None, description="Filter data source: IOT_SENSOR, MANUAL_ENTRY, EXTERNAL_IMPORT"),
    data_source: Optional[str] = Query(None, description="Alias for source filter"),
    include_demo: bool = Query(True, description="Whether to include demonstration baseline records"),
    db: Session = Depends(get_db)
):
    """Retrieve traceable environmental telemetry summary calculated from real database readings."""
    src = data_source or source
    return TelemetryService.get_summary(
        db,
        range_key=range,
        plant_id=plant_id,
        crop_type=crop_type,
        data_source=src,
        include_demo=include_demo
    )

@router.get("/readings", response_model=List[TelemetryReadingResponse])
def get_telemetry_readings(
    parameter: Optional[str] = Query(None, description="temperature, soil_moisture, humidity, sunlight_hours, rainfall"),
    range: str = Query("all", description="24h, 7d, 30d, 90d, all"),
    plant_id: Optional[str] = Query(None, description="Filter by plant"),
    crop_type: Optional[str] = Query(None, description="Filter by crop"),
    source: Optional[str] = Query(None, description="Filter data source: IOT_SENSOR, MANUAL_ENTRY, EXTERNAL_IMPORT"),
    data_source: Optional[str] = Query(None, description="Alias for source filter"),
    include_demo: bool = Query(True, description="Whether to include demonstration records"),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Retrieve individual verified telemetry readings with units and source provenance."""
    src = data_source or source
    return TelemetryService.get_readings(
        db,
        parameter=parameter,
        range_key=range,
        plant_id=plant_id,
        crop_type=crop_type,
        data_source=src,
        limit=limit,
        include_demo=include_demo
    )

@router.post("/readings", response_model=TelemetryReadingResponse, status_code=status.HTTP_201_CREATED)
def record_reading(
    reading_in: TelemetryReadingCreate,
    db: Session = Depends(get_db)
):
    """Ingest and validate standalone IoT sensor reading or user measurement."""
    reading = TelemetryService.validate_and_record(db, reading_in, plant_id=reading_in.plant_id, observation_id=reading_in.observation_id)
    return TelemetryReadingResponse(
        id=reading.id,
        plant_id=reading.plant_id,
        plant_name=reading.plant.name if reading.plant else None,
        crop_type=reading.plant.crop_type if reading.plant else None,
        observation_id=reading.observation_id,
        parameter_name=reading.parameter_name,
        value=reading.value,
        unit=reading.unit,
        timestamp=reading.timestamp,
        data_source=reading.data_source,
        sensor_id=reading.sensor_id,
        validation_status=reading.validation_status
    )
