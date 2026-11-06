from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class TelemetryReadingCreate(BaseModel):
    plant_id: str
    parameter_name: str = Field(..., description="temperature, soil_moisture, humidity, sunlight_hours, rainfall")
    value: float
    unit: str = Field(..., example="°C")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)
    data_source: str = Field(default="MANUAL_ENTRY", description="MANUAL_ENTRY, IOT_SENSOR, EXTERNAL_IMPORT")
    sensor_id: Optional[str] = None
    observation_id: Optional[str] = None

class TelemetryReadingResponse(BaseModel):
    id: str
    plant_id: str
    plant_name: Optional[str] = None
    crop_type: Optional[str] = None
    observation_id: Optional[str] = None
    parameter_name: str
    value: float
    unit: str
    timestamp: datetime
    data_source: str
    sensor_id: Optional[str] = None
    validation_status: str

    class Config:
        from_attributes = True

class ParameterStat(BaseModel):
    parameter_name: str
    unit: str
    mean: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    readings_count: int = 0
    plants_count: int = 0
    formula: str = "Arithmetic mean: Sum(valid readings) / Count"
    per_plant_averages: Dict[str, float] = {}
    source_breakdown: Dict[str, int] = {}
    latest_reading: Optional[float] = None
    latest_timestamp: Optional[datetime] = None

class TelemetrySummaryResponse(BaseModel):
    date_range_label: str
    total_readings_count: int
    source_breakdown: Dict[str, int]
    parameters: Dict[str, ParameterStat]
    average_temperature: Optional[float] = None
    average_soil_moisture: Optional[float] = None
    average_humidity: Optional[float] = None
    average_sunlight_hours: Optional[float] = None
    total_rainfall: Optional[float] = None
    is_data_available: bool = True
    calculation_timestamp: datetime = Field(default_factory=datetime.utcnow)
    calculation_methodology: str = "Arithmetic mean of verified sensor and manual telemetry within time window"
    demonstration_mode: bool = False
