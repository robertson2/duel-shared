# Advocacy Platform - Data Analysis & ETL Pipeline

A comprehensive data analysis and processing platform for advocacy marketing data, featuring ETL pipeline, REST API, and analytics dashboard with advanced segmentation, champion identification, and outlier detection.

**📖 IMPORTANT: Please read more details on approach [here](https://boiling-custard-74d.notion.site/Duel-Shared-2b157359cd41803694fce3181dd34af4)**

## 📚 Quick Navigation

| Section | Description |
|---------|-------------|
| [🎯 Overview](#-overview) | Project capabilities and features |
| [🚀 Quick Start](#-quick-start) | Installation and setup |
| [💻 Commands](#-commands) | How to run the application |
| [📊 API & Dashboard](#-api--dashboard) | API endpoints and frontend features |
| [🔧 Configuration](#-configuration) | Environment setup |
| [📁 Project Structure](#-project-structure) | Directory organization |
| [🧪 Testing & Development](#-testing--development) | Development workflow |

## 🎯 Overview

Complete advocacy marketing analytics platform with:

**Core Features:**
- 🔍 Dataset analyzer and data quality validation
- ✅ Robust ETL pipeline with PostgreSQL hybrid schema (Relational + JSONB)
- ✅ FastAPI backend with 40+ REST endpoints
- ✅ Next.js dashboard with TypeScript and Tailwind CSS
- ✅ Prefect 3.0+ orchestration with scheduled ETL (every 60 minutes)
- ✅ Comprehensive test suite with pytest

**Advanced Analytics:**
- 📈 Champion identification and tracking
- 🎯 Advocate segmentation (performance tiers, activity-based, conversion efficiency)
- 🔔 Outlier detection (sales and engagement anomalies)
- 🏢 Account-based analytics and brand-platform fit analysis
- 💰 Sales attribution and revenue tracking
- 📤 Web-based file upload with validation

## 🚀 Quick Start

### Prerequisites
- Python 3.13
- PostgreSQL 14+
- Node.js 18+ (for frontend)
- (Optional) Prefect 3.0+ (for orchestration)

### Installation

**Windows:**
```powershell
git clone <repository-url>
cd Duel
py -3.13 -m venv venv
venv\Scripts\activate
scripts\install-dependencies.bat
copy env.example .env
# Edit .env with your database credentials
createdb advocacy_platform
psql -d advocacy_platform -f schema\schema.sql
cd frontend && npm install && cd ..
```

**Linux/Mac:**
```bash
git clone <repository-url>
cd Duel
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
# Edit .env with your database credentials
createdb advocacy_platform
psql -d advocacy_platform -f schema/schema.sql
cd frontend && npm install && cd ..
```

**Data Import**

The platform supports three methods for importing data:

1. **File System Import**: Place JSON files in the `data/` directory, then run the `run-etl.bat` script to process them.
2. **Web Interface Upload**: Upload files via the web interface at `/imports`, then trigger the ETL process manually. Supports multiple archive formats: `.json`, `.zip`, `.tar`, `.gz`, `.tar.gz`, `.tgz`, `.rar` (automatically extracted).
3. **Direct API Upload**: Send files directly via REST API using `POST /api/v1/upload`.

Here is a video showing the data upload and import process within the platform: [Data Upload Guide](https://boiling-custard-74d.notion.site/Data-upload-2b457359cd418013a4aec2f42fda69c8)


**Data Delete**

All data can be deleted from the platfrom via the 'Clear All Database Data' button on the /imports page.

## 💻 Commands

### All-in-One Start (Recommended)

**Windows:**
```powershell
scripts\start-advocacy-platform.bat
```
Starts: API (http://localhost:8000), Frontend (http://localhost:3000), Prefect (http://localhost:4200), and scheduled ETL (every 60 minutes)

**Linux/Mac:**
```bash
python -m uvicorn backend.api.main:app --reload &
cd frontend && npm run dev &
prefect server start  # Optional
```

### Individual Services

**ETL Pipeline:**
- Windows: `scripts\run-etl.bat`
- Linux/Mac: `python -m backend.etl`
- API trigger: `curl -X POST http://localhost:8000/api/v1/etl/trigger`

**API Server:**
- Development: `python -m uvicorn backend.api.main:app --reload` (http://localhost:8000/docs)
- Production: `python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --workers 4`

**Frontend:**
- Development: `cd frontend && npm run dev` (http://localhost:3000)
- Production: `cd frontend && npm run build && npm start`

**Prefect (Manual):**
- Windows: `scripts\install-prefect.bat && scripts\deploy-prefect.bat`
- Linux/Mac: `prefect server start` then `python -m backend.orchestration.deploy_flows`

**Tests:**
```bash
pytest tests/ -v                                    # All tests
pytest tests/ --cov=backend --cov-report=html      # With coverage
pytest tests/test_db_connection.py -v              # Connection test
```

## 📊 API & Dashboard

### API Endpoints

The API provides 40+ REST endpoints organized into:
- **User & Account Management**: `/api/v1/users`, `/api/v1/accounts`, account engagement/programs
- **Programs & Tasks**: `/api/v1/programs`, `/api/v1/tasks`
- **Analytics**: Engagement, dashboard stats, champions, platforms, brands, brand-platform fit
- **Segmentation**: Performance tiers, activity-based, conversion efficiency
- **Outlier Detection**: Sales and engagement anomalies
- **Sales Attribution**: Revenue tracking and summaries
- **Data Quality**: Issues, summaries, completeness analysis
- **File Upload & ETL**: Upload, history, ETL trigger/status/schedule

**Interactive API Docs**: http://localhost:8000/docs | http://localhost:8000/redoc

### Dashboard

Next.js dashboard with modern UI (React, TypeScript, Tailwind CSS, Recharts):

**Core Pages:**
- Home (`/`), Advocates (`/advocates`), Account Details, Brands, Data Quality, Imports

**Analytics Pages:**
- Analytics Dashboard, Champions, Champion Settings, Segments, Outliers, Platform Fit, Settings

**Features:** Interactive charts, real-time updates (SWR), responsive design, customizable settings

### Key Technologies
- **Backend**: Python 3.13, FastAPI 0.115+, Pydantic 2.9+, PostgreSQL 14+, SQLAlchemy 2.0+
- **Orchestration**: Prefect 3.0+
- **Frontend**: Next.js 14, React 18, TypeScript 5.3, Tailwind CSS 3.4, Recharts 2.10+
- **Testing**: pytest 8.3+, pytest-asyncio, pytest-cov

## 📁 Project Structure

```
advocacy-platform/
├── backend/              # Backend (models, etl, api, orchestration, database, config)
├── frontend/             # Next.js dashboard (components, pages, hooks, lib)
├── schema/               # Database schemas and migrations
├── tests/                # Test suite (841+ lines)
├── tools/                # Utility scripts (analyze, check, fix, verify)
├── scripts/              # Windows batch scripts (start, run-etl, install, deploy)
├── data/                 # Data directories (archive, reports - gitignored)
├── docs/                 # Comprehensive documentation (20+ files)
├── requirements.txt      # Python dependencies
├── pyproject.toml        # Modern Python config
└── env.example           # Environment template
```

## 🔧 Configuration

Configuration via `.env` file (copy from `env.example`):

**Required:**
- `DB_PASSWORD` - PostgreSQL password (must be set)

**Optional:**
- Database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`
- ETL: `DATA_DIR`, `DATA_ARCHIVE_DIR`
- Logging: `LOG_LEVEL` (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- API: `API_HOST`, `API_PORT`
- Prefect: `PREFECT_API_URL`, `PREFECT_DASHBOARD_URL`
- Email Notifications: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_TLS`, `NOTIFICATION_EMAIL`, `NOTIFICATION_FROM_EMAIL`

**Email Notifications:** When configured, ETL sends completion notifications with status summary, file processing stats, data quality metrics, and analytics validation. For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833).

See `env.example` for complete template.

## 🧪 Testing & Development

### Testing

Comprehensive test suite (841+ lines) covering validation, ETL, API, analytics, and data quality:

```bash
pytest tests/ -v                                    # All tests
pytest tests/ --cov=backend --cov-report=html      # With coverage
pytest tests/test_db_connection.py -v              # Connection test
```

View coverage: `htmlcov/index.html` after running with `--cov-report=html`

### Development Setup

```bash
pip install -e ".[dev]"      # With dev tools (pytest, black, flake8, mypy)
pip install -e ".[pdf]"      # With PDF report support
pip install -e ".[dev,pdf]"  # All extras
```

**Code Quality Tools:**
- Format: `black backend/ tests/`
- Sort imports: `isort backend/ tests/`
- Type check: `mypy backend/`
- Lint: `flake8 backend/`

**Workflow:** Create branch → Make changes → Run tests → Format → Type check → Lint → Commit

## 🚀 Deployment

**Production Setup:**
1. Configure `.env` with production values
2. Setup database: `createdb advocacy_platform && psql -d advocacy_platform -f schema/schema.sql`
3. Apply migrations: `psql -d advocacy_platform -f migrations/add_unique_indexes_materialized_views.sql`
4. Backend: `python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --workers 4` (or use gunicorn)
5. Frontend: `cd frontend && npm install && npm run build && npm start`
6. Prefect (optional): `prefect server start && python -m backend.orchestration.deploy_flows`

**Platform Support:** Windows (batch scripts), Linux/Mac (shell commands), Cloud (AWS, Azure, GCP, DigitalOcean)

**Production Recommendations:** Use Nginx/Caddy reverse proxy with HTTPS, enable SSL/TLS for database, implement authentication/authorization, rate limiting, and monitoring.

## 🔒 Security & Best Practices

- ⚠️ **Never commit `.env`** - Contains sensitive credentials
- ✅ Use strong passwords, rotate regularly, enable SSL/TLS in production
- ✅ Implement authentication/authorization, rate limiting, and monitoring
- ✅ Ensure compliance with privacy regulations, implement data retention policies
- ✅ Use virtual environments, keep dependencies updated, run tests before committing

## 🔧 Troubleshooting

**Database Connection:** Verify PostgreSQL is running (`pg_ctl status`), test with `python tests/test_db_connection.py`, check `.env` credentials

**Import Errors:** Activate virtual environment, reinstall: `pip install -r requirements.txt`

**Frontend Issues:** Clear `node_modules` and reinstall, or use `scripts\install-dependencies.bat` (Windows)

**ETL Errors:** Ensure `data/archive` exists, verify JSON format with `python tools/fix_broken_json.py`, check schema with `python tools/check_schema.py`

**Port Conflicts:** Check with `netstat -ano | findstr :8000` (Windows) or `lsof -i :8000` (Linux/Mac), use different port if needed

See [Installation Troubleshooting Guide](docs/INSTALLATION_TROUBLESHOOTING.md) for details.