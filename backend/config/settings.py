"""
Application configuration and settings management

This module centralizes all application settings and configuration.
Environment variables are loaded from a .env file in the project root.
All settings have sensible defaults for local development.

Environment Variables Required:
    - DB_HOST: PostgreSQL host (default: localhost)
    - DB_PORT: PostgreSQL port (default: 5432)
    - DB_NAME: Database name (default: advocacy_platform)
    - DB_USER: Database username (default: postgres)
    - DB_PASSWORD: Database password (required for production)
    - CORS_ORIGINS: Comma-separated allowed origins (default: http://localhost:3000)
    - PREFECT_API_URL: Prefect API URL (default: http://localhost:4200/api)
    - PREFECT_DASHBOARD_URL: Prefect dashboard URL (default: http://localhost:4200)
    - PREFECT_ONLY_HISTORY: If true, ETL history only queries Prefect (no database fallback) (default: false)
    - SMTP_USERNAME: Email username for notifications (optional)
    - SMTP_PASSWORD: Email password for notifications (optional)
    - NOTIFICATION_EMAIL: Email to receive ETL notifications (optional)
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file in the project root
# This must be called before accessing any environment variables
load_dotenv()


class Settings:
    """
    Application settings loaded from environment variables
    
    This class provides centralized access to all configuration settings.
    All settings are loaded once during initialization and cached for the
    lifetime of the application.
    """
    
    def __init__(self):
        # ====================================================================
        # DATABASE CONFIGURATION
        # ====================================================================
        # PostgreSQL connection settings
        self.db_host: str = os.getenv('DB_HOST', 'localhost')
        self.db_port: int = int(os.getenv('DB_PORT', '5432'))
        self.db_name: str = os.getenv('DB_NAME', 'advocacy_platform')
        self.db_user: str = os.getenv('DB_USER', 'postgres')
        self.db_password: Optional[str] = os.getenv('DB_PASSWORD')  # Required for production
        
        # ====================================================================
        # DATA DIRECTORIES
        # ====================================================================
        # Directory where JSON files are uploaded for ETL processing
        self.data_dir: Path = Path(os.getenv('DATA_DIR', 'data'))
        
        # Archive directory where processed files are moved after ETL
        # Files are organized by date in subdirectories (YYYY-MM-DD)
        self.data_archive_dir: Path = Path(os.getenv('DATA_ARCHIVE_DIR', 'data/archive'))
        
        # ====================================================================
        # LOGGING CONFIGURATION
        # ====================================================================
        # Log level for application logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        self.log_level: str = os.getenv('LOG_LEVEL', 'INFO')
        
        # ====================================================================
        # API SERVER CONFIGURATION
        # ====================================================================
        # FastAPI server bind address (0.0.0.0 allows external connections)
        self.api_host: str = os.getenv('API_HOST', '0.0.0.0')
        
        # FastAPI server port
        self.api_port: int = int(os.getenv('API_PORT', '8000'))
        
        # ====================================================================
        # CORS (Cross-Origin Resource Sharing) CONFIGURATION
        # ====================================================================
        # Parse comma-separated list of allowed origins for CORS
        # This controls which frontend domains can access the API
        cors_origins_str = os.getenv('CORS_ORIGINS', 'http://localhost:3000')
        self.cors_origins: list[str] = [origin.strip() for origin in cors_origins_str.split(',')]
        
        # ====================================================================
        # PREFECT ORCHESTRATION CONFIGURATION
        # ====================================================================
        # Prefect API endpoint for flow execution and monitoring
        self.prefect_api_url: str = os.getenv('PREFECT_API_URL', 'http://localhost:4200/api')
        
        # Prefect dashboard URL for viewing flows and runs
        self.prefect_dashboard_url: str = os.getenv('PREFECT_DASHBOARD_URL', 'http://localhost:4200')
        
        # Whether ETL history should only show Prefect data (no database fallback)
        # If True, history will only query Prefect and return empty if Prefect is unavailable
        # If False (default), falls back to database when Prefect is unavailable
        self.prefect_only_history: bool = os.getenv('PREFECT_ONLY_HISTORY', 'false').lower() == 'true'
        
        # ====================================================================
        # EMAIL NOTIFICATION CONFIGURATION
        # ====================================================================
        # SMTP server settings for sending ETL completion notifications
        self.smtp_host: str = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port: int = int(os.getenv('SMTP_PORT', '587'))
        
        # SMTP credentials (optional - if not provided, email notifications are disabled)
        self.smtp_username: Optional[str] = os.getenv('SMTP_USERNAME')
        self.smtp_password: Optional[str] = os.getenv('SMTP_PASSWORD')
        
        # Whether to use TLS encryption for SMTP (recommended for security)
        self.smtp_use_tls: bool = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        
        # Email address to receive ETL notifications (optional)
        self.notification_email: Optional[str] = os.getenv('NOTIFICATION_EMAIL')
        
        # "From" address for notification emails
        self.notification_from_email: str = os.getenv('NOTIFICATION_FROM_EMAIL', 'noreply@advocacy-platform.com')
    
    def get_db_config(self) -> dict:
        """
        Get database configuration as a dictionary
        
        Returns dictionary compatible with psycopg connection parameters.
        Used by both the connection pool and ETL pipeline.
        
        Returns:
            dict: Database connection parameters with keys:
                - host: PostgreSQL server host
                - port: PostgreSQL server port
                - dbname: Database name
                - user: Database username
                - password: Database password
        """
        return {
            'host': self.db_host,
            'port': self.db_port,
            'dbname': self.db_name,
            'user': self.db_user,
            'password': self.db_password
        }


# ========================================================================
# GLOBAL SETTINGS INSTANCE
# ========================================================================
# Single global instance of settings used throughout the application
# This ensures consistent configuration across all modules
settings = Settings()

