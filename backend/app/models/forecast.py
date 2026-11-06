import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    forecast_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    current_stage = Column(String(50), nullable=False)
    method = Column(String(100), nullable=False)  # e.g., "Phenology-GDD Hybrid Forecaster"
    model_version = Column(String(50), nullable=False, default="1.0.0")
    observations_used_count = Column(Integer, default=0, nullable=False)
    
    # Milestone Windows
    flowering_start = Column(Date, nullable=True)
    flowering_end = Column(Date, nullable=True)
    
    fruit_formation_start = Column(Date, nullable=True)
    fruit_formation_end = Column(Date, nullable=True)
    
    maturity_start = Column(Date, nullable=True)
    maturity_end = Column(Date, nullable=True)
    
    harvest_window_start = Column(Date, nullable=True)
    harvest_window_end = Column(Date, nullable=True)

    # Detailed Explainability JSONs
    environmental_factors_json = Column(Text, nullable=True)
    assumptions_json = Column(Text, nullable=True)
    limitations_json = Column(Text, nullable=True)
    recommendations_json = Column(Text, nullable=True)

    is_latest = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    plant = relationship("Plant", back_populates="forecasts")
