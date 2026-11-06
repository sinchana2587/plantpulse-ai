import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Observation(Base):
    __tablename__ = "observations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    observation_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    image_path = Column(String(255), nullable=True)
    
    # Environmental Data
    temperature = Column(Float, nullable=True)  # °C
    humidity = Column(Float, nullable=True)     # %
    soil_moisture = Column(Float, nullable=True) # %
    sunlight_hours = Column(Float, nullable=True) # hours/day
    rainfall = Column(Float, nullable=True)     # mm
    
    # Growth Stage
    manual_growth_stage = Column(String(50), nullable=True)
    ai_growth_stage = Column(String(50), nullable=True)
    confidence_score = Column(Float, nullable=True)
    stage_scores_json = Column(Text, nullable=True)
    model_version = Column(String(50), nullable=True)
    
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    plant = relationship("Plant", back_populates="observations")

    @property
    def effective_stage(self) -> str:
        if self.manual_growth_stage:
            return self.manual_growth_stage
        if self.ai_growth_stage:
            return self.ai_growth_stage
        return "Unknown"
