@echo off
echo ========================================
echo Advocacy Platform Dashboard Starter
echo ========================================
echo.

REM Check if we're in the right directory (go up one level from scripts/)
cd /d "%~dp0.."
if not exist "backend\api\main.py" (
    echo ERROR: backend\api\main.py not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo ERROR: frontend directory not found!
    echo Please ensure the frontend is set up correctly.
    pause
    exit /b 1
)

echo Current directory: %CD%
echo.

echo [1/4] Checking Python virtual environment...
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
venv\Scripts\python.exe --version

echo.
echo [2/4] Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js 18+ and add it to PATH.
    pause
    exit /b 1
)

echo.
echo [3/4] Installing frontend dependencies (if needed)...
cd frontend
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed!
        pause
        exit /b 1
    )
)
cd ..

echo.
echo [4/6] Checking Prefect installation...
venv\Scripts\python.exe -c "import prefect" 2>nul
if errorlevel 1 (
    echo WARNING: Prefect not found in virtual environment!
    echo Prefect is optional but recommended for ETL automation.
    echo To install: venv\Scripts\pip install prefect
    echo.
    echo Continuing without Prefect...
    set SKIP_PREFECT=1
) else (
    echo Prefect found!
    set SKIP_PREFECT=0
)

echo.
echo [5/6] Setting up Prefect environment...
if "%SKIP_PREFECT%"=="0" (
    REM Set PREFECT_HOME if not already set
    if not defined PREFECT_HOME (
        set "PREFECT_HOME=%CD%\.prefect"
    )
    
    echo Set PREFECT_HOME to: %CD%\.prefect
    
    REM Create .prefect directory if it doesn't exist
    if not exist "%PREFECT_HOME%" (
        mkdir "%PREFECT_HOME%"
    )
    
    echo Prefect setup complete!
) else (
    echo Skipping Prefect setup...
)

echo.
echo [6/6] Starting servers...
echo.
echo Backend API will start on: http://127.0.0.1:8000
echo Frontend Dashboard will start on: http://localhost:3000
if "%SKIP_PREFECT%"=="0" (
    echo Prefect Server will start on: http://localhost:4200
)
echo.
echo Press Ctrl+C in each window to stop the servers.
echo.
echo PRESS ENTER NOW TO START THE SERVERS
echo.
pause

REM Start Prefect if available
if "%SKIP_PREFECT%"=="0" (
    echo Starting Prefect Server...
    start "Prefect Server" cmd /k "cd /d %CD% && venv\Scripts\python.exe -m prefect server start"
    
    REM Wait for Prefect server to initialize
    timeout /t 5 /nobreak >nul
    
    REM Start Prefect Deployment (enables scheduled ETL every 60 minutes)
    echo Starting Prefect Deployment...
    start "Prefect Deployment" cmd /k "cd /d %CD% && venv\Scripts\python.exe -m backend.orchestration.deploy_flows"
    
    REM Wait for deployment to initialize
    timeout /t 3 /nobreak >nul
)

REM Start backend in new window using venv Python (already in root directory)
start "Backend API" cmd /k "cd /d %CD% && venv\Scripts\python.exe -m uvicorn backend.api.main:app --reload"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Frontend Dashboard" cmd /k "cd /d %CD%\frontend && npm run dev"

echo.
echo ========================================
echo Servers Started!
echo ========================================
echo Backend API: http://127.0.0.1:8000/docs
echo Frontend: http://localhost:3000
if "%SKIP_PREFECT%"=="0" (
    echo Prefect UI: http://localhost:4200
    echo   (No login required for local instance)
    echo.
    echo SCHEDULED ETL: Running automatically every 60 minutes
    echo   - Upload JSON files to data/ folder or via web UI
    echo   - Files will be processed within 60 minutes
    echo   - Manual trigger available at: http://localhost:3000/imports
)
echo.
echo IMPORTANT: Keep all windows open for services to run!
echo   - Close individual windows to stop specific services
echo   - Or press Ctrl+C in each window
echo.
pause


