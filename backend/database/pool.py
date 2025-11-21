"""
Database connection pool for efficient connection management

This module manages a global connection pool for PostgreSQL database connections.
Using a connection pool significantly improves performance by:
    - Reusing existing connections instead of creating new ones
    - Maintaining a pool of ready-to-use connections
    - Limiting the total number of database connections
    - Automatically handling connection lifecycle (opening/closing)

Architecture:
    - Single global pool shared across the application
    - Initialized lazily on first use
    - Thread-safe with built-in connection management
    - All connections use dict_row factory for dictionary-style result access
"""

import psycopg_pool
from contextlib import contextmanager
from typing import Generator
import psycopg
from psycopg.rows import dict_row

from backend.config.settings import settings

# ========================================================================
# GLOBAL CONNECTION POOL
# ========================================================================
# Single connection pool instance shared across the entire application
# Initialized to None and created lazily on first use
_pool: psycopg_pool.ConnectionPool | None = None


def init_pool() -> psycopg_pool.ConnectionPool:
    """
    Initialize the database connection pool
    
    Creates a connection pool with the following characteristics:
        - min_size=2: Keeps at least 2 connections ready at all times
        - max_size=20: Allows up to 20 concurrent connections maximum
        - timeout=30.0: Wait up to 30 seconds for an available connection
        - dict_row factory: Return query results as dictionaries (not tuples)
    
    The pool is created only once (singleton pattern) and reused for all
    subsequent database operations. This significantly improves performance
    by eliminating connection overhead.
    
    Returns:
        psycopg_pool.ConnectionPool: The initialized connection pool
        
    Note:
        This function is idempotent - calling it multiple times is safe
        and will return the existing pool instance.
    """
    global _pool
    
    # Check if pool already exists (singleton pattern)
    if _pool is None:
        # Get database configuration from settings
        db_config = settings.get_db_config()
        
        # Build PostgreSQL connection string from config
        # Format: "host=localhost port=5432 dbname=mydb user=user password=pass"
        conninfo = (
            f"host={db_config['host']} "
            f"port={db_config['port']} "
            f"dbname={db_config['dbname']} "
            f"user={db_config['user']} "
            f"password={db_config['password']}"
        )
        
        # Create the connection pool with production-ready settings
        _pool = psycopg_pool.ConnectionPool(
            conninfo=conninfo,
            min_size=2,        # Always keep 2 connections open (fast response time)
            max_size=20,       # Allow up to 20 concurrent connections (handle bursts)
            timeout=30.0,      # Wait up to 30 seconds for available connection
            kwargs={'row_factory': dict_row}  # Return rows as dicts, not tuples
        )
        
        print(f"✅ Database connection pool initialized (min=2, max=20)")
    
    return _pool


def get_pool() -> psycopg_pool.ConnectionPool:
    """
    Get the database connection pool, initializing it if needed
    
    This is the main entry point for accessing the connection pool.
    Uses lazy initialization - pool is created only when first accessed.
    
    Returns:
        psycopg_pool.ConnectionPool: The global connection pool instance
        
    Example:
        >>> pool = get_pool()
        >>> with pool.connection() as conn:
        ...     cursor = conn.cursor()
        ...     cursor.execute("SELECT * FROM users")
    """
    # Lazy initialization: create pool on first access
    if _pool is None:
        return init_pool()
    return _pool


@contextmanager
def get_db_connection() -> Generator[psycopg.Connection, None, None]:
    """
    Context manager for getting a database connection from the pool
    
    This is the recommended way to get a database connection. The connection
    is automatically returned to the pool when the context exits, even if
    an exception occurs.
    
    Features:
        - Automatic connection checkout from pool
        - Automatic connection return to pool
        - Exception-safe (connection returned even on error)
        - Connections use dict_row factory (results as dictionaries)
    
    Usage:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            result = cursor.fetchone()  # Returns a dict like {'id': 1, 'name': 'John'}
    
    Yields:
        psycopg.Connection: Database connection with dict_row factory
        
    Note:
        The connection is NOT automatically committed. For write operations,
        you must explicitly call conn.commit() or use cursor.execute within
        a transaction context.
    """
    # Get the global pool instance
    pool = get_pool()
    
    # Get a connection from the pool (blocks if all connections are in use)
    # The connection is automatically returned to the pool when context exits
    with pool.connection() as conn:
        yield conn


def close_pool():
    """
    Close the connection pool and all connections
    
    This function should be called when shutting down the application
    to cleanly close all database connections. It's typically called
    in application shutdown hooks or signal handlers.
    
    After calling this function, the pool must be reinitialized before
    use (via get_pool() or init_pool()).
    
    Note:
        - Waits for all connections to be returned to pool
        - Closes all pooled connections
        - Resets the global pool to None
        - Safe to call multiple times (idempotent)
    """
    global _pool
    
    # Only close if pool exists
    if _pool is not None:
        # Close all connections in the pool
        _pool.close()
        
        # Reset global pool to None (allows reinitialization)
        _pool = None
        
        print("Database connection pool closed")

