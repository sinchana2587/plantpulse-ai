import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Plant(Base):
    __tablename__ = "plants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    crop_type = Column(String(50), nullable=False, default="Tomato")
    crop_variety = Column(String(50), nullable=False, default="Standard")
    planting_date = Column(Date, nullable=False)
    location = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="plants")
    observations = relationship("Observation", back_populates="plant", cascade="all, delete-orphan", order_by="Observation.observation_date")
    forecasts = relationship("Forecast", back_populates="plant", cascade="all, delete-orphan", order_by="desc(Forecast.created_at)")
