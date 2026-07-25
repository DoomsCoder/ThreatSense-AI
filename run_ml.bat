@echo off
echo ================================================
echo   ThreatSense AI — ML Engine Runner
echo ================================================
echo.
echo [Step 1] Installing Python dependencies...
cd ml-engine
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed. Make sure Python 3.x is installed and in PATH.
    pause
    exit /b 1
)

echo.
echo [Step 2] Running data generation + model training...
python generate_and_train.py
if %errorlevel% neq 0 (
    echo [ERROR] Script failed. Check the error above.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   SUCCESS! threat_data.json created in /shared
echo   You can now start the Spring Boot backend.
echo ================================================
pause
