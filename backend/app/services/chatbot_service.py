import json
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User, ChatMessage
from app.models.plant import Plant
from app.models.observation import Observation
from app.models.forecast import Forecast
from app.services.dataset_service import CROP_AGRONOMY_DATABASE

OFF_TOPIC_REJECTION = (
    "I am PlantPulse Agricultural Assistant. I can help you with agriculture, crop growth, "
    "plant monitoring, environmental conditions and farming-related questions."
)

# Off-topic patterns
DISALLOWED_PATTERNS = [
    r"\b(python|javascript|typescript|c\+\+|java|html|css|react|vue|angular|docker|kubernetes|sql|regex|api|backend|frontend)\b",
    r"\b(crypto|bitcoin|ethereum|nft|blockchain|stock\s*market|forex|trading)\b",
    r"\b(movie|film|actor|actress|hollywood|bollywood|netflix|cinema|song|album|singer)\b",
    r"\b(cricket|ipl|football|fifa|nba|tennis|olympics|sports\s*score)\b",
    r"\b(election|political\s*party|president|prime\s*minister|parliament|congress|bjp)\b",
    r"\b(playstation|xbox|nintendo|video\s*game|fortnite|minecraft)\b",
]

# Agriculture domain triggers
AGRI_KEYWORDS = [
    "plant", "crop", "grow", "growth", "stage", "seed", "seedling", "vegetative",
    "flower", "flowering", "fruit", "fruiting", "mature", "maturity", "harvest",
    "soil", "moisture", "temperature", "humidity", "sunlight", "rainfall", "water",
    "irrigation", "fertilizer", "nutrient", "nitrogen", "phosphorus", "potassium",
    "pest", "disease", "fungus", "blight", "wilt", "leaf", "leaves", "root",
    "stem", "shoot", "yield", "tomato", "chilli", "pepper", "brinjal", "eggplant",
    "okra", "cucumber", "banana", "musa", "greenhouse", "polyhouse", "farming",
    "farmer", "agronomy", "gdd", "degree days", "forecast", "prediction", "milestone",
    "report", "telemetry", "drip", "weather", "calcium", "blossom end rot", "aphid"
]

