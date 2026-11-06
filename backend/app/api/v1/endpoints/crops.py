from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas.crop import CropCatalogItem

router = APIRouter()

CROP_CATALOG: List[CropCatalogItem] = [
    CropCatalogItem(
        id="tomato",
        name="Tomato",
        scientific_name="Solanum lycopersicum",
        varieties=["Roma", "Cherry", "San Marzano", "Beefsteak", "Pusa Ruby"],
        supported_stages=["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
        has_ai_vision_model=True,
        has_forecasting_model=True,
        base_temperature_c=10.0,
        cutoff_temperature_c=34.0,
        standard_maturity_days=110,
        optimal_moisture_min=50.0,
        optimal_moisture_max=65.0,
        is_active=True,
        model_status_note="Trained production visual classifier (100% test split accuracy) & GDD forecaster."
    ),
    CropCatalogItem(
        id="chilli",
        name="Chilli",
        scientific_name="Capsicum annuum",
        varieties=["Pusa Jwala", "Bird's Eye", "Bell Pepper", "Bhut Jolokia", "Kashmiri Mirch"],
        supported_stages=["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
        has_ai_vision_model=False,
        has_forecasting_model=True,
        base_temperature_c=12.0,
        cutoff_temperature_c=35.0,
        standard_maturity_days=120,
        optimal_moisture_min=45.0,
        optimal_moisture_max=60.0,
        is_active=True,
        model_status_note="Phenology GDD forecaster active. Image classifier in standby (manual classification enabled)."
    ),
    CropCatalogItem(
        id="brinjal",
        name="Brinjal (Eggplant)",
        scientific_name="Solanum melongena",
        varieties=["Pusa Purple Long", "Black Beauty", "Round Purple", "Pusa Kranti"],
        supported_stages=["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
        has_ai_vision_model=False,
        has_forecasting_model=True,
        base_temperature_c=12.0,
        cutoff_temperature_c=35.0,
        standard_maturity_days=130,
        optimal_moisture_min=55.0,
        optimal_moisture_max=70.0,
        is_active=True,
        model_status_note="Phenology GDD forecaster active. Image classifier in standby (manual classification enabled)."
    ),
    CropCatalogItem(
        id="okra",
        name="Okra (Lady's Finger)",
        scientific_name="Abelmoschus esculentus",
        varieties=["Pusa Sawani", "Arka Anamika", "Clemson Spineless", "Parbhani Kranti"],
        supported_stages=["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
        has_ai_vision_model=False,
        has_forecasting_model=True,
        base_temperature_c=15.0,
        cutoff_temperature_c=38.0,
        standard_maturity_days=65,
        optimal_moisture_min=50.0,
        optimal_moisture_max=65.0,
        is_active=True,
        model_status_note="Phenology GDD forecaster active. Image classifier in standby (manual classification enabled)."
    ),
    CropCatalogItem(
        id="cucumber",
        name="Cucumber",
        scientific_name="Cucumis sativus",
        varieties=["Japanese Long", "Poona Kheera", "Poinsett", "Straight Eight"],
        supported_stages=["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
        has_ai_vision_model=False,
        has_forecasting_model=True,
        base_temperature_c=10.0,
        cutoff_temperature_c=35.0,
        standard_maturity_days=55,
        optimal_moisture_min=60.0,
        optimal_moisture_max=75.0,
        is_active=True,
        model_status_note="Phenology GDD forecaster active. Image classifier in standby (manual classification enabled)."
    ),
    CropCatalogItem(
        id="banana",
        name="Banana",
        scientific_name="Musa spp.",
        varieties=["Grand Naine", "Dwarf Cavendish", "Robusta", "Red Banana", "Nendran"],
        supported_stages=["Vegetative", "Pseudostem Emergence", "Inflorescence", "Fruit Development", "Harvest Maturity"],
        has_ai_vision_model=False,
        has_forecasting_model=True,
        base_temperature_c=14.0,
        cutoff_temperature_c=38.0,
        standard_maturity_days=330,
        optimal_moisture_min=60.0,
        optimal_moisture_max=75.0,
        is_active=True,
        model_status_note="Phenology GDD forecaster active. Image classifier in training pipeline (manual classification enabled)."
    ),
]

@router.get("", response_model=List[CropCatalogItem])
def get_crop_catalog():
    """Retrieve full catalog of supported crops with agronomic parameters and model availability."""
    return CROP_CATALOG

@router.get("/{crop_id}", response_model=CropCatalogItem)
def get_crop(crop_id: str):
    """Retrieve single crop configuration by ID or name."""
    clean_id = crop_id.lower().strip()
    for crop in CROP_CATALOG:
        if crop.id == clean_id or crop.name.lower() == clean_id:
            return crop
    raise HTTPException(status_code=404, detail=f"Crop '{crop_id}' not found in catalog.")
