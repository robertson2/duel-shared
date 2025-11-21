"""
Database connection utilities
DEPRECATED: Use backend.database.pool instead
This file is kept for backward compatibility
"""

from backend.config.settings import settings


def get_db_config():
    """
    Get database configuration from settings
    DEPRECATED: Use settings.get_db_config() directly
    
    Returns:
        Dictionary with database connection parameters
    """
    return settings.get_db_config()