class ChatbotService:

    @classmethod
    def is_agricultural_topic(cls, query: str) -> bool:
        """
        Validates that the user's inquiry strictly pertains to agriculture,
        plant phenology, crop management, or environmental conditions.
        """
        clean_text = query.lower().strip()
        
        # Check against strictly prohibited off-topic themes
        for pattern in DISALLOWED_PATTERNS:
            if re.search(pattern, clean_text):
                # Ensure it's not a rare compound agricultural term
                has_agri = any(k in clean_text for k in ["plant", "crop", "soil", "harvest", "irrigation", "fertilizer"])
                if not has_agri:
                    return False

        # Must match at least one agricultural context token or pronoun + plant reference
        has_agri_keyword = any(k in clean_text for k in AGRI_KEYWORDS)
        if has_agri_keyword:
            return True
            
        # Common greeting exceptions
        if clean_text in ["hello", "hi", "hey", "namaste", "vanakkam", "help"]:
            return True

        return False

    @classmethod
    def answer_query(
        cls,
        db: Session,
        user: User,
        user_message: str,
        plant_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes user question, enforces strict agricultural domain guardrails,
        retrieves authenticated user plant context if requested, and produces factual guidance.
        """
        clean_msg = user_message.strip()

        # 1. Enforce domain filtering
        if not cls.is_agricultural_topic(clean_msg):
            # Save interaction in history
            cls._save_message(db, user.id, "user", clean_msg, plant_id=plant_id)
            cls._save_message(db, user.id, "assistant", OFF_TOPIC_REJECTION, plant_id=plant_id)
            return {
                "response": OFF_TOPIC_REJECTION,
                "is_agricultural": False,
                "sources": [],
                "plant_context_used": False
            }

        # 2. Check if user is asking about their personal plant
        target_plant: Optional[Plant] = None
        if plant_id:
            target_plant = db.query(Plant).filter(Plant.id == plant_id, Plant.user_id == user.id).first()
        else:
            # Check if text references "my plant", "my tomato", etc.
            user_plants = db.query(Plant).filter(Plant.user_id == user.id).all()
            for p in user_plants:
                if p.name.lower() in clean_msg.lower() or p.crop_type.lower() in clean_msg.lower():
                    target_plant = p
                    break

        sources: List[str] = []
        response_text: str = ""

        # Case A: Personalized query about user's own plant
        if target_plant:
            plant_name = target_plant.name
            crop_type = target_plant.crop_type
            crop_variety = target_plant.crop_variety
            
            # Fetch latest observations and forecast
            latest_obs = (
                db.query(Observation)
                .filter(Observation.plant_id == target_plant.id)
                .order_by(Observation.observation_date.desc())
                .first()
            )
            latest_fc = (
                db.query(Forecast)
                .filter(Forecast.plant_id == target_plant.id, Forecast.is_latest == True)
                .first()
            )

            current_stage = latest_obs.effective_stage if latest_obs else "Seedling (Awaiting first observation)"
            sources.append(f"Private User Record: {plant_name} ({crop_type} - {crop_variety})")

            # Check question intent
            q_lower = clean_msg.lower()
            if any(k in q_lower for k in ["stage", "current", "how is", "status"]):
                response_text = (
                    f"Your plant **{plant_name}** ({crop_type} '{crop_variety}') is currently in the **{current_stage}** stage."
                )
                if latest_obs and latest_obs.observation_date:
                    response_text += f" This was confirmed in your latest observation on {latest_obs.observation_date.strftime('%B %d, %Y')}."
                if latest_obs and latest_obs.soil_moisture:
                    response_text += f" Recorded root-zone soil moisture was **{latest_obs.soil_moisture}%**."
            elif any(k in q_lower for k in ["water", "soil", "moisture", "irrigation"]):
                if latest_obs and latest_obs.soil_moisture:
                    m = latest_obs.soil_moisture
                    response_text = f"The latest recorded soil moisture for **{plant_name}** is **{m}%**."
                    if m < 50:
                        response_text += " This is below the optimal 55-65% target for this crop. Consider applying irrigation."
                    elif m > 75:
                        response_text += " This indicates high soil moisture. Ensure root aeration and avoid overwatering."
                    else:
                        response_text += " This level is within the healthy agronomic range for active root uptake."
                else:
                    response_text = f"You haven't logged a recent soil moisture reading for **{plant_name}**. Please record an observation with soil moisture to track root hydration."
            elif any(k in q_lower for k in ["flower", "flowering", "when", "milestone", "harvest", "fruit"]):
                if latest_fc and latest_fc.predicted_flowering_start:
                    response_text = (
                        f"Based on GDD thermal accumulation for **{plant_name}**, projected developmental windows are:\n"
                        f"- **Flowering Window:** {latest_fc.predicted_flowering_start} to {latest_fc.predicted_flowering_end}\n"
                        f"- **Fruit Formation:** {latest_fc.predicted_fruit_start} to {latest_fc.predicted_fruit_end}\n"
                        f"- **Estimated Harvest:** {latest_fc.predicted_harvest_start} to {latest_fc.predicted_harvest_end}"
                    )
                    sources.append("Phenology GDD Engine v1.1.0")
                else:
                    response_text = f"Phenological forecasts require at least one verified growth observation. Please submit a photograph of **{plant_name}** to calculate milestone windows."
            else:
                response_text = (
                    f"**{plant_name}** ({crop_type}) is registered in your crop inventory planted on {target_plant.planting_date}. "
                    f"Current growth stage: **{current_stage}**. "
                    "You can ask me about its soil moisture, predicted flowering or harvest windows, or crop care recommendations."
                )
            
            cls._save_message(db, user.id, "user", clean_msg, plant_id=target_plant.id)
            cls._save_message(db, user.id, "assistant", response_text, plant_id=target_plant.id, sources=sources)
            return {
                "response": response_text,
                "is_agricultural": True,
                "sources": sources,
                "plant_context_used": True,
                "plant_name": plant_name
            }

        # Case B: General agricultural agronomy inquiries
        q_lower = clean_msg.lower()
        matched_crop = None
        for crop_key, crop_info in CROP_AGRONOMY_DATABASE.items():
            if crop_key in q_lower or crop_info["name"].lower() in q_lower:
                matched_crop = crop_info
                break

        if matched_crop:
            crop_name = matched_crop["name"]
            sources.append(f"ICAR/FAO Agronomy Reference Library — {crop_name}")
            
            if any(k in q_lower for k in ["stage", "phases", "lifecycle"]):
                stages_list = [f"**{s['stage']}** ({s['days_range']} days): {s['key_signs']}" for s in matched_crop["growth_stages"]]
                response_text = f"**Growth Stages of {crop_name} ({matched_crop['scientific_name']}):**\n\n" + "\n\n".join(stages_list)
            elif any(k in q_lower for k in ["soil", "ph", "earth"]):
                soil = matched_crop["soil_requirements"]
                response_text = f"**Soil Requirements for {crop_name}:**\n- Type: {soil['type']}\n- Optimal pH: {soil['optimal_ph']}\n- Drainage: {soil['drainage']}"
            elif any(k in q_lower for k in ["temperature", "heat", "cold", "temp"]):
                temp = matched_crop["temperature_requirements"]
                response_text = f"**Temperature Requirements for {crop_name}:**\n- Base Growth Temp (T_base): {temp['t_base']}°C\n- Optimal Day Temp: {temp['optimal_day']}\n- Optimal Night Temp: {temp['optimal_night']}\n- Upper Thermal Cutoff: {temp['t_cutoff']}°C"
            elif any(k in q_lower for k in ["water", "moisture", "irrigation"]):
                water = matched_crop["water_requirements"]
                response_text = f"**Water and Soil Moisture for {crop_name}:**\n- Target Root Moisture: {water['optimal_soil_moisture']}\n- Critical Period: {water['critical_period']}"
            elif any(k in q_lower for k in ["stress", "disease", "pest", "yellow"]):
                stresses = [f"**{st['stress']}**: {st['cause']}" for st in matched_crop["common_stresses"]]
                response_text = f"**Common Stresses & Disorders in {crop_name}:**\n\n" + "\n\n".join(stresses) + "\n\n*Safety Advisory: For severe pathogen outbreaks, consult your local Krishi Vigyan Kendra (KVK) or agricultural extension officer before applying chemical fungicides.*"
            else:
                response_text = (
                    f"**{crop_name}** (*{matched_crop['scientific_name']}*) is in the family *{matched_crop['family']}*.\n\n"
                    f"{matched_crop['overview']}\n\n"
                    f"- **Common Varieties:** {', '.join(matched_crop['varieties'][:4])}\n"
                    f"- **Optimal Temperature:** {matched_crop['temperature_requirements']['optimal_day']}\n"
                    f"- **Soil Moisture Target:** {matched_crop['water_requirements']['optimal_soil_moisture']}"
                )
        else:
            # General precision agriculture / PlantPulse methodology question
            sources.append("PlantPulse AI Precision Agronomy Handbook")
            response_text = (
                "Welcome to **PlantPulse Agricultural Assistant**! I can assist you with:\n\n"
                "1. **Your Registered Plants:** Ask me *'What is the growth stage of my plant?'* or *'When will my tomato flower?'*\n"
                "2. **Crop Agronomy:** Ask about soil, optimal temperature, moisture targets, and growth stages for Tomato, Chilli, Brinjal, Okra, Cucumber, or Banana.\n"
                "3. **Milestone Forecasting:** Understand how Growing Degree Days (GDD) and microclimate telemetry calculate harvest windows.\n\n"
                "*How can I assist your crop monitoring today?*"
            )

        cls._save_message(db, user.id, "user", clean_msg, plant_id=plant_id)
        cls._save_message(db, user.id, "assistant", response_text, plant_id=plant_id, sources=sources)

        return {
            "response": response_text,
            "is_agricultural": True,
            "sources": sources,
            "plant_context_used": False
        }

    @classmethod
    def get_history(cls, db: Session, user: User, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent conversation messages for the authenticated user."""
        msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user.id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "sources": json.loads(m.sources_json) if m.sources_json else [],
                "created_at": m.created_at.strftime("%Y-%m-%d %H:%M:%S")
            }
            for m in msgs
        ]

    @classmethod
    def clear_history(cls, db: Session, user: User) -> bool:
        """Clears chatbot history for the authenticated user."""
        db.query(ChatMessage).filter(ChatMessage.user_id == user.id).delete()
        db.commit()
        return True

    @classmethod
    def _save_message(
        cls,
        db: Session,
        user_id: str,
        role: str,
        content: str,
        plant_id: Optional[str] = None,
        sources: Optional[List[str]] = None
    ):
        msg = ChatMessage(
            user_id=user_id,
            role=role,
            content=content,
            sources_json=json.dumps(sources) if sources else None,
            plant_id=plant_id
        )
        db.add(msg)
        db.commit()
