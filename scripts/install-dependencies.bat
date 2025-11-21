@echo off
echo ========================================
echo Install/Update Dependencies
echo ========================================
echo.

REM Navigate to project root
cd /d "%~dp0.."

REM Check for virtual environment
if not exist "venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found!
    echo.
    echo Please create a virtual environment first:
    echo   py -3.13 -m venv venv
    echo.
    pause
    exit /b 1
)

echo Found virtual environment at: %CD%\venv
echo.

echo [1/2] Upgrading pip...
venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel

echo.
echo [2/2] Installing/Updating dependencies...
venv\Scripts\pip.exe install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ========================================
    echo Installation FAILED
    echo ========================================
    echo.
    echo If you see errors about Python 3.13 compatibility:
    echo   - Some packages may not yet support Python 3.13
    echo   - Try using Python 3.11 or 3.12 instead
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation SUCCESSFUL
echo ========================================
echo.
echo Key packages installed:
venv\Scripts\pip.exe list | findstr /i "psycopg fastapi prefect uvicorn pydantic"
echo.
echo You can now run:
echo   scripts\run-etl.bat
echo   scripts\start-advocacy-platform.bat
echo.
pause

