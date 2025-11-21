@echo off
echo ========================================
echo Prefect Installation Script
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found!
    echo Please create a virtual environment first:
    echo   py -3.13 -m venv venv
    echo   venv\Scripts\activate
    pause
    exit /b 1
)

echo [1/2] Installing Prefect and dependencies...
venv\Scripts\pip install prefect>=3.0.0 prefect-sqlalchemy>=0.5.0
if errorlevel 1 (
    echo ERROR: Failed to install Prefect!
    pause
    exit /b 1
)
echo.

echo [2/2] Verifying installation...
venv\Scripts\python.exe -c "import prefect; print(f'✅ Prefect {prefect.__version__} installed successfully!')"
if errorlevel 1 (
    echo ERROR: Prefect installation verification failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run: start-advocacy-platform.bat
echo 2. Open: http://localhost:3000/imports
echo 3. Click "Trigger ETL Now" to test
echo.
echo For more info, see: docs\PREFECT_SETUP.md
echo.
pause


