"""
FastAPI dependencies for database connections and shared utilities

This module provides dependency injection functions for FastAPI route handlers.
These dependencies ensure proper resource management (connection pooling, cleanup)
and provide a consistent interface for accessing shared resources.

Key Features:
    - Automatic connection pool management
    - Exception-safe resource cleanup
    - Dependency injection compatible with FastAPI
    - Dictionary-style result access (dict_row factory)

Common Usage Patterns:
    
    1. Direct connection (recommended):
        @app.get("/users")
        def get_users():
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users")
                return cursor.fetchall()
    
    2. FastAPI dependency injection (for cursor access):
        @app.get("/users")
        def get_users(cursor = Depends(get_db_cursor)):
            cursor.execute("SELECT * FROM users")
            return cursor.fetchall()
"""

from contextlib import contextmanager
from typing import Generator
import psycopg
from backend.database.pool import get_db_connection as pool_get_connection


@contextmanager
def get_db_connection() -> Generator[psycopg.Connection, None, None]:
    """
    Dependency for getting a database connection from the pool
    
    This is a thin wrapper around the pool's get_db_connection that can be
    used in API route handlers. The connection is automatically returned to
    the pool when the context exits.
    
    Usage in route handlers:
        @app.get("/users/{user_id}")
        def get_user(user_id: UUID):
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
                return cursor.fetchone()
    
    Yields:
        psycopg.Connection: Database connection with dict_row factory
            Results from queries will be dictionaries, not tuples.
            Example: {'user_id': UUID(...), 'name': 'John', 'email': 'john@example.com'}
    
    Note:
        - Connection is NOT auto-committed. For writes, call conn.commit()
        - Connection is automatically returned to pool on context exit
        - Safe to use even if an exception occurs
    """
    # Delegate to the pool's connection manager
    # This ensures consistent behavior across the application
    with pool_get_connection() as conn:
        yield conn


def get_db_cursor():
    """
    Dependency for getting database cursor (for FastAPI Depends)
    
    This function provides a database cursor that can be injected into
    FastAPI route handlers using the Depends() mechanism. The cursor
    and connection are automatically cleaned up after the request.
    
    ⚠️  DEPRECATED: This pattern is kept for backward compatibility but
    is not recommended for new code. Use get_db_connection() context
    manager instead, as it provides better control over transactions
    and error handling.
    
    Usage:
        from fastapi import Depends
        
        @app.get("/users")
        def list_users(cursor = Depends(get_db_cursor)):
            cursor.execute("SELECT * FROM users")
            return cursor.fetchall()
    
    Yields:
        psycopg.Cursor: Database cursor with dict_row factory
            Results will be dictionaries for easy JSON serialization.
    
    Limitations:
        - Less control over transaction boundaries
        - Cursor automatically closes after request (can't reuse)
        - Connection commits are not explicit
        
    Recommendation:
        Use get_db_connection() context manager for better control:
        
        @app.get("/users")
        def list_users():
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users")
                results = cursor.fetchall()
                # Explicit transaction control here if needed
                return results
    """
    # Get a connection from the pool
    with get_db_connection() as conn:
        # Create a cursor from the connection
        cursor = conn.cursor()
        try:
            # Yield the cursor to the route handler
            yield cursor
        finally:
            # Always close the cursor after use
            # The connection is automatically returned to pool by get_db_connection()
            cursor.close()

