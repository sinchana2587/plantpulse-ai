@echo off
echo ========================================================
echo Starting PlantPulse AI FastAPI Backend Server
echo ========================================================
cd /d "%~dp0..\backend"
set PYTHONPATH=.
py -3.14 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
