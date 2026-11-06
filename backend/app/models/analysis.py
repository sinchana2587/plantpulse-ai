import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class PlantAnalysis(Base):
    __tablename__ = "plant_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    observation_id = Column(String(36), ForeignKey("observations.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Image analyzed
    image_path = Column(String(255), nullable=True)
    analysis_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Growth Stage Classification
    predicted_stage = Column(String(50), nullable=False)
    confidence_score = Column(Float, nullable=False, default=0.85)
    model_name = Column(String(100), default="RandomForestGrowthStageClassifier")
    model_version = Column(String(50), default="1.0.0")
    inference_time_ms = Column(Float, default=45.0)
    
    # Visual Cues & Botanical Indices (JSON string)
    visual_cues = Column(Text, nullable=True)
    
    # Growth Progress & Cumulative GDD (JSON string)
    growth_progress = Column(Text, nullable=True)
    
    # Future Development & Milestones (JSON string)
    future_development = Column(Text, nullable=True)
    
    # Plant Health & Problem Assessment (JSON string)
    health_assessment = Column(Text, nullable=True)
    health_score = Column(Integer, default=85) # 0 to 100
    health_status = Column(String(50), default="Healthy") # Healthy, Low Stress, Moderate Stress, High Concern
    
    # Environmental Microclimate Correlation (JSON string)
    environmental_correlation = Column(Text, nullable=True)
    
    # Agronomic Precautions & Recommendations (JSON string)
    recommendations = Column(Text, nullable=True)
    
    # Next Best Observation Suggestion (JSON string)
    next_best_observation = Column(Text, nullable=True)
    
    # Agricultural Knowledge & Citations (JSON string)
    citations = Column(Text, nullable=True)
    
    # User Verification / Feedback
    user_feedback = Column(String(50), nullable=True) # "accurate", "inaccurate", etc.
    user_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    plant = relationship("Plant", backref="analyses")
    observation = relationship("Observation", backref="analyses")


class PlantProblem(Base):
    __tablename__ = "plant_problems"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    category = Column(String(100), nullable=False) # Leaf Yellowing, Stunted Growth, Wilting, Fruit Drop, etc.
    description = Column(Text, nullable=False)
    affected_part = Column(String(100), default="Whole plant") # Leaves, Stem, Flowers, Fruit, Roots
    onset_date = Column(String(50), nullable=True)
    is_spreading = Column(String(20), default="unsure") # yes, no, unsure
    irrigation_notes = Column(Text, nullable=True)
    fertilizer_notes = Column(Text, nullable=True)
    image_path = Column(String(255), nullable=True)
    
    status = Column(String(50), default="reported") # reported, analyzed, resolved
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    plant = relationship("Plant", backref="problems")
    analyses = relationship("ProblemAnalysis", back_populates="problem", cascade="all, delete-orphan")


class ProblemAnalysis(Base):
    __tablename__ = "problem_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_id = Column(String(36), ForeignKey("plant_problems.id", ondelete="CASCADE"), nullable=False, index=True)
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    summary = Column(Text, nullable=False)
    severity = Column(String(50), default="Moderate") # Low, Moderate, High, Severe
    probable_causes = Column(Text, nullable=False) # JSON: [{cause, likelihood, reasoning, evidence}]
    recommended_actions = Column(Text, nullable=False) # JSON: [actions]
    precautions = Column(Text, nullable=False) # JSON: [precautions]
    follow_up_schedule = Column(String(200), nullable=True)
    expert_guidance = Column(Text, nullable=True)
    icar_fao_citations = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    problem = relationship("PlantProblem", back_populates="analyses")
    plant = relationship("Plant")


