@echo off
echo ========================================
echo Deploy Prefect Flows
echo ========================================
echo.

REM Navigate to project root (one level up from scripts/)
cd /d "%~dp0.."

REM Check if we're in the right directory
if not exist "backend\orchestration\deploy_flows.py" (
    echo ERROR: backend\orchestration\deploy_flows.py not found!
    echo Current directory: %CD%
    echo Please ensure the project structure is correct.
    pause
    exit /b 1
)

echo [1/2] Checking Python virtual environment...
if not exist "venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found!
    echo Please create a virtual environment first:
    echo   py -3.13 -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)
echo Virtual environment found!

echo.
echo [2/2] Checking Prefect server...
echo Make sure Prefect server is running:
echo   prefect server start
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Deploying Prefect flows...
echo Schedule: ETL runs automatically every 60 minutes
echo This will keep running to handle scheduled and triggered flows.
echo Press Ctrl+C to stop.
echo.

REM Deploy flows
venv\Scripts\python.exe -m backend.orchestration.deploy_flows

if errorlevel 1 (
    echo.
    echo ========================================
    echo Deployment FAILED
    echo ========================================
    pause
    exit /b 1
)

