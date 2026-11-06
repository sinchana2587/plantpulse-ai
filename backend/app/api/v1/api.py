from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    plants,
    observations,
    dashboard,
    models,
    crops,
    telemetry,
    weather,
    datasets,
    chatbot,
    analyses,
    problems,
    treatments,
    disease_datasets,
    geometric
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & User Security"])
api_router.include_router(crops.router, prefix="/crops", tags=["Crops Catalog"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Agricultural Datasets & Reports"])
api_router.include_router(disease_datasets.router, prefix="/disease-datasets", tags=["Agricultural Disease Gallery & Benchmarks"])
api_router.include_router(chatbot.router, prefix="/chatbot", tags=["PlantPulse Agricultural Assistant"])
api_router.include_router(plants.router, prefix="/plants", tags=["Plants"])
api_router.include_router(analyses.router, prefix="/analyses", tags=["Plant Intelligence & Analyses"])
api_router.include_router(problems.router, prefix="/problems", tags=["Farmer Problem Reports & AI Diagnoses"])
api_router.include_router(treatments.router, prefix="/treatments", tags=["Agricultural Treatment & Recovery Plans"])
api_router.include_router(geometric.router, prefix="/geometric-analyses", tags=["Geometric Anomaly Inspector"])
api_router.include_router(observations.router, prefix="/observations", tags=["Observations"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry & Microclimate"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(models.router, prefix="/models", tags=["AI & Models"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather Comparison"])
