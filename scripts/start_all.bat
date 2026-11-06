@echo off
echo ========================================================
echo Launching PlantPulse AI (Backend + Frontend)
echo ========================================================
echo Starting Backend API on http://127.0.0.1:8000
start "PlantPulse AI Backend" cmd /k "call "%~dp0run_backend.bat""

timeout /t 3 /nobreak >nul

echo Starting Frontend UI on http://localhost:5173
start "PlantPulse AI Frontend" cmd /k "call "%~dp0run_frontend.bat""

echo Application launching...
echo Backend API Docs: http://127.0.0.1:8000/api/v1/docs
echo Frontend Web UI:  http://localhost:5173
