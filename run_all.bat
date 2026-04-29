@echo off
TITLE Intelligent IDS - Starter
echo ==========================================
echo    🛡️ STARTING INTELLIGENT IDS SYSTEM
echo ==========================================
echo.

:: 1. Start Backend
echo [1/3] Starting Backend Server...
start "IDS Backend" cmd /c "cd Backend && npm run dev"
timeout /t 2 > nul

:: 2. Start Dashboard
echo [2/3] Starting Dashboard UI (Port 3001)...
start "IDS Dashboard" cmd /c "cd Dashboard && npm run dev"
timeout /t 2 > nul

:: 3. Start IDS Engine
echo [3/3] Starting IDS Engine (Python)...
echo NOTE: Ensure you are running as Administrator for packet capture.
start "IDS Engine" cmd /c "cd IDS && python ids.py -i "Wi-Fi""

echo.
echo ==========================================
echo    🚀 ALL SERVICES LAUNCHED
echo ==========================================
echo.
pause
