@echo off
echo ========================================
echo Advocacy Platform ETL Pipeline
echo ========================================
echo.

REM Navigate to project root (one level up from scripts/)
cd /d "%~dp0.."

REM Check if we're in the right directory
if not exist "backend\etl\pipeline.py" (
    echo ERROR: backend\etl\pipeline.py not found!
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
echo [2/2] Running ETL Pipeline...
echo.

REM Run ETL pipeline
venv\Scripts\python.exe -m backend.etl

echo.
if errorlevel 1 (
    echo ========================================
    echo ETL Pipeline FAILED
    echo ========================================
    pause
    exit /b 1
) else (
    echo ========================================
    echo ETL Pipeline COMPLETED
    echo ========================================
)

echo.
pause

