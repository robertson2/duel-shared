"""
ETL Pipeline Entry Point
Run with: python -m backend.etl
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

from .pipeline import AdvocacyETL
from ..database import get_db_config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main entry point"""
    # Load environment variables from .env file
    load_dotenv()
    
    # Database configuration from environment variables
    db_config = get_db_config()
    
    # Validate required configuration
    if not db_config['password']:
        logger.error("❌ DB_PASSWORD environment variable is required!")
        logger.error("   Create a .env file with your database credentials.")
        logger.error("   See env.example for template.")
        sys.exit(1)
    
    # Data directory from environment variable or default
    data_dir = Path(os.getenv('DATA_DIR', 'data'))
    
    if not data_dir.exists():
        logger.error(f"❌ Data directory not found: {data_dir}")
        sys.exit(1)
    
    # Set log level from environment variable
    log_level = os.getenv('LOG_LEVEL', 'INFO')
    logging.getLogger().setLevel(getattr(logging, log_level))
    
    logger.info(f"🐘 Using psycopg3 (modern PostgreSQL adapter)")
    logger.info(f"📊 Using database: {db_config['dbname']} at {db_config['host']}:{db_config['port']}")
    logger.info(f"📁 Using data directory: {data_dir}")
    
    # Run ETL
    etl = AdvocacyETL(db_config)
    etl.run(data_dir)


if __name__ == '__main__':
    main()

