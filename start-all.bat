@echo off
title Burnout AI — Starting...
color 0A

echo.
echo  ██████╗ ██╗   ██╗██████╗ ███╗   ██╗ ██████╗ ██╗   ██╗████████╗
echo  ██╔══██╗██║   ██║██╔══██╗████╗  ██║██╔═══██╗██║   ██║╚══██╔══╝
echo  ██████╔╝██║   ██║██████╔╝██╔██╗ ██║██║   ██║██║   ██║   ██║
echo  ██╔══██╗██║   ██║██╔══██╗██║╚██╗██║██║   ██║██║   ██║   ██║
echo  ██████╔╝╚██████╔╝██║  ██║██║ ╚████║╚██████╔╝╚██████╔╝   ██║
echo  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝    ╚═╝
echo.
echo  Burnout AI — Student Burnout Prediction System
echo  ================================================
echo.

:: ── Step 1: Start the backend ──────────────────────────────────────────────
echo  [1/2] Starting FastAPI backend on http://localhost:8000 ...
start "Burnout Backend" cmd /k "cd /d %~dp0burnout-backend && echo [Backend] Starting... && python -m uvicorn main:app --reload --port 8000 && pause"

:: Wait 3 seconds for backend to initialise before starting frontend
echo  Waiting for backend to initialise...
timeout /t 3 /nobreak > nul

:: ── Step 2: Start the frontend (using local backend) ──────────────────────
echo  [2/2] Starting React frontend on http://localhost:3000 ...
echo  (Using local backend at http://localhost:8000)
echo.
start "Burnout Frontend" cmd /k "cd /d %~dp0burnout-frontend && set REACT_APP_BACKEND=http://localhost:8000 && npm start"

echo.
echo  Both services are starting:
echo    Backend  : http://localhost:8000
echo    Frontend : http://localhost:3000
echo    API docs : http://localhost:8000/docs
echo.
echo  Your browser will open automatically in a few seconds.
echo  Close this window once both terminal windows are running.
echo.
pause
