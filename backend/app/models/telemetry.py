import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class TelemetryReading(Base):
    __tablename__ = "telemetry_readings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    observation_id = Column(String(36), ForeignKey("observations.id", ondelete="SET NULL"), nullable=True, index=True)
    parameter_name = Column(String(50), nullable=False, index=True)  # temperature, soil_moisture, humidity, sunlight_hours, rainfall
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)  # °C, %, hrs, mm
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    data_source = Column(String(50), nullable=False, default="MANUAL_ENTRY")  # MANUAL_ENTRY, IOT_SENSOR, EXTERNAL_IMPORT
    sensor_id = Column(String(50), nullable=True)
    validation_status = Column(String(20), nullable=False, default="VALID")  # VALID, FLAGGED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    plant = relationship("Plant", backref="telemetry_readings")
    observation = relationship("Observation", backref="telemetry_readings")

    __table_args__ = (
        Index("idx_telemetry_param_time", "parameter_name", "timestamp"),
        Index("idx_telemetry_plant_param", "plant_id", "parameter_name"),
    )
