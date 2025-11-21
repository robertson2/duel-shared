"""
Centralized error handling middleware for FastAPI

This module provides consistent, user-friendly error responses across all API endpoints.
It handles three types of errors:
    1. HTTP exceptions (404, 403, etc.) - Expected application errors
    2. Validation errors (422) - Invalid request data (Pydantic validation)
    3. Uncaught exceptions (500) - Unexpected runtime errors

Benefits:
    - Consistent JSON response format across all errors
    - Detailed validation error messages for debugging
    - Comprehensive logging for production troubleshooting
    - Prevents sensitive error details from leaking to clients
    - Automatic exception tracking with request context

Response Format:
    All error responses follow this structure:
    {
        "success": false,
        "error": "Error message",
        "status_code": 400,
        "details": [...] // Optional: Additional error details
    }
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
from typing import Any, Dict

# Logger for error tracking and debugging
logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handle HTTPException with consistent JSON response format
    
    HTTPExceptions are raised explicitly in application code for expected
    error conditions (e.g., resource not found, unauthorized access).
    These are "expected" errors that should be handled gracefully.
    
    Args:
        request: The incoming HTTP request that caused the error
        exc: The HTTPException that was raised
        
    Returns:
        JSONResponse with error details and appropriate status code
        
    Examples of handled exceptions:
        - 400 Bad Request: Invalid query parameters
        - 401 Unauthorized: Missing or invalid authentication
        - 403 Forbidden: Insufficient permissions
        - 404 Not Found: Resource doesn't exist
        - 409 Conflict: Resource conflict (e.g., duplicate entry)
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,               # Indicates request failed
            "error": exc.detail,            # Human-readable error message
            "status_code": exc.status_code, # HTTP status code for reference
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle Pydantic validation errors with detailed field-level error messages
    
    This handler is triggered when request data fails Pydantic validation
    (e.g., missing required fields, wrong data types, invalid formats).
    It provides detailed information about which fields failed validation
    and why, making it easy for API consumers to fix their requests.
    
    Args:
        request: The incoming HTTP request with invalid data
        exc: The RequestValidationError with validation failure details
        
    Returns:
        JSONResponse with 422 status code and detailed field-level errors
        
    Example response:
        {
            "success": false,
            "error": "Validation error",
            "status_code": 422,
            "details": [
                {
                    "field": "body -> email",
                    "message": "value is not a valid email address",
                    "type": "value_error.email"
                },
                {
                    "field": "body -> age",
                    "message": "ensure this value is greater than 0",
                    "type": "value_error.number.not_gt"
                }
            ]
        }
    """
    # Extract and format validation errors for user-friendly output
    errors = []
    for error in exc.errors():
        errors.append({
            # Build field path (e.g., "body -> user -> email")
            "field": " -> ".join(str(x) for x in error["loc"]),
            
            # Pydantic's human-readable error message
            "message": error["msg"],
            
            # Error type for programmatic handling
            "type": error["type"],
        })
    
    return JSONResponse(
        status_code=422,  # 422 Unprocessable Entity is standard for validation errors
        content={
            "success": False,
            "error": "Validation error",
            "details": errors,  # Array of field-level errors
            "status_code": 422,
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle all uncaught exceptions with consistent error response
    
    This is the "catch-all" handler for any unexpected errors that occur
    during request processing. These are typically programming errors
    (e.g., NoneType errors, database connection failures) that should
    be logged and investigated.
    
    Important Security Note:
        This handler DOES NOT expose internal error details to the client.
        Only a generic error message is returned to prevent information leakage.
        Full error details are logged server-side for debugging.
    
    Args:
        request: The incoming HTTP request that caused the error
        exc: The uncaught exception that occurred
        
    Returns:
        JSONResponse with 500 status code and generic error message
        
    Side Effects:
        - Logs full exception details with stack trace
        - Includes request context (path, method) in logs
        - Logs at ERROR level for alerting/monitoring systems
    """
    # Log the full exception with stack trace for debugging
    # This is crucial for production troubleshooting
    logger.error(
        f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
        exc_info=True,  # Include full stack trace in logs
        extra={
            "path": request.url.path,    # Which endpoint failed
            "method": request.method,    # HTTP method (GET, POST, etc.)
        }
    )
    
    # Return a generic error message to the client
    # DO NOT expose internal error details (security risk)
    return JSONResponse(
        status_code=500,  # 500 Internal Server Error
        content={
            "success": False,
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later.",
            "status_code": 500,
        }
    )


def add_error_handlers(app: FastAPI) -> None:
    """
    Register all error handlers with the FastAPI application
    
    This function should be called during application initialization
    (typically in main.py) to enable centralized error handling.
    
    Error Handler Priority:
        1. HTTPException - Most specific, handles expected app errors
        2. RequestValidationError - Handles Pydantic validation failures
        3. Exception - Catch-all for any uncaught errors
    
    Args:
        app: FastAPI application instance
        
    Example:
        >>> from fastapi import FastAPI
        >>> app = FastAPI()
        >>> add_error_handlers(app)
        >>> # Now all endpoints automatically use these error handlers
    
    Note:
        Order matters! FastAPI checks handlers from most specific to
        least specific. More specific handlers should be registered first.
    """
    # Register HTTP exception handler (404, 403, etc.)
    app.add_exception_handler(HTTPException, http_exception_handler)
    
    # Register validation error handler (422)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # Register catch-all exception handler (500)
    app.add_exception_handler(Exception, general_exception_handler)
    
    logger.info("Error handlers registered successfully")