class DigitalTwinSnapshot(Base):
    __tablename__ = "digital_twin_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_date = Column(DateTime, default=datetime.utcnow)
    
    crop_type = Column(String(50), nullable=False)
    chronological_age_days = Column(Integer, nullable=False)
    expected_gdd = Column(Float, nullable=False)
    actual_gdd = Column(Float, nullable=False)
    expected_stage = Column(String(50), nullable=False)
    actual_stage = Column(String(50), nullable=False)
    deviation_days = Column(Integer, default=0) # positive: ahead, negative: behind
    deviation_status = Column(String(50), default="Within Expected Range") # Within Expected Range, Faster Than Reference, Slower Than Reference, Potential Growth Concern, Insufficient Data
    deviation_reasons = Column(Text, nullable=True) # JSON
    
    created_at = Column(DateTime, default=datetime.utcnow)
    plant = relationship("Plant")


class TreatmentPlan(Base):
    __tablename__ = "treatment_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    problem_id = Column(String(36), ForeignKey("plant_problems.id", ondelete="SET NULL"), nullable=True, index=True)
    
    plant_name = Column(String(100), nullable=False)
    crop_type = Column(String(50), nullable=False)
    crop_variety = Column(String(50), nullable=False)
    condition_name = Column(String(100), nullable=False)
    severity = Column(String(50), default="Moderate")
    
    problem_summary = Column(Text, nullable=False)
    possible_cause = Column(Text, nullable=False)
    evidence_notes = Column(Text, nullable=True)
    immediate_precautions = Column(Text, nullable=False) # JSON list
    recommended_practices = Column(Text, nullable=False) # JSON list
    monitoring_instructions = Column(Text, nullable=True)
    follow_up_timeline = Column(String(100), default="48 - 72 Hours")
    expected_improvement_signs = Column(Text, nullable=True)
    expert_assistance_guidance = Column(Text, nullable=True)
    references = Column(Text, nullable=True) # JSON list
    
    status = Column(String(50), default="active") # active, in_progress, resolved
    treatment_start_date = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    plant = relationship("Plant", backref="treatment_plans")
    actions = relationship("TreatmentAction", back_populates="treatment_plan", cascade="all, delete-orphan", order_by="TreatmentAction.created_at")
    recovery_observations = relationship("RecoveryObservation", back_populates="treatment_plan", cascade="all, delete-orphan", order_by="RecoveryObservation.observation_date.desc()")


class TreatmentAction(Base):
    __tablename__ = "treatment_actions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    treatment_plan_id = Column(String(36), ForeignKey("treatment_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    action_text = Column(Text, nullable=False)
    action_type = Column(String(50), default="cultural") # immediate, cultural, monitoring, precaution
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    treatment_plan = relationship("TreatmentPlan", back_populates="actions")


class RecoveryObservation(Base):
    __tablename__ = "recovery_observations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    treatment_plan_id = Column(String(36), ForeignKey("treatment_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    observation_date = Column(DateTime, default=datetime.utcnow)
    image_path = Column(String(255), nullable=True)
    symptom_status = Column(String(50), default="unchanged") # improved, unchanged, worsened
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    treatment_plan = relationship("TreatmentPlan", back_populates="recovery_observations")
    plant = relationship("Plant")


class GeometricAnalysisResult(Base):
    __tablename__ = "geometric_analysis_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plant_id = Column(String(36), ForeignKey("plants.id", ondelete="CASCADE"), nullable=False, index=True)
    observation_id = Column(String(36), ForeignKey("observations.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    original_image_path = Column(String(255), nullable=False)
    processed_overlay_path = Column(String(255), nullable=False)
    mask_image_path = Column(String(255), nullable=False)
    
    leaf_area_px = Column(Float, nullable=False)
    perimeter_px = Column(Float, nullable=False)
    aspect_ratio = Column(Float, nullable=False)
    circularity = Column(Float, nullable=False)
    convexity = Column(Float, nullable=False)
    asymmetry_index = Column(Float, nullable=False)
    canopy_coverage_pct = Column(Float, nullable=False)
    relative_area_change_pct = Column(Float, default=0.0)
    
    anomaly_flags = Column(Text, nullable=True) # JSON list
    anomaly_score = Column(Float, default=0.0)
    reliability = Column(String(50), default="High")
    interpretation = Column(Text, nullable=False)
    limitations_disclaimer = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    plant = relationship("Plant")

