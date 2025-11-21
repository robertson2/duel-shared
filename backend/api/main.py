"""
FastAPI Backend for Advocacy Platform - Main Application

This is the main FastAPI application providing RESTful API endpoints for
accessing and managing advocacy platform data.

Architecture:
    - RESTful API design with consistent response formats
    - Database connection pooling for performance
    - CORS middleware for frontend integration
    - Centralized error handling
    - Pydantic models for request/response validation
    
Main Features:
    1. Advocate Management: Users, accounts, programs, tasks
    2. Analytics: Engagement metrics, platform performance, brand analysis
    3. Sales: Revenue attribution and conversion tracking
    4. Data Quality: Issue tracking and monitoring
    5. ETL Management: Upload files, trigger pipelines, view history
    6. Advanced Analytics: Segmentation, outlier detection, pattern analysis
    
API Versioning:
    - All endpoints are prefixed with /api/v1
    - Future versions will use /api/v2, /api/v3, etc.
    - This allows breaking changes while maintaining backward compatibility
    
Performance:
    - Connection pooling: Reuse database connections (min=2, max=20)
    - Materialized views: Pre-computed analytics for fast queries
    - Indexes: Optimized for common query patterns
    - Pagination: Default limits on large result sets
    
Security:
    - CORS: Configurable allowed origins
    - Input validation: Pydantic models enforce data types
    - SQL injection prevention: Parameterized queries
    - Error hiding: Internal errors don't expose sensitive details
"""

from fastapi import FastAPI, HTTPException, Query, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from uuid import UUID
from decimal import Decimal
import os
import shutil
import zipfile
import tarfile
import gzip
import rarfile
import json
from pathlib import Path
from dotenv import load_dotenv
import requests
from requests.auth import HTTPBasicAuth

# ============================================================================
# ENVIRONMENT CONFIGURATION
# ============================================================================

# Load environment variables from .env file
# Must be called before accessing any settings
load_dotenv()

# Configure rarfile to use WinRAR's unrar tool on Windows
# This enables extraction of .rar archives for file uploads
if os.name == 'nt':  # Windows platform
    winrar_unrar = r"C:\Program Files\WinRAR\UnRAR.exe"
    if os.path.exists(winrar_unrar):
        rarfile.UNRAR_TOOL = winrar_unrar

# ============================================================================
# APPLICATION DEPENDENCIES
# ============================================================================

from backend.config.settings import settings
from backend.database.pool import init_pool
from backend.api.dependencies import get_db_connection
from backend.api.middleware import add_error_handlers
from backend.api.models.responses import *

# Initialize database connection pool on application startup
# This creates a pool of reusable connections (min=2, max=20)
init_pool()


# ============================================================================
# PYDANTIC RESPONSE MODELS
# ============================================================================
# Response models define the structure of API responses
# They provide automatic JSON serialization and API documentation
#
# Note: Primary models are imported from backend.api.models.responses
# The definitions below are kept for backward compatibility during migration
# TODO: Remove these after verifying all imports work correctly
class AdvocateAccountResponse(BaseModel):
    """Advocate account response model"""
    account_id: UUID
    email: str
    metadata: Dict[str, Any] = {}
    
    class Config:
        from_attributes = True


class AdvocateUserResponse(BaseModel):
    """Advocate user response model"""
    user_id: UUID
    account_id: UUID
    name: Optional[str]
    email: Optional[str]  # From joined advocate account
    instagram_handle: Optional[str]
    tiktok_handle: Optional[str]
    joined_at: Optional[datetime]
    metadata: Dict[str, Any] = {}
    
    class Config:
        from_attributes = True




class AccountEngagementResponse(BaseModel):
    """Account engagement summary"""
    account_id: UUID
    email: str
    total_users: int
    user_names: Optional[str]
    instagram_handles: Optional[str]
    tiktok_handles: Optional[str]
    total_programs: int
    total_tasks: int
    total_likes: Optional[int]
    total_comments: Optional[int]
    total_shares: Optional[int]
    total_reach: Optional[int]
    total_engagement_score: Optional[int]
    avg_engagement_score: Optional[float]
    max_engagement_score: Optional[int]
    total_impact_score: Optional[float]
    avg_impact_score: Optional[float]
    max_impact_score: Optional[float]
    avg_engagement_rate: Optional[float]
    programs_with_sales: int
    program_conversion_rate: Optional[float]
    total_sales: Decimal
    avg_sale_amount: Decimal
    last_post_date: Optional[datetime]


class ProgramResponse(BaseModel):
    """Program response model"""
    program_id: UUID
    user_id: UUID
    brand: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    program_data: Dict[str, Any] = {}


class TaskResponse(BaseModel):
    """Task response model"""
    task_id: UUID
    program_id: UUID
    platform: str
    post_url: Optional[str]
    posted_at: Optional[datetime]
    task_status: str
    platform_data: Dict[str, Any] = {}


class AnalyticsResponse(BaseModel):
    """Analytics response model"""
    analytics_id: UUID
    task_id: UUID
    likes: Optional[int]
    comments: Optional[int]
    shares: Optional[int]
    reach: Optional[int]
    engagement_score: Optional[int]
    measured_at: datetime


class SalesAttributionResponse(BaseModel):
    """Sales attribution response model"""
    attribution_id: UUID
    program_id: UUID
    amount: Decimal
    currency: str
    attributed_at: datetime


class PlatformPerformanceResponse(BaseModel):
    """Platform performance summary"""
    platform: str
    total_tasks: int
    total_programs: int
    total_accounts: int
    total_users: int
    avg_likes: Optional[float]
    avg_comments: Optional[float]
    avg_shares: Optional[float]
    avg_reach: Optional[float]
    avg_engagement_score: Optional[float]
    total_engagement_score: Optional[int]
    avg_impact_score: Optional[float]
    total_impact_score: Optional[float]
    avg_engagement_rate: Optional[float]
    programs_with_sales: int
    total_sales: Decimal
    avg_sale_amount: Decimal


class BrandPerformanceResponse(BaseModel):
    """Brand performance summary"""
    brand: str
    total_programs: int
    total_accounts: int
    total_advocates: int
    total_tasks: int
    total_engagement_score: Optional[int]
    avg_engagement_score: Optional[float]
    total_impact_score: Optional[float]
    avg_impact_score: Optional[float]
    avg_engagement_rate: Optional[float]
    programs_with_sales: int
    total_sales: Decimal
    avg_sale_amount: Decimal
    sales_per_account: Decimal
    sales_per_advocate: Decimal


class DataQualityIssueResponse(BaseModel):
    """Data quality issue response"""
    issue_id: UUID
    severity: str
    issue_type: str
    issue_description: str
    affected_record_id: Optional[str]
    affected_field: Optional[str]
    detected_at: datetime
    resolved: bool
    account_id: Optional[UUID] = None  # Account ID if affected_record_id is a user_id


class BrandPlatformFitResponse(BaseModel):
    """Brand-platform fit analysis response"""
    brand: str
    platform: str
    programs: int
    advocate_accounts: int
    advocate_users: int
    tasks: int
    avg_engagement: Optional[float]
    total_sales: Decimal
    programs_with_sales: int
    program_conversion_rate_pct: Optional[float]
    revenue_per_task: Optional[float]
    revenue_per_account: Optional[float]


class SalesOutlierResponse(BaseModel):
    """Sales outlier detection response"""
    attribution_id: UUID
    program_id: UUID
    advocate_user_name: Optional[str]
    account_email: str
    account_id: UUID
    brand: str
    amount: Decimal
    avg_sale: Optional[float]
    z_score: Optional[float]
    outlier_type: str
    attributed_at: datetime


class EngagementAnomalyResponse(BaseModel):
    """Engagement anomaly detection response"""
    analytics_id: UUID
    task_id: UUID
    platform: str
    brand: str
    advocate_user_name: Optional[str]
    account_email: str
    account_id: UUID
    engagement_score: int
    avg_engagement: Optional[float]
    likes: Optional[int]
    comments: Optional[int]
    shares: Optional[int]
    reach: Optional[int]
    z_score: Optional[float]
    engagement_category: str


class EfficientConverterResponse(BaseModel):
    """Efficient converter pattern response"""
    account_id: UUID
    email: str
    total_users: int
    user_names: Optional[str]
    total_engagement_score: Optional[int]
    total_sales: Decimal
    programs_with_sales: int
    program_conversion_rate: Optional[float]
    total_tasks: int
    sales_efficiency: Optional[float]
    pattern_note: str


class DataCompletenessResponse(BaseModel):
    """Data completeness by table response"""
    entity: str
    total_records: int
    has_email: Optional[int]
    field2: Optional[int]
    field3: Optional[int]
    field4: Optional[int]
    metric1_pct: Optional[float]
    metric2_pct: Optional[float]


class PerformanceTierResponse(BaseModel):
    """Advocate performance tier summary (Query 4.1)"""
    tier: str
    account_count: int
    avg_engagement: Optional[float]
    avg_sales: Optional[float]
    total_tier_sales: Optional[float]
    avg_programs: Optional[float]
    avg_program_conversion_rate: Optional[float]
    pct_of_total_sales: Optional[float]


class ActivitySegmentResponse(BaseModel):
    """Activity-based advocate segmentation (Query 4.2)"""
    account_id: UUID
    email: str
    total_users: int
    user_names: Optional[str]
    total_programs: int
    total_tasks: int
    total_engagement_score: Optional[int]
    total_sales: Decimal
    program_conversion_rate: Optional[float]
    activity_segment: str
    value_segment: str


class ConversionEfficiencySegmentResponse(BaseModel):
    """Conversion efficiency segment summary (Query 4.3)"""
    converter_segment: str
    account_count: int
    avg_efficiency: Optional[float]
    avg_sales: Optional[float]
    avg_engagement: Optional[float]
    avg_program_conversion_rate: Optional[float]


# ============================================================================
# FASTAPI APPLICATION INITIALIZATION
# ============================================================================

app = FastAPI(
    title="Advocacy Platform API",
    description="RESTful API for advocacy platform analytics and data",
    version="1.0.0",
    docs_url="/api/docs",        # Swagger UI at /api/docs
    redoc_url="/api/redoc",      # ReDoc documentation at /api/redoc
    openapi_url="/api/openapi.json"  # OpenAPI schema
)

# ============================================================================
# MIDDLEWARE CONFIGURATION
# ============================================================================

# Register centralized error handlers for consistent error responses
# Handles: HTTPException, ValidationError, and general Exception
add_error_handlers(app)

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the frontend to make API calls from different origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # Configured via CORS_ORIGINS env var
    allow_credentials=True,  # Allow cookies and auth headers
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Allowed HTTP methods
    allow_headers=["Content-Type", "Authorization"],  # Allowed request headers
)


# ============================================================================
# API ENDPOINTS
# ============================================================================
# All endpoints follow RESTful conventions and use the /api/v1 prefix
# 
# Endpoint Groups:
#   1. Users & Accounts: Advocate management
#   2. Programs & Tasks: Campaign tracking
#   3. Analytics: Engagement and performance metrics
#   4. Sales: Revenue attribution
#   5. Data Quality: Issue monitoring
#   6. ETL: Pipeline management and file uploads
#   7. Advanced Analytics: Segmentation and insights


# ============================================================================
# 1. USER & ACCOUNT ENDPOINTS
# ============================================================================
# These endpoints manage advocates (users and accounts)
# 
# Key Concepts:
#   - Account: Email-based identity (one person/org)
#   - User: Social media profile (Instagram, TikTok, etc.)
#   - Relationship: One account → Many users (one person, multiple profiles)

@app.get("/api/v1/users", response_model=List[AdvocateUserResponse])
def get_users(
    limit: int = Query(100, ge=1, le=1000, description="Max number of users to return"),
    offset: int = Query(0, ge=0, description="Number of users to skip (pagination)"),
    email: Optional[str] = Query(None, description="Filter by account email"),
    name: Optional[str] = Query(None, description="Filter by user name (partial match)")
):
    """
    Get all advocate users with optional filtering
    
    Returns a paginated list of advocate users with their linked account emails.
    Supports filtering by email (exact match) and name (partial match).
    
    Query Parameters:
        - limit: Maximum number of results (1-1000, default: 100)
        - offset: Number of results to skip for pagination
        - email: Filter by exact account email match
        - name: Filter by partial name match (case-insensitive)
    
    Response:
        List of AdvocateUserResponse objects with user and account details
    """
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                u.user_id, u.account_id, u.name, u.instagram_handle, 
                u.tiktok_handle, u.joined_at, u.metadata,
                acc.email
            FROM advocate_users u
            JOIN advocate_accounts acc ON u.account_id = acc.account_id
            WHERE 1=1
        """
        params = []
        
        if email:
            query += " AND acc.email = %s"
            params.append(email)
        
        if name:
            query += " AND u.name ILIKE %s"
            params.append(f"%{name}%")
        
        query += " ORDER BY u.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        users = cursor.fetchall()
        
        return users


@app.get("/api/v1/users/{user_id}", response_model=AdvocateUserResponse)
def get_user(user_id: UUID):
    """Get a specific advocate user by ID"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                u.user_id, u.account_id, u.name, u.instagram_handle, 
                u.tiktok_handle, u.joined_at, u.metadata,
                acc.email
            FROM advocate_users u
            JOIN advocate_accounts acc ON u.account_id = acc.account_id
            WHERE u.user_id = %s
        """, (user_id,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user


# ============================================================================
# ACCOUNT ENDPOINTS
# ============================================================================

@app.get("/api/v1/accounts", response_model=List[AdvocateAccountResponse])
def get_accounts(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    email: Optional[str] = None
):
    """Get all advocate accounts"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM advocate_accounts WHERE 1=1"
        params = []
        
        if email:
            query += " AND email = %s"
            params.append(email)
        
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        accounts = cursor.fetchall()
        
        return accounts


@app.get("/api/v1/accounts/{account_id}", response_model=AdvocateAccountResponse)
def get_account(account_id: UUID):
    """Get a specific advocate account by ID"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM advocate_accounts WHERE account_id = %s", (account_id,))
        account = cursor.fetchone()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return account


@app.get("/api/v1/accounts/{account_id}/engagement", response_model=AccountEngagementResponse)
def get_account_engagement(account_id: UUID):
    """Get engagement summary for a specific account
    
    Aggregates data across all users in the account."""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM mv_account_engagement WHERE account_id = %s",
            (account_id,)
        )
        engagement = cursor.fetchone()
        
        if not engagement:
            raise HTTPException(status_code=404, detail="Account not found")
        
        return engagement


@app.get("/api/v1/accounts/{account_id}/users", response_model=List[AdvocateUserResponse])
def get_account_users(account_id: UUID):
    """Get all users associated with an account"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                u.user_id, u.account_id, u.name, u.instagram_handle, 
                u.tiktok_handle, u.joined_at, u.metadata,
                acc.email
            FROM advocate_users u
            JOIN advocate_accounts acc ON u.account_id = acc.account_id
            WHERE u.account_id = %s
            ORDER BY u.created_at DESC
        """, (account_id,))
        users = cursor.fetchall()
        
        return users


# ============================================================================
# PROGRAM ENDPOINTS
# ============================================================================

@app.get("/api/v1/programs", response_model=List[ProgramResponse])
def get_programs(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    brand: Optional[str] = None,
    user_id: Optional[UUID] = None,
    status: Optional[str] = None
):
    """Get all programs with optional filtering"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM programs WHERE 1=1"
        params = []
        
        if brand:
            query += " AND brand ILIKE %s"
            params.append(f"%{brand}%")
        
        if user_id:
            query += " AND user_id = %s"
            params.append(user_id)
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        programs = cursor.fetchall()
        
        return programs


@app.get("/api/v1/programs/{program_id}", response_model=ProgramResponse)
def get_program(program_id: UUID):
    """Get a specific program by ID"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM programs WHERE program_id = %s", (program_id,))
        program = cursor.fetchone()
        
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        return program


# ============================================================================
# TASK & ANALYTICS ENDPOINTS
# ============================================================================

@app.get("/api/v1/tasks", response_model=List[TaskResponse])
def get_tasks(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    platform: Optional[str] = None,
    program_id: Optional[UUID] = None
):
    """Get all tasks with optional filtering"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM tasks WHERE 1=1"
        params = []
        
        if platform:
            query += " AND platform = %s"
            params.append(platform)
        
        if program_id:
            query += " AND program_id = %s"
            params.append(program_id)
        
        query += " ORDER BY posted_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        tasks = cursor.fetchall()
        
        return tasks


@app.get("/api/v1/analytics/engagement")
def get_engagement_metrics(
    user_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    platform: Optional[str] = None
):
    """Get engagement metrics with optional filtering"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                u.user_id,
                u.name,
                t.platform,
                COUNT(DISTINCT t.task_id) as task_count,
                SUM(sa.likes) as total_likes,
                SUM(sa.comments) as total_comments,
                SUM(sa.shares) as total_shares,
                SUM(sa.reach) as total_reach,
                SUM(sa.engagement_score) as total_engagement_score,
                AVG(sa.engagement_score) as avg_engagement_score
            FROM advocate_users u
            JOIN programs p ON u.user_id = p.user_id
            JOIN tasks t ON p.program_id = t.program_id
            LEFT JOIN social_analytics sa ON t.task_id = sa.task_id
            WHERE 1=1
        """
        params = []
        
        if user_id:
            query += " AND u.user_id = %s"
            params.append(user_id)
        
        if start_date:
            query += " AND t.posted_at >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND t.posted_at <= %s"
            params.append(end_date)
        
        if platform:
            query += " AND t.platform = %s"
            params.append(platform)
        
        query += """
            GROUP BY u.user_id, u.name, t.platform
            ORDER BY total_engagement_score DESC
        """
        
        cursor.execute(query, params)
        metrics = cursor.fetchall()
        
        return metrics


@app.get("/api/v1/analytics/top-accounts", response_model=List[AccountEngagementResponse])
def get_top_accounts(
    metric: str = Query("engagement", regex="^(engagement|sales|conversions)$"),
    limit: int = Query(10, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None
):
    """Get top advocate accounts by various metrics with pagination and search
    
    Aggregates data by account, combining metrics for all users in each account.
    Supports searching by name, email, instagram handle, and tiktok handle."""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        if metric == "engagement":
            order_by = "total_engagement_score DESC"
        elif metric == "sales":
            order_by = "total_sales DESC"
        else:  # conversions
            order_by = "program_conversion_rate DESC"
        
        query = f"""
            SELECT * FROM mv_account_engagement
            WHERE 1=1
        """
        params = []
        
        if start_date:
            query += " AND last_post_date >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND last_post_date <= %s"
            params.append(end_date)
        
        if search:
            query += """ AND (
                LOWER(user_names) LIKE LOWER(%s) OR
                LOWER(email) LIKE LOWER(%s) OR
                LOWER(instagram_handles) LIKE LOWER(%s) OR
                LOWER(tiktok_handles) LIKE LOWER(%s)
            )"""
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
        
        query += f" ORDER BY {order_by} LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        accounts = cursor.fetchall()
        
        return accounts


@app.get("/api/v1/analytics/top-accounts/count")
def get_top_accounts_count(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None
):
    """Get total count of advocate accounts matching the filter criteria"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT COUNT(*) as total FROM mv_account_engagement
            WHERE 1=1
        """
        params = []
        
        if start_date:
            query += " AND last_post_date >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND last_post_date <= %s"
            params.append(end_date)
        
        if search:
            query += """ AND (
                LOWER(user_names) LIKE LOWER(%s) OR
                LOWER(email) LIKE LOWER(%s) OR
                LOWER(instagram_handles) LIKE LOWER(%s) OR
                LOWER(tiktok_handles) LIKE LOWER(%s)
            )"""
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
        
        cursor.execute(query, params)
        result = cursor.fetchone()
        
        return {"total": result['total'] if result else 0}


@app.get("/api/v1/analytics/segments/performance-tiers", response_model=List[PerformanceTierResponse])
def get_performance_tiers():
    """Get advocate account performance tiers (Query 4.1)
    
    Segments accounts into Platinum, Gold, Silver, Bronze, and Starter tiers
    based on engagement and sales performance."""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                CASE 
                    WHEN total_engagement_score >= 50000 AND total_sales >= 5000 THEN 'Platinum'
                    WHEN total_engagement_score >= 20000 AND total_sales >= 2000 THEN 'Gold'
                    WHEN total_engagement_score >= 5000 AND total_sales >= 500 THEN 'Silver'
                    WHEN total_engagement_score >= 1000 OR total_sales >= 100 THEN 'Bronze'
                    ELSE 'Starter'
                END as tier,
                COUNT(*) as account_count,
                AVG(total_engagement_score)::NUMERIC(12,2) as avg_engagement,
                AVG(total_sales)::NUMERIC(10,2) as avg_sales,
                SUM(total_sales)::NUMERIC(12,2) as total_tier_sales,
                AVG(total_programs)::NUMERIC(5,2) as avg_programs,
                AVG(program_conversion_rate)::NUMERIC(5,2) as avg_program_conversion_rate,
                (SUM(total_sales) * 100.0 / SUM(SUM(total_sales)) OVER ())::NUMERIC(5,2) as pct_of_total_sales
            FROM mv_account_engagement
            WHERE total_engagement_score IS NOT NULL OR total_sales IS NOT NULL
            GROUP BY tier
            ORDER BY avg_sales DESC
        """
        
        cursor.execute(query)
        tiers = cursor.fetchall()
        
        return tiers


@app.get("/api/v1/analytics/segments/activity-based", response_model=List[ActivitySegmentResponse])
def get_activity_segments(
    limit: int = Query(500, ge=1, le=500),
    offset: int = Query(0, ge=0),
    activity_level: Optional[str] = None,
    value_level: Optional[str] = None
):
    """Get activity-based advocate segmentation (Query 4.2)
    
    Classifies accounts by activity level (Highly Active, Active, etc.) and value.
    Supports pagination via limit and offset parameters."""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                a.account_id,
                a.email,
                a.total_users,
                a.user_names,
                a.total_programs,
                a.total_tasks,
                a.total_engagement_score,
                a.total_sales,
                a.program_conversion_rate,
                -- Activity classification
                CASE 
                    WHEN a.total_programs >= 10 AND a.total_tasks >= 10 THEN 'Highly Active'
                    WHEN a.total_programs >= 5 AND a.total_tasks >= 5 THEN 'Active'
                    WHEN a.total_programs >= 2 AND a.total_tasks >= 2 THEN 'Moderately Active'
                    WHEN a.total_programs >= 1 THEN 'Low Activity'
                    ELSE 'Inactive'
                END as activity_segment,
                -- Quality indicator
                CASE 
                    WHEN a.total_sales > 2000 THEN 'High Value'
                    WHEN a.total_sales > 500 THEN 'Medium Value'
                    WHEN a.total_sales > 0 THEN 'Low Value'
                    ELSE 'No Sales Yet'
                END as value_segment
            FROM mv_account_engagement a
            WHERE 1=1
        """
        
        params = []
        
        if activity_level:
            # Filter will be applied in Python after classification
            pass
        
        if value_level:
            # Filter will be applied in Python after classification
            pass
        
        query += " ORDER BY a.total_programs DESC NULLS LAST, a.total_sales DESC NULLS LAST LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        segments = cursor.fetchall()
        
        # Apply filters if specified
        if activity_level:
            segments = [s for s in segments if s['activity_segment'] == activity_level]
        if value_level:
            segments = [s for s in segments if s['value_segment'] == value_level]
        
        return segments


@app.get("/api/v1/analytics/segments/activity-based/count")
def get_activity_segments_count(
    activity_level: Optional[str] = None,
    value_level: Optional[str] = None
):
    """Get total count of activity segments matching the filter criteria"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # We need to classify all records to apply filters correctly
        # So we'll fetch all and count after classification
        query = """
            SELECT 
                a.account_id,
                a.total_programs,
                a.total_tasks,
                a.total_sales,
                -- Activity classification
                CASE 
                    WHEN a.total_programs >= 10 AND a.total_tasks >= 10 THEN 'Highly Active'
                    WHEN a.total_programs >= 5 AND a.total_tasks >= 5 THEN 'Active'
                    WHEN a.total_programs >= 2 AND a.total_tasks >= 2 THEN 'Moderately Active'
                    WHEN a.total_programs >= 1 THEN 'Low Activity'
                    ELSE 'Inactive'
                END as activity_segment,
                -- Quality indicator
                CASE 
                    WHEN a.total_sales > 2000 THEN 'High Value'
                    WHEN a.total_sales > 500 THEN 'Medium Value'
                    WHEN a.total_sales > 0 THEN 'Low Value'
                    ELSE 'No Sales Yet'
                END as value_segment
            FROM mv_account_engagement a
        """
        
        cursor.execute(query)
        all_segments = cursor.fetchall()
        
        # Apply filters if specified
        if activity_level:
            all_segments = [s for s in all_segments if s['activity_segment'] == activity_level]
        if value_level:
            all_segments = [s for s in all_segments if s['value_segment'] == value_level]
        
        return {"total": len(all_segments)}


@app.get("/api/v1/analytics/segments/conversion-efficiency", response_model=List[ConversionEfficiencySegmentResponse])
def get_conversion_efficiency_segments():
    """Get conversion efficiency segments (Query 4.3)
    
    Groups accounts by how well they convert engagement to sales
    (Super Converters, High Converters, etc.)"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            WITH conversion_metrics AS (
                SELECT 
                    account_id,
                    email,
                    total_users,
                    user_names,
                    total_engagement_score,
                    total_sales,
                    programs_with_sales,
                    total_programs,
                    program_conversion_rate,
                    total_tasks,
                    CASE 
                        WHEN total_engagement_score > 0 
                        THEN (total_sales / total_engagement_score)
                        ELSE 0 
                    END as conversion_efficiency
                FROM mv_account_engagement
                WHERE total_sales > 0 AND total_engagement_score > 0
            )
            SELECT 
                CASE 
                    WHEN conversion_efficiency >= 0.5 THEN 'Super Converters'
                    WHEN conversion_efficiency >= 0.3 THEN 'High Converters'
                    WHEN conversion_efficiency >= 0.1 THEN 'Average Converters'
                    ELSE 'Low Converters'
                END as converter_segment,
                COUNT(*) as account_count,
                AVG(conversion_efficiency)::NUMERIC(10,4) as avg_efficiency,
                AVG(total_sales)::NUMERIC(10,2) as avg_sales,
                AVG(total_engagement_score)::NUMERIC(10,2) as avg_engagement,
                AVG(program_conversion_rate)::NUMERIC(5,2) as avg_program_conversion_rate
            FROM conversion_metrics
            GROUP BY converter_segment
            ORDER BY avg_efficiency DESC
        """
        
        cursor.execute(query)
        segments = cursor.fetchall()
        
        return segments


# ============================================================================
# SALES ENDPOINTS
# ============================================================================

@app.get("/api/v1/sales/attribution")
def get_sales_attribution(
    program_id: Optional[UUID] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get sales attribution records with filtering"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM sales_attribution WHERE 1=1"
        params = []
        
        if program_id:
            query += " AND program_id = %s"
            params.append(program_id)
        
        if min_amount:
            query += " AND amount >= %s"
            params.append(min_amount)
        
        if max_amount:
            query += " AND amount <= %s"
            params.append(max_amount)
        
        if start_date:
            query += " AND attributed_at >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND attributed_at <= %s"
            params.append(end_date)
        
        query += " ORDER BY attributed_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        sales = cursor.fetchall()
        
        return sales


@app.get("/api/v1/sales/summary")
def get_sales_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Get sales summary statistics"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                COUNT(*) as total_sales,
                SUM(amount) as total_revenue,
                AVG(amount) as avg_sale_amount,
                MIN(amount) as min_sale_amount,
                MAX(amount) as max_sale_amount,
                COUNT(DISTINCT program_id) as unique_programs
            FROM sales_attribution
            WHERE 1=1
        """
        params = []
        
        if start_date:
            query += " AND attributed_at >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND attributed_at <= %s"
            params.append(end_date)
        
        cursor.execute(query, params)
        summary = cursor.fetchone()
        
        return summary


# ============================================================================
# PLATFORM & BRAND ANALYTICS
# ============================================================================

@app.get("/api/v1/analytics/platforms", response_model=List[PlatformPerformanceResponse])
def get_platform_performance():
    """Get performance metrics by platform"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM mv_platform_performance ORDER BY total_sales DESC")
        platforms = cursor.fetchall()
        
        return platforms


@app.get("/api/v1/analytics/brands", response_model=List[BrandPerformanceResponse])
def get_brand_performance(
    limit: int = Query(None, ge=1, le=10000),
    order_by: str = Query("total_sales", regex="^(total_sales|sales_per_advocate|total_engagement_score)$")
):
    """Get performance metrics by brand"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if limit:
            cursor.execute(
                f"SELECT * FROM mv_brand_performance WHERE brand != 'Unknown' ORDER BY {order_by} DESC LIMIT %s",
                (limit,)
            )
        else:
            # Fetch all brands when no limit specified
            cursor.execute(
                f"SELECT * FROM mv_brand_performance WHERE brand != 'Unknown' ORDER BY {order_by} DESC"
            )
        brands = cursor.fetchall()
        
        return brands


@app.get("/api/v1/analytics/dashboard-stats")
def get_dashboard_stats():
    """Get comprehensive dashboard statistics"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Query comprehensive dashboard metrics
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT acc.account_id) as total_advocate_accounts,
                COUNT(DISTINCT u.user_id) as total_advocate_users,
                COUNT(DISTINCT p.program_id) as total_programs,
                COUNT(DISTINCT t.task_id) as total_tasks,
                COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END) as programs_with_sales,
                -- Sales totals
                ROUND(COALESCE(SUM(sales.amount), 0))::NUMERIC(12,0) as total_revenue,
                ROUND(COALESCE(AVG(sales.amount), 0))::NUMERIC(10,0) as avg_sale_amount,
                COALESCE(MIN(sales.amount), 0)::NUMERIC(10,2) as min_sale,
                COALESCE(MAX(sales.amount), 0)::NUMERIC(10,2) as max_sale,
                COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sales.amount), 0)::NUMERIC(10,2) as median_sale,
                -- Engagement totals
                SUM(sa.likes)::BIGINT as total_likes,
                SUM(sa.comments)::BIGINT as total_comments,
                SUM(sa.shares)::BIGINT as total_shares,
                SUM(sa.reach)::BIGINT as total_reach,
                SUM(sa.engagement_score)::BIGINT as total_engagement_score,
                -- Conversion metrics
                (COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END)::NUMERIC 
                 / NULLIF(COUNT(DISTINCT p.program_id), 0) * 100)::NUMERIC(5,2) as program_conversion_rate_pct,
                -- Efficiency metrics
                (SUM(sales.amount) / NULLIF(SUM(sa.engagement_score), 0))::NUMERIC(10,4) as revenue_per_engagement_point,
                (SUM(sales.amount) / NULLIF(COUNT(DISTINCT acc.account_id), 0))::NUMERIC(10,2) as revenue_per_account
            FROM advocate_accounts acc
            LEFT JOIN advocate_users u ON acc.account_id = u.account_id
            LEFT JOIN programs p ON u.user_id = p.user_id
            LEFT JOIN tasks t ON p.program_id = t.program_id
            LEFT JOIN social_analytics sa ON t.task_id = sa.task_id
            LEFT JOIN sales_attribution sales ON p.program_id = sales.program_id
        """)
        
        stats = cursor.fetchone()
        
        return stats


# ============================================================================
# DATA QUALITY ENDPOINTS
# ============================================================================

@app.get("/api/v1/data-quality/issues", response_model=List[DataQualityIssueResponse])
def get_data_quality_issues(
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get data quality issues"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Join with users to get account_id when affected_record_id is a user_id
        query = """
            SELECT 
                dqi.*,
                au.account_id
            FROM data_quality_issues dqi
            LEFT JOIN advocate_users au ON dqi.affected_record_id = au.user_id::text
            WHERE 1=1
        """
        params = []
        
        if severity:
            query += " AND dqi.severity = %s"
            params.append(severity)
        
        if resolved is not None:
            query += " AND dqi.resolved = %s"
            params.append(resolved)
        
        query += " ORDER BY dqi.detected_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        issues = cursor.fetchall()
        
        return issues


@app.get("/api/v1/data-quality/summary")
def get_data_quality_summary():
    """Get summary of data quality issues"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get data quality issue counts
        cursor.execute("""
            SELECT 
                COUNT(*) as total_issues,
                COUNT(CASE WHEN NOT resolved THEN 1 END) as open_issues,
                COUNT(CASE WHEN resolved THEN 1 END) as resolved_issues,
                COUNT(CASE WHEN severity = 'critical' AND NOT resolved THEN 1 END) as critical_issues,
                COUNT(CASE WHEN severity = 'high' AND NOT resolved THEN 1 END) as high_issues,
                COUNT(CASE WHEN severity = 'medium' AND NOT resolved THEN 1 END) as medium_issues,
                COUNT(CASE WHEN severity = 'low' AND NOT resolved THEN 1 END) as low_issues,
                CASE 
                    WHEN COUNT(*) > 0 THEN 
                        ROUND((COUNT(CASE WHEN resolved THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100), 1)
                    ELSE 0 
                END as resolution_rate
            FROM data_quality_issues
        """)
        summary = cursor.fetchone()
        
        # Get total record counts for health score calculation
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT acc.account_id) as total_accounts,
                COUNT(DISTINCT u.user_id) as total_users,
                COUNT(DISTINCT p.program_id) as total_programs,
                COUNT(DISTINCT t.task_id) as total_tasks
            FROM advocate_accounts acc
            LEFT JOIN advocate_users u ON acc.account_id = u.account_id
            LEFT JOIN programs p ON u.user_id = p.user_id
            LEFT JOIN tasks t ON p.program_id = t.program_id
        """)
        totals = cursor.fetchone()
        
        # Add total records to summary
        summary_dict = dict(summary)
        summary_dict['total_accounts'] = totals['total_accounts']
        summary_dict['total_users'] = totals['total_users']
        summary_dict['total_programs'] = totals['total_programs']
        summary_dict['total_tasks'] = totals['total_tasks']
        summary_dict['total_records'] = (
            totals['total_accounts'] + 
            totals['total_users'] + 
            totals['total_programs'] + 
            totals['total_tasks']
        )
        
        return summary_dict


@app.get("/api/v1/data-quality/issues/by-account/{account_id}", response_model=List[DataQualityIssueResponse])
def get_data_quality_issues_by_account(
    account_id: str,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None
):
    """Get data quality issues for a specific advocate account"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Join issues with users to find issues for this account
        # affected_record_id contains user_id (as string), so we need to match it
        query = """
            SELECT DISTINCT 
                dqi.*,
                au.account_id
            FROM data_quality_issues dqi
            INNER JOIN advocate_users au ON dqi.affected_record_id = au.user_id::text
            WHERE au.account_id = %s
        """
        params = [account_id]
        
        if severity:
            query += " AND dqi.severity = %s"
            params.append(severity)
        
        if resolved is not None:
            query += " AND dqi.resolved = %s"
            params.append(resolved)
        
        query += " ORDER BY dqi.detected_at DESC"
        
        cursor.execute(query, params)
        issues = cursor.fetchall()
        
        return issues


# ============================================================================
# ADVANCED ANALYTICS ENDPOINTS
# ============================================================================

@app.get("/api/v1/analytics/champions")
def get_champion_advocates(
    limit: int = Query(50, ge=1, le=100),
    champion_type: str = Query("overall", regex="^(overall|sales|engagement|balanced)$"),
    # Overall settings
    engagement_weight: Optional[float] = Query(None, ge=0, le=1),
    sales_weight: Optional[float] = Query(None, ge=0, le=1),
    conversion_weight: Optional[float] = Query(None, ge=0, le=1),
    # Sales settings
    min_sales: Optional[float] = Query(None, ge=0),
    # Engagement settings
    min_engagement: Optional[float] = Query(None, ge=0),
    high_potential_eng: Optional[float] = Query(None, ge=0),
    high_potential_sales: Optional[float] = Query(None, ge=0),
    med_potential_eng: Optional[float] = Query(None, ge=0),
    med_potential_sales: Optional[float] = Query(None, ge=0),
    # Balanced settings
    balanced_min_eng: Optional[float] = Query(None, ge=0),
    balanced_min_sales: Optional[float] = Query(None, ge=0),
    eng_normalizer: Optional[float] = Query(None, gt=0),
    sales_normalizer: Optional[float] = Query(None, gt=0)
):
    """Get champion advocates (top performers) with configurable thresholds - Query 1.1, 1.2, 1.3, 1.4"""
    
    # Set defaults for optional parameters
    min_sales = min_sales if min_sales is not None else 0
    min_engagement = min_engagement if min_engagement is not None else 300
    high_potential_eng = high_potential_eng if high_potential_eng is not None else 800
    high_potential_sales = high_potential_sales if high_potential_sales is not None else 1000
    med_potential_eng = med_potential_eng if med_potential_eng is not None else 600
    med_potential_sales = med_potential_sales if med_potential_sales is not None else 2000
    balanced_min_eng = balanced_min_eng if balanced_min_eng is not None else 500
    balanced_min_sales = balanced_min_sales if balanced_min_sales is not None else 500
    eng_normalizer = eng_normalizer if eng_normalizer is not None else 1000
    sales_normalizer = sales_normalizer if sales_normalizer is not None else 1000
    engagement_weight = engagement_weight if engagement_weight is not None else 0.4
    sales_weight = sales_weight if sales_weight is not None else 0.4
    conversion_weight = conversion_weight if conversion_weight is not None else 0.2
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        if champion_type == "sales":
            # Query 1.2: High-Value Converter Accounts (Sales Champions)
            cursor.execute("""
                SELECT 
                    a.account_id,
                    a.email,
                    a.total_users,
                    a.user_names,
                    a.instagram_handles,
                    a.tiktok_handles,
                    a.total_sales,
                    a.programs_with_sales,
                    a.program_conversion_rate,
                    a.avg_sale_amount,
                    a.total_programs,
                    a.total_engagement_score,
                    a.total_likes,
                    a.total_comments,
                    a.total_shares,
                    a.total_reach,
                    a.total_tasks,
                    -- Key metrics
                    (a.total_sales / NULLIF(a.total_programs, 0))::NUMERIC(10,2) as sales_per_program,
                    (a.total_sales / NULLIF(a.programs_with_sales, 0))::NUMERIC(10,2) as avg_sale_per_converting_program,
                    -- ROI indicator
                    CASE 
                        WHEN a.total_engagement_score > 0 
                        THEN (a.total_sales / a.total_engagement_score)::NUMERIC(10,4)
                        ELSE 0 
                    END as sales_per_engagement_point
                FROM mv_account_engagement a
                WHERE a.total_sales > %s
                ORDER BY a.total_sales DESC
                LIMIT %s
            """, (min_sales, limit))
        elif champion_type == "engagement":
            # Query 1.3: Engagement Champion Accounts
            cursor.execute("""
                SELECT 
                    a.account_id,
                    a.email,
                    a.total_users,
                    a.user_names,
                    a.instagram_handles,
                    a.tiktok_handles,
                    a.total_engagement_score,
                    a.total_likes,
                    a.total_comments,
                    a.total_shares,
                    a.total_reach,
                    a.total_tasks,
                    a.total_sales,
                    a.total_programs,
                    a.programs_with_sales,
                    a.program_conversion_rate,
                    a.avg_sale_amount,
                    -- Flag high engagement with low sales conversion (configurable thresholds)
                    CASE 
                        WHEN a.total_engagement_score > %s AND COALESCE(a.total_sales, 0) < %s 
                        THEN 'High Potential - Needs Sales Optimization'
                        WHEN a.total_engagement_score > %s AND COALESCE(a.total_sales, 0) < %s 
                        THEN 'Medium Potential - Could Improve'
                        ELSE 'Engaged'
                    END as opportunity_flag,
                    (a.total_engagement_score / NULLIF(a.total_tasks, 0))::NUMERIC(10,2) as avg_engagement_per_task
                FROM mv_account_engagement a
                WHERE a.total_engagement_score >= %s
                ORDER BY a.total_engagement_score DESC
                LIMIT %s
            """, (high_potential_eng, high_potential_sales, med_potential_eng, med_potential_sales, min_engagement, limit))
        elif champion_type == "balanced":
            # Query 1.4: Balanced Performer Accounts
            cursor.execute("""
                SELECT 
                    a.account_id,
                    a.email,
                    a.total_users,
                    a.user_names,
                    a.instagram_handles,
                    a.tiktok_handles,
                    a.total_engagement_score,
                    a.total_sales,
                    a.total_programs,
                    a.programs_with_sales,
                    a.program_conversion_rate,
                    a.total_likes,
                    a.total_comments,
                    a.total_shares,
                    a.total_reach,
                    a.total_tasks,
                    a.avg_sale_amount,
                    -- Balance score (configurable normalizers)
                    LEAST(
                        (a.total_engagement_score / %s)::NUMERIC(5,2),
                        (a.total_sales / %s)::NUMERIC(5,2)
                    ) as balance_score
                FROM mv_account_engagement a
                WHERE a.total_engagement_score >= %s 
                  AND a.total_sales >= %s
                ORDER BY balance_score DESC
                LIMIT %s
            """, (eng_normalizer, sales_normalizer, balanced_min_eng, balanced_min_sales, limit))
        else:
            # Query 1.1: Champion Advocate Accounts (Overall with champion_score)
            cursor.execute("""
                SELECT 
                    a.account_id,
                    a.email,
                    a.total_users,
                    a.user_names,
                    a.instagram_handles,
                    a.tiktok_handles,
                    a.total_engagement_score,
                    a.total_likes,
                    a.total_comments,
                    a.total_shares,
                    a.total_reach,
                    a.total_sales,
                    a.programs_with_sales,
                    a.program_conversion_rate,
                    a.total_programs,
                    a.total_tasks,
                    a.avg_sale_amount,
                    -- Performance metrics
                    COALESCE(a.total_sales / NULLIF(a.total_programs, 0), 0)::NUMERIC(10,2) as sales_per_program,
                    COALESCE(a.total_engagement_score / NULLIF(a.total_tasks, 0), 0)::NUMERIC(10,2) as engagement_per_task,
                    -- Efficiency score (sales per engagement point)
                    CASE 
                        WHEN a.total_engagement_score > 0 
                        THEN (a.total_sales / a.total_engagement_score)::NUMERIC(10,4)
                        ELSE 0 
                    END as efficiency_score,
                    -- Overall score (configurable weights)
                    (
                        COALESCE(a.total_engagement_score, 0) * %s +
                        COALESCE(a.total_sales, 0) * %s +
                        COALESCE(a.program_conversion_rate, 0) * 10 * %s
                    )::NUMERIC(12,2) as champion_score
                FROM mv_account_engagement a
                WHERE a.total_engagement_score IS NOT NULL
                ORDER BY champion_score DESC
                LIMIT %s
            """, (engagement_weight, sales_weight, conversion_weight, limit))
        
        champions = cursor.fetchall()
        return champions


@app.get("/api/v1/accounts/{account_id}/programs")
def get_account_programs(account_id: UUID):
    """Get all programs for a specific account"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT 
                p.program_id,
                p.brand,
                p.program_name,
                p.started_at,
                p.completed_at,
                COUNT(DISTINCT t.task_id) as tasks,
                SUM(sa.engagement_score) as total_engagement,
                CASE WHEN SUM(sales.amount) > 0 THEN 1 ELSE 0 END as has_sales,
                SUM(sales.amount) as total_sales
            FROM programs p
            JOIN advocate_users u ON p.user_id = u.user_id
            LEFT JOIN tasks t ON p.program_id = t.program_id
            LEFT JOIN social_analytics sa ON t.task_id = sa.task_id
            LEFT JOIN sales_attribution sales ON p.program_id = sales.program_id
            WHERE u.account_id = %s
            GROUP BY p.program_id, p.brand, p.program_name, p.started_at, p.completed_at
            ORDER BY p.started_at DESC NULLS LAST
        """, (str(account_id),))
        programs = cursor.fetchall()
        return programs


@app.get("/api/v1/accounts/{account_id}/sales")
def get_account_sales(
    account_id: UUID,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Get sales history for a specific account"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                sales.attribution_id,
                sales.program_id,
                sales.amount,
                sales.currency,
                sales.attributed_at,
                sales.order_id,
                sales.customer_id,
                sales.attribution_data,
                p.brand,
                p.program_name,
                u.name as user_name
            FROM sales_attribution sales
            JOIN programs p ON sales.program_id = p.program_id
            JOIN advocate_users u ON p.user_id = u.user_id
            WHERE u.account_id = %s
        """
        params = [str(account_id)]
        
        if start_date:
            query += " AND sales.attributed_at >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND sales.attributed_at <= %s"
            params.append(end_date)
        
        query += " ORDER BY sales.attributed_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        sales = cursor.fetchall()
        return sales


@app.get("/api/v1/accounts/{account_id}/social-analytics")
def get_account_social_analytics(
    account_id: UUID,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    platform: Optional[str] = None
):
    """Get social analytics breakdown for a specific account"""
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                sa.analytics_id,
                sa.task_id,
                sa.likes,
                sa.comments,
                sa.shares,
                sa.reach,
                sa.impressions,
                sa.engagement_score,
                sa.impact_score,
                sa.engagement_rate,
                sa.measured_at,
                t.platform,
                t.post_url,
                t.posted_at,
                p.brand,
                p.program_name,
                u.name as user_name
            FROM social_analytics sa
            JOIN tasks t ON sa.task_id = t.task_id
            JOIN programs p ON t.program_id = p.program_id
            JOIN advocate_users u ON p.user_id = u.user_id
            WHERE u.account_id = %s
        """
        params = [str(account_id)]
        
        if start_date:
            query += " AND sa.measured_at >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND sa.measured_at <= %s"
            params.append(end_date)
        
        if platform:
            query += " AND t.platform = %s"
            params.append(platform)
        
        query += " ORDER BY sa.measured_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        analytics = cursor.fetchall()
        return analytics


# ============================================================================
# ADVANCED PATTERN DETECTION & ANALYTICS
# ============================================================================

@app.get("/api/v1/analytics/brand-platform-fit", response_model=List[BrandPlatformFitResponse])
def get_brand_platform_fit(
    brand: Optional[str] = None,
    min_programs: int = Query(1, ge=0, description="Minimum programs required for inclusion (0 = all)")
):
    """
    Get brand-platform fit analysis (Query 2.3)
    Shows which platforms work best for which brands
    """
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Build query with optional brand filter
        brand_filter = "AND p.brand = %s" if brand else ""
        params = [brand, min_programs] if brand else [min_programs]
        
        cursor.execute(f"""
            SELECT 
                p.brand,
                t.platform,
                COUNT(DISTINCT p.program_id) as programs,
                COUNT(DISTINCT u.account_id) as advocate_accounts,
                COUNT(DISTINCT p.user_id) as advocate_users,
                COUNT(DISTINCT t.task_id) as tasks,
                AVG(sa.engagement_score) as avg_engagement,
                SUM(COALESCE(sales.amount, 0)) as total_sales,
                COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END) as programs_with_sales,
                -- Performance metrics
                (COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END)::NUMERIC 
                 / NULLIF(COUNT(DISTINCT p.program_id), 0) * 100)::NUMERIC(5,2) as program_conversion_rate_pct,
                (SUM(COALESCE(sales.amount, 0)) / NULLIF(COUNT(DISTINCT t.task_id), 0))::NUMERIC(10,2) as revenue_per_task,
                (SUM(COALESCE(sales.amount, 0)) / NULLIF(COUNT(DISTINCT u.account_id), 0))::NUMERIC(10,2) as revenue_per_account
            FROM programs p
            JOIN advocate_users u ON p.user_id = u.user_id
            JOIN tasks t ON p.program_id = t.program_id
            LEFT JOIN social_analytics sa ON t.task_id = sa.task_id
            LEFT JOIN sales_attribution sales ON p.program_id = sales.program_id
            WHERE p.brand IS NOT NULL AND p.brand != 'Unknown'
            {brand_filter}
            GROUP BY p.brand, t.platform
            HAVING COUNT(DISTINCT p.program_id) >= %s
            ORDER BY p.brand, total_sales DESC
        """, params)
        
        results = cursor.fetchall()
        return results


@app.get("/api/v1/analytics/outliers/sales", response_model=List[SalesOutlierResponse])
def get_sales_outliers(
    limit: int = Query(50, ge=1, le=100, description="Maximum results to return"),
    min_z_score: float = Query(2.0, ge=1.0, description="Minimum z-score for outlier detection")
):
    """
    Get sales outliers using statistical analysis (Query 3.1)
    Identifies exceptional or anomalous sales transactions
    """
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            WITH sales_stats AS (
                SELECT 
                    AVG(amount) as mean_amount,
                    STDDEV(amount) as stddev_amount,
                    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY amount) as q1,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY amount) as q3
                FROM sales_attribution
            )
            SELECT 
                sa.attribution_id,
                sa.program_id,
                u.name as advocate_user_name,
                acc.email as account_email,
                acc.account_id,
                p.brand,
                sa.amount,
                ss.mean_amount::NUMERIC(10,2) as avg_sale,
                -- Statistical measures
                ((sa.amount - ss.mean_amount) / NULLIF(ss.stddev_amount, 0))::NUMERIC(10,2) as z_score,
                CASE 
                    WHEN sa.amount > ss.q3 + 1.5 * (ss.q3 - ss.q1) THEN 'High Outlier'
                    WHEN sa.amount < ss.q1 - 1.5 * (ss.q3 - ss.q1) THEN 'Low Outlier'
                    ELSE 'Normal'
                END as outlier_type,
                -- Context
                sa.attributed_at
            FROM sales_attribution sa
            JOIN programs p ON sa.program_id = p.program_id
            JOIN advocate_users u ON p.user_id = u.user_id
            JOIN advocate_accounts acc ON u.account_id = acc.account_id
            CROSS JOIN sales_stats ss
            WHERE ABS((sa.amount - ss.mean_amount) / NULLIF(ss.stddev_amount, 0)) >= %s
            ORDER BY ABS((sa.amount - ss.mean_amount) / NULLIF(ss.stddev_amount, 0)) DESC
            LIMIT %s
        """, (min_z_score, limit))
        
        results = cursor.fetchall()
        return results


@app.get("/api/v1/analytics/outliers/engagement", response_model=List[EngagementAnomalyResponse])
def get_engagement_anomalies(
    limit: int = Query(100, ge=1, le=200, description="Maximum results to return"),
    min_z_score: float = Query(1.5, ge=1.0, description="Minimum z-score for anomaly detection")
):
    """
    Get engagement anomalies using statistical analysis (Query 3.2)
    Identifies viral content and underperforming posts
    """
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            WITH engagement_stats AS (
                SELECT 
                    AVG(engagement_score) as mean_score,
                    STDDEV(engagement_score) as stddev_score
                FROM social_analytics
                WHERE engagement_score IS NOT NULL
            )
            SELECT 
                sa.analytics_id,
                sa.task_id,
                t.platform,
                p.brand,
                u.name as advocate_user_name,
                acc.email as account_email,
                acc.account_id,
                sa.engagement_score,
                es.mean_score::NUMERIC(10,2) as avg_engagement,
                sa.likes,
                sa.comments,
                sa.shares,
                sa.reach,
                -- Anomaly detection
                ((sa.engagement_score - es.mean_score) / NULLIF(es.stddev_score, 0))::NUMERIC(10,2) as z_score,
                CASE 
                    WHEN sa.engagement_score > es.mean_score + 3 * es.stddev_score THEN 'Viral'
                    WHEN sa.engagement_score > es.mean_score + 2 * es.stddev_score THEN 'High Performer'
                    WHEN sa.engagement_score < es.mean_score - 2 * es.stddev_score THEN 'Underperformer'
                    ELSE 'Normal'
                END as engagement_category
            FROM social_analytics sa
            JOIN tasks t ON sa.task_id = t.task_id
            JOIN programs p ON t.program_id = p.program_id
            JOIN advocate_users u ON p.user_id = u.user_id
            JOIN advocate_accounts acc ON u.account_id = acc.account_id
            CROSS JOIN engagement_stats es
            WHERE sa.engagement_score IS NOT NULL
              AND ABS((sa.engagement_score - es.mean_score) / NULLIF(es.stddev_score, 0)) >= %s
            ORDER BY ABS((sa.engagement_score - es.mean_score) / NULLIF(es.stddev_score, 0)) DESC
            LIMIT %s
        """, (min_z_score, limit))
        
        results = cursor.fetchall()
        return results


@app.get("/api/v1/analytics/patterns/efficient-converters", response_model=List[EfficientConverterResponse])
def get_efficient_converters(
    limit: int = Query(50, ge=1, le=100, description="Maximum results to return"),
    min_sales: float = Query(1000, ge=0, description="Minimum sales amount"),
    max_engagement: float = Query(5000, ge=0, description="Maximum engagement score"),
    min_efficiency: float = Query(0.3, ge=0, description="Minimum sales efficiency ratio")
):
    """
    Get accounts with low-engagement-high-sales pattern (Query 3.3)
    Identifies advocates who convert efficiently (quality over quantity)
    """
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                a.account_id,
                a.email,
                a.total_users,
                a.user_names,
                a.total_engagement_score,
                a.total_sales,
                a.programs_with_sales,
                a.program_conversion_rate,
                a.total_tasks,
                -- The unusual pattern
                (a.total_sales / NULLIF(a.total_engagement_score, 0))::NUMERIC(10,4) as sales_efficiency,
                -- Why they're interesting
                'High conversion despite low engagement' as pattern_note
            FROM mv_account_engagement a
            WHERE a.total_sales > %s
              AND a.total_engagement_score < %s
              AND (a.total_sales / NULLIF(a.total_engagement_score, 0)) > %s
            ORDER BY (a.total_sales / NULLIF(a.total_engagement_score, 0)) DESC
            LIMIT %s
        """, (min_sales, max_engagement, min_efficiency, limit))
        
        results = cursor.fetchall()
        return results


@app.get("/api/v1/data-quality/completeness", response_model=List[DataCompletenessResponse])
def get_data_completeness():
    """
    Get data completeness metrics by table (Query 5.1)
    Shows field coverage and data quality across all tables
    """
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                'Advocate Accounts' as entity,
                COUNT(*) as total_records,
                COUNT(email) as has_email,
                NULL::BIGINT as field2,
                NULL::BIGINT as field3,
                NULL::BIGINT as field4,
                (COUNT(email)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as metric1_pct,
                NULL::NUMERIC(5,2) as metric2_pct
            FROM advocate_accounts
            
            UNION ALL
            
            SELECT 
                'Advocate Users' as entity,
                COUNT(*) as total_records,
                COUNT(name) as has_email,
                COUNT(account_id) as field2,
                COUNT(instagram_handle) as field3,
                COUNT(tiktok_handle) as field4,
                (COUNT(name)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as metric1_pct,
                (COUNT(account_id)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as metric2_pct
            FROM advocate_users
            
            UNION ALL
            
            SELECT 
                'Social Analytics' as entity,
                COUNT(*) as total_records,
                COUNT(likes) as has_email,
                COUNT(comments) as field2,
                COUNT(reach) as field3,
                COUNT(impressions) as field4,
                (COUNT(likes)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as metric1_pct,
                (COUNT(reach)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as metric2_pct
            FROM social_analytics
            
            UNION ALL
            
            SELECT 
                'Tasks' as entity,
                COUNT(*) as total_records,
                COUNT(post_url) as has_email,
                COUNT(posted_at) as field2,
                NULL::BIGINT as field3,
                NULL::BIGINT as field4,
                (COUNT(post_url)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as metric1_pct,
                (COUNT(posted_at)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as metric2_pct
            FROM tasks
        """)
        
        results = cursor.fetchall()
        return results


# ============================================================================
# FILE UPLOAD ENDPOINTS
# ============================================================================

def should_skip_file(file_path_str: str) -> bool:
    """
    Check if a file should be skipped (meta files, system files, etc.)
    """
    path = Path(file_path_str)
    
    # Skip directories
    if file_path_str.endswith('/') or file_path_str.endswith('\\'):
        return True
    
    # Skip hidden files (starting with .)
    if path.name.startswith('.'):
        return True
    
    # Skip files in hidden directories or __MACOSX
    parts = path.parts
    for part in parts:
        if part.startswith('.') or part.startswith('__MACOSX'):
            return True
    
    # Skip common system/meta files
    skip_files = {
        'thumbs.db', 'desktop.ini', '.ds_store', 
        '__macosx', 'zone.identifier'
    }
    if path.name.lower() in skip_files:
        return True
    
    return False


def cleanup_empty_directories(base_dir: Path):
    """
    Recursively remove empty directories within base_dir.
    Does not remove base_dir itself.
    """
    try:
        for dirpath, dirnames, filenames in os.walk(str(base_dir), topdown=False):
            dir_path = Path(dirpath)
            # Don't remove the base directory itself
            if dir_path == base_dir:
                continue
            # Check if directory is empty
            try:
                if not any(dir_path.iterdir()):
                    dir_path.rmdir()
                    print(f"Removed empty directory: {dir_path}")
            except OSError:
                # Directory not empty or other error, skip
                pass
    except Exception as e:
        print(f"Error cleaning up empty directories: {str(e)}")


def extract_archive(file_path: Path, data_dir: Path) -> List[str]:
    """
    Extract archive files (ZIP, TAR, GZ, etc.) and return list of extracted JSON files.
    Skips hidden files, system files, and meta files.
    Cleans up empty directories after extraction.
    """
    uploaded_files = []
    file_name = file_path.name.lower()
    
    try:
        if file_name.endswith('.zip'):
            # Handle ZIP files
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                for zip_file in zip_ref.namelist():
                    # Skip meta files, hidden files, and system files
                    if should_skip_file(zip_file):
                        continue
                        
                    zip_ref.extract(zip_file, data_dir)
                    extracted_path = data_dir / zip_file
                    
                    # Move nested files to root data folder
                    if '/' in zip_file or '\\' in zip_file:
                        new_path = data_dir / Path(zip_file).name
                        if extracted_path.exists():
                            shutil.move(str(extracted_path), str(new_path))
                            uploaded_files.append(Path(zip_file).name)
                            
                            # Clean up empty directories
                            try:
                                parent_dir = extracted_path.parent
                                while parent_dir != data_dir and parent_dir.exists():
                                    parent_dir.rmdir()
                                    parent_dir = parent_dir.parent
                            except:
                                pass
                    else:
                        uploaded_files.append(zip_file)
            
            # Clean up any remaining empty directories after ZIP extraction
            cleanup_empty_directories(data_dir)
                            
        elif file_name.endswith(('.tar.gz', '.tgz')):
            # Handle TAR.GZ files
            with tarfile.open(file_path, 'r:gz') as tar_ref:
                for member in tar_ref.getmembers():
                    # Skip directories and meta files
                    if not member.isfile() or should_skip_file(member.name):
                        continue
                        
                    tar_ref.extract(member, data_dir)
                    extracted_path = data_dir / member.name
                    
                    # Move nested files to root
                    if '/' in member.name or '\\' in member.name:
                        new_path = data_dir / Path(member.name).name
                        if extracted_path.exists():
                            shutil.move(str(extracted_path), str(new_path))
                            uploaded_files.append(Path(member.name).name)
                    else:
                        uploaded_files.append(member.name)
            
            # Clean up any remaining empty directories after TAR.GZ extraction
            cleanup_empty_directories(data_dir)
                            
        elif file_name.endswith('.tar'):
            # Handle TAR files
            with tarfile.open(file_path, 'r') as tar_ref:
                for member in tar_ref.getmembers():
                    # Skip directories and meta files
                    if not member.isfile() or should_skip_file(member.name):
                        continue
                        
                    tar_ref.extract(member, data_dir)
                    extracted_path = data_dir / member.name
                    
                    # Move nested files to root
                    if '/' in member.name or '\\' in member.name:
                        new_path = data_dir / Path(member.name).name
                        if extracted_path.exists():
                            shutil.move(str(extracted_path), str(new_path))
                            uploaded_files.append(Path(member.name).name)
                    else:
                        uploaded_files.append(member.name)
            
            # Clean up any remaining empty directories after TAR extraction
            cleanup_empty_directories(data_dir)
                            
        elif file_name.endswith('.gz') and not file_name.endswith('.tar.gz'):
            # Handle standalone GZ files
            output_path = data_dir / file_path.stem
            with gzip.open(file_path, 'rb') as gz_file:
                with open(output_path, 'wb') as out_file:
                    shutil.copyfileobj(gz_file, out_file)
                    uploaded_files.append(output_path.name)
                    
        elif file_name.endswith('.rar'):
            # Handle RAR files
            with rarfile.RarFile(file_path, 'r') as rar_ref:
                for rar_file in rar_ref.namelist():
                    file_info = rar_ref.getinfo(rar_file)
                    
                    # Skip directories and meta files
                    if file_info.isdir() or should_skip_file(rar_file):
                        continue
                        
                    rar_ref.extract(rar_file, data_dir)
                    extracted_path = data_dir / rar_file
                    
                    # Move nested files to root
                    if '/' in rar_file or '\\' in rar_file:
                        new_path = data_dir / Path(rar_file).name
                        if extracted_path.exists():
                            shutil.move(str(extracted_path), str(new_path))
                            uploaded_files.append(Path(rar_file).name)
                            
                            # Clean up empty directories
                            try:
                                parent_dir = extracted_path.parent
                                while parent_dir != data_dir and parent_dir.exists():
                                    parent_dir.rmdir()
                                    parent_dir = parent_dir.parent
                            except:
                                pass
                        else:
                            uploaded_files.append(rar_file)
            
            # Clean up any remaining empty directories after RAR extraction
            cleanup_empty_directories(data_dir)
        else:
            # Unsupported format
            return []
            
    except Exception as e:
        print(f"Error extracting archive {file_path}: {str(e)}")
        return []
        
    return uploaded_files


@app.post("/api/v1/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Upload JSON or archive files to the data folder.
    Supports: JSON, ZIP, TAR, GZ, TAR.GZ, RAR
    Multiple files can be uploaded at once.
    Archives are automatically extracted.
    """
    try:
        # Ensure data directory exists
        data_dir = Path("data")
        data_dir.mkdir(exist_ok=True)
        
        all_uploaded_files = []
        supported_extensions = ['.json', '.zip', '.tar', '.gz', '.tgz', '.rar']
        
        for file in files:
            file_name = file.filename.lower()
            file_ext = Path(file.filename).suffix.lower()
            
            # Check for .tar.gz or .tgz
            is_tar_gz = file_name.endswith('.tar.gz') or file_name.endswith('.tgz')
            
            # Validate file type
            if not any(file_name.endswith(ext) for ext in supported_extensions):
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": f"Unsupported file type: {file.filename}. Supported: JSON, ZIP, TAR, GZ, TAR.GZ, RAR"
                    }
                )
            
            # Process each file
            if file_name.endswith('.json'):
                # Handle JSON file
                file_path = data_dir / file.filename
                
                # Validate JSON by attempting to parse it
                content = await file.read()
                try:
                    json.loads(content)
                except json.JSONDecodeError as e:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "success": False,
                            "error": f"Invalid JSON file ({file.filename}): {str(e)}"
                        }
                    )
                
                # Save the file
                with open(file_path, "wb") as buffer:
                    buffer.write(content)
                
                all_uploaded_files.append(file.filename)
                
            else:
                # Handle archive files (ZIP, TAR, GZ, etc.)
                temp_file_path = data_dir / f"temp_{file.filename}"
                
                # Save the uploaded file temporarily
                with open(temp_file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                # Extract the archive
                extracted_files = extract_archive(temp_file_path, data_dir)
                
                if not extracted_files:
                    # Clean up temp file
                    if temp_file_path.exists():
                        temp_file_path.unlink()
                    return JSONResponse(
                        status_code=400,
                        content={
                            "success": False,
                            "error": f"Failed to extract archive: {file.filename}"
                        }
                    )
                
                all_uploaded_files.extend(extracted_files)
                
                # Remove temporary file
                if temp_file_path.exists():
                    temp_file_path.unlink()
        
        # Success response
        file_count = len(all_uploaded_files)
        if file_count == 0:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "No files were uploaded"
                }
            )
        
        message = f"Successfully uploaded {file_count} file(s) to data folder."
        
        return {
            "success": True,
            "message": message,
            "files": all_uploaded_files
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Upload failed: {str(e)}"
            }
        )


@app.get("/api/v1/uploads/history")
def get_upload_history(limit: int = Query(50, ge=1, le=200)):
    """
    Get list of uploaded files in the data folder.
    Only shows files uploaded after the last history clear.
    """
    try:
        data_dir = Path("data")
        
        if not data_dir.exists():
            return {
                "files": [],
                "total": 0
            }
        
        # Read last clear timestamp if it exists
        clear_marker_file = data_dir / ".history_cleared"
        last_clear_time = 0
        if clear_marker_file.exists():
            try:
                last_clear_time = clear_marker_file.stat().st_mtime
            except:
                last_clear_time = 0
        
        # Get all JSON files in data folder uploaded after last clear
        files = []
        for file_path in data_dir.glob("*.json"):
            stat = file_path.stat()
            # Only include files modified after last clear
            if stat.st_mtime > last_clear_time:
                files.append({
                    "filename": file_path.name,
                    "size": stat.st_size,
                    "uploaded_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "size_mb": round(stat.st_size / (1024 * 1024), 2)
                })
        
        # Sort by upload time (most recent first)
        files.sort(key=lambda x: x['uploaded_at'], reverse=True)
        
        # Apply limit
        files = files[:limit]
        
        return {
            "files": files,
            "total": len(files)
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Failed to get upload history: {str(e)}"
            }
        )


@app.delete("/api/v1/uploads/clear")
def clear_upload_history():
    """
    Clear upload history display by marking current timestamp.
    Files remain in place, but history only shows files uploaded after this point.
    """
    try:
        data_dir = Path("data")
        
        if not data_dir.exists():
            data_dir.mkdir(exist_ok=True)
        
        # Count current files in history
        file_count = len(list(data_dir.glob("*.json")))
        
        # Create/update marker file with current timestamp
        clear_marker_file = data_dir / ".history_cleared"
        clear_marker_file.touch()
        
        return {
            "success": True,
            "message": f"History cleared. {file_count} file(s) hidden from history view. Files remain in data folder.",
            "cleared_count": file_count
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Failed to clear upload history: {str(e)}"
            }
        )


@app.delete("/api/v1/data/clear-all")
def clear_all_database_data():
    """
    DESTRUCTIVE: Clear all data from all database tables.
    This is a dangerous operation that deletes all records.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # List of all tables in dependency order (children first, then parents)
            tables = [
                'social_analytics',
                'sales_attribution',
                'task_assignments',
                'tasks',
                'programs',
                'advocate_users',
                'advocate_accounts',
                'data_quality_issues',
                'raw_imports'
            ]
            
            # First, get list of existing tables from database
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
            """)
            db_tables = {row['table_name'] for row in cursor.fetchall()}
            
            total_deleted = 0
            table_counts = {}
            errors = []
            existing_tables = []
            
            # Check which of our tables exist and get counts
            for table in tables:
                if table in db_tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
                        result = cursor.fetchone()
                        count = result['count'] if result else 0
                        table_counts[table] = count
                        total_deleted += count
                        existing_tables.append(table)
                    except Exception as e:
                        errors.append(f"Error counting {table}: {str(e)}")
                        table_counts[table] = 0
                else:
                    errors.append(f"Table {table} not found (skipped)")
                    table_counts[table] = 0
            
            # Truncate all existing tables in a single transaction
            truncated_tables = []
            verification_counts = {}
            
            try:
                for table in existing_tables:
                    # Use TRUNCATE with CASCADE to handle foreign keys
                    cursor.execute(f"TRUNCATE TABLE {table} CASCADE")
                    truncated_tables.append(table)
                
                # Commit the transaction
                conn.commit()
                
                # Verify deletion by checking counts after truncate
                for table in truncated_tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
                        result = cursor.fetchone()
                        verification_counts[table] = result['count'] if result else 0
                    except Exception as e:
                        verification_counts[table] = f"Error: {str(e)}"
                
            except Exception as e:
                # If truncate fails, rollback and return error
                conn.rollback()
                cursor.close()
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "error": f"Failed to truncate tables: {str(e)}",
                        "tables_cleared": truncated_tables,
                        "failed_at_table": existing_tables[len(truncated_tables)] if len(truncated_tables) < len(existing_tables) else "unknown"
                    }
                )
            finally:
                cursor.close()
            
            # Check if any tables still have data
            remaining_data = sum(count for count in verification_counts.values() if isinstance(count, int) and count > 0)
            
            if remaining_data > 0:
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "error": f"Deletion may have failed. {remaining_data} records still remain in database.",
                        "verification_counts": verification_counts,
                        "tables_truncated": truncated_tables
                    }
                )
            
            # Refresh materialized views after successful deletion
            with get_db_connection() as conn:
                cursor = conn.cursor()
                try:
                    cursor.execute("SELECT refresh_all_materialized_views();")
                    conn.commit()
                    cursor.close()
                except Exception as e:
                    # Log warning but don't fail the deletion operation
                    if errors is None:
                        errors = []
                    errors.append(f"Warning: Could not refresh materialized views: {str(e)}")
                    cursor.close()
            
            message = f"Successfully deleted all data from database. Total records deleted: {total_deleted} from {len(truncated_tables)} table(s)"
            if errors:
                message += f" (Note: {len(errors)} table(s) skipped)"
            
            return {
                "success": True,
                "message": message,
                "total_deleted": total_deleted,
                "tables_cleared": table_counts,
                "tables_truncated": truncated_tables,
                "verification_counts": verification_counts,
                "errors": errors if errors else None
            }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Failed to clear database: {str(e)}"
            }
        )


# ============================================================================
# PREFECT ETL CONTROL ENDPOINTS
# ============================================================================

@app.get("/api/v1/etl/schedule")
def get_etl_schedule():
    """
    Get ETL schedule information including next run time and last run status
    """
    try:
        # Try to get the actual next scheduled run from Prefect
        now = datetime.now()
        next_run = None
        last_run_time = None
        last_run_status = None
        deployment_active = False
        
        try:
            # Check if deployment exists and is active
            deployment_response = requests.post(
                f"{settings.prefect_api_url}/deployments/filter",
                json={
                    "deployments": {
                        "operator": "and_",
                        "name": {"like_": "advocacy-etl-deployment"}
                    },
                    "limit": 1
                },
                timeout=5
            )
            
            if deployment_response.status_code == 200:
                deployments = deployment_response.json()
                if deployments:
                    deployment = deployments[0]
                    # Check if deployment has a schedule
                    is_schedule_active = deployment.get("is_schedule_active", False)
                    # Check when the deployment was last updated (indicates if serve() is running)
                    updated = deployment.get("updated")
                    if updated:
                        updated_dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
                        if updated_dt.tzinfo:
                            updated_dt = updated_dt.replace(tzinfo=None)
                        # If deployment was updated in last 15 minutes, consider it active
                        deployment_active = (now - updated_dt).total_seconds() < 900
                    
                    deployment_active = deployment_active or is_schedule_active
            
            # Get flow runs
            response = requests.post(
                f"{settings.prefect_api_url}/flow_runs/filter",
                json={
                    "flow_runs": {
                        "operator": "and_",
                        "name": {"like_": "Advocacy Platform ETL"}
                    },
                    "sort": "START_TIME_DESC",
                    "limit": 10
                },
                timeout=5
            )
            
            if response.status_code == 200:
                runs = response.json()
                if runs:
                    # Get latest run for status
                    latest_run = runs[0]
                    last_run_time = latest_run.get("start_time") or latest_run.get("expected_start_time")
                    
                    # Map Prefect states to simple statuses
                    state_name = latest_run.get("state", {}).get("name", "").lower()
                    if "completed" in state_name:
                        last_run_status = "success"
                    elif "failed" in state_name or "crashed" in state_name:
                        last_run_status = "failed"
                    elif "running" in state_name:
                        last_run_status = "running"
                    else:
                        last_run_status = state_name
                    
                    # If we have recent runs (within last 10 minutes), deployment is likely active
                    if last_run_time:
                        try:
                            last_dt = datetime.fromisoformat(last_run_time.replace('Z', '+00:00'))
                            if last_dt.tzinfo:
                                last_dt = last_dt.replace(tzinfo=None)
                            if (now - last_dt).total_seconds() < 600:  # 10 minutes
                                deployment_active = True
                        except:
                            pass
                    
                    # Find next scheduled run (look for future runs)
                    for run in runs:
                        expected_start = run.get("expected_start_time")
                        if expected_start:
                            expected_dt = datetime.fromisoformat(expected_start.replace('Z', '+00:00'))
                            # Convert to local time if needed
                            if expected_dt.tzinfo:
                                expected_dt = expected_dt.replace(tzinfo=None)
                            if expected_dt > now:
                                next_run = expected_dt
                                break
        except:
            pass  # Prefect not available
        
        # Fallback: Calculate next run based on 60-minute intervals
        # Assumes last run + 60 minutes, or rounds up to next hour
        if next_run is None:
            if last_run_time:
                try:
                    last_dt = datetime.fromisoformat(last_run_time.replace('Z', '+00:00'))
                    if last_dt.tzinfo:
                        last_dt = last_dt.replace(tzinfo=None)
                    next_run = last_dt + timedelta(minutes=60)
                except:
                    pass
            
            # If still no next_run, round up to next hour
            if next_run is None or next_run <= now:
                next_run = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
        
        return {
            "nextScheduledRun": next_run.isoformat(),
            "lastRunTime": last_run_time,
            "lastRunStatus": last_run_status,
            "scheduleInterval": "0 * * * *",  # Every 60 minutes (hourly)
            "timezone": "Local",
            "deploymentActive": deployment_active
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Failed to get ETL schedule: {str(e)}"
            }
        )


@app.get("/api/v1/etl/status")
def get_etl_status():
    """
    Get real-time ETL execution status with progress and current task
    """
    try:
        # Try to get latest flow run from Prefect
        try:
            response = requests.post(
                f"{settings.prefect_api_url}/flow_runs/filter",
                json={
                    "flow_runs": {
                        "operator": "and_",
                        "name": {"like_": "Advocacy Platform ETL"}
                    },
                    "sort": "START_TIME_DESC",
                    "limit": 1
                },
                timeout=5
            )
            
            if response.status_code == 200:
                runs = response.json()
                if runs:
                    latest_run = runs[0]
                    flow_run_id = latest_run.get("id")
                    state_obj = latest_run.get("state", {})
                    # Prefect uses 'type' for state type (RUNNING, COMPLETED, etc.)
                    state_type = state_obj.get("type", "").upper()
                    state_name = state_obj.get("name", "").lower()
                    
                    # Map Prefect states (check both type and name for compatibility)
                    if state_type == "COMPLETED" or "completed" in state_name:
                        state = "success"
                    elif state_type in ["FAILED", "CRASHED"] or "failed" in state_name or "crashed" in state_name:
                        state = "failed"
                    elif state_type == "RUNNING" or "running" in state_name:
                        state = "running"
                    elif state_type in ["PENDING", "SCHEDULED"] or "pending" in state_name or "scheduled" in state_name:
                        state = "queued"
                    elif state_type == "CANCELLING" or "cancelling" in state_name:
                        state = "running"  # Treat as running until actually cancelled
                    elif state_type == "CANCELLED" or "cancelled" in state_name:
                        state = "failed"
                    else:
                        state = state_name if state_name else state_type.lower()
                    
                    # Get task runs for progress tracking
                    current_task = None
                    progress = 0
                    
                    try:
                        tasks_response = requests.post(
                            f"{settings.prefect_api_url}/task_runs/filter",
                            json={
                                "task_runs": {
                                    "operator": "and_",
                                    "flow_run_id": {"any_": [flow_run_id]}
                                }
                            },
                            timeout=5
                        )
                        
                        if tasks_response.status_code == 200:
                            tasks = tasks_response.json()
                            total_tasks = len(tasks)
                            completed_tasks = sum(1 for t in tasks if t.get("state", {}).get("type") in ["COMPLETED", "FAILED"])
                            progress = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0
                            
                            # Find currently running task
                            for task in tasks:
                                if task.get("state", {}).get("type") == "RUNNING":
                                    current_task = task.get("name", "")
                                    break
                    except:
                        pass
                    
                    return {
                        "dag_run_id": flow_run_id,
                        "state": state,
                        "start_date": latest_run.get("start_time"),
                        "end_date": latest_run.get("end_time"),
                        "execution_date": latest_run.get("expected_start_time"),
                        "currentTask": current_task,
                        "progress": progress,
                        "orchestration_available": True
                    }
                else:
                    return {
                        "state": "no_runs",
                        "message": "No ETL runs found",
                        "orchestration_available": True
                    }
            else:
                return {
                    "state": "unknown",
                    "message": "Unable to fetch ETL status from Prefect",
                    "orchestration_available": False
                }
        except requests.exceptions.RequestException:
            return {
                "state": "unknown",
                "message": "Prefect is not available",
                "orchestration_available": False
            }
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Failed to get ETL status: {str(e)}"
            }
        )


@app.post("/api/v1/etl/trigger")
async def trigger_etl_pipeline():
    """
    Manually trigger the Prefect ETL flow
    """
    try:
        # Try to import and run the Prefect flow with proper state tracking
        try:
            from backend.orchestration.prefect_flows import advocacy_etl_flow
            import threading
            import time
            import os
            
            # Ensure Prefect API URL is set for flow tracking
            os.environ['settings.prefect_api_url'] = settings.prefect_api_url
            
            # Run flow in background thread to not block API
            # The flow will automatically register with Prefect server
            def run_flow():
                try:
                    # Set API URL in thread as well
                    os.environ['settings.prefect_api_url'] = settings.prefect_api_url
                    result = advocacy_etl_flow()
                    print(f"Flow completed with result: {result}")
                except Exception as e:
                    print(f"Flow execution error: {e}")
            
            thread = threading.Thread(target=run_flow, daemon=True)
            thread.start()
            
            # Give Prefect a moment to register the flow run
            time.sleep(1.0)
            
            # Try to get the flow run ID that was just created
            try:
                response = requests.post(
                    f"{settings.prefect_api_url}/flow_runs/filter",
                    json={
                        "flow_runs": {
                            "operator": "and_",
                            "name": {"like_": "Advocacy Platform ETL"}
                        },
                        "sort": "START_TIME_DESC",
                        "limit": 1
                    },
                    timeout=3
                )
                
                if response.status_code == 200:
                    runs = response.json()
                    if runs:
                        flow_run_id = runs[0].get("id")
                        return {
                            "success": True,
                            "message": "ETL pipeline triggered successfully",
                            "dag_run_id": flow_run_id,
                            "execution_date": datetime.now().isoformat(),
                            "orchestration_url": f"{settings.prefect_dashboard_url}/flow-runs/{flow_run_id}"
                        }
            except:
                pass
            
            # Fallback if we can't get the ID immediately
            return {
                "success": True,
                "message": "ETL pipeline triggered successfully",
                "dag_run_id": f"triggered_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "execution_date": datetime.now().isoformat(),
                "orchestration_url": f"{settings.prefect_dashboard_url}/flow-runs"
            }
            
        except (ImportError, Exception) as e:
            print(f"Direct flow execution failed: {e}, trying deployment API...")
            # Fallback to Prefect API if direct import fails
            response = requests.post(
                f"{settings.prefect_api_url}/deployments/filter",
                json={
                    "deployments": {
                        "operator": "and_",
                        "name": {"like_": "Advocacy Platform ETL"}
                    },
                    "limit": 1
                },
                timeout=5
            )
            
            if response.status_code == 200:
                deployments = response.json()
                if deployments:
                    deployment_id = deployments[0].get("id")
                    
                    # Create flow run
                    run_response = requests.post(
                        f"{settings.prefect_api_url}/deployments/{deployment_id}/create_flow_run",
                        json={},
                        timeout=10
                    )
                    
                    if run_response.status_code in [200, 201]:
                        run_data = run_response.json()
                        return {
                            "success": True,
                            "message": "ETL pipeline triggered successfully",
                            "dag_run_id": run_data.get("id"),
                            "execution_date": run_data.get("expected_start_time"),
                            "orchestration_url": f"{settings.prefect_dashboard_url}/flow-runs/{run_data.get('id')}"
                        }
                    else:
                        raise HTTPException(
                            status_code=run_response.status_code,
                            detail=f"Failed to trigger flow: {run_response.text}"
                        )
                else:
                    raise HTTPException(
                        status_code=404,
                        detail="No ETL deployment found. Please deploy the flow first."
                    )
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to find deployment: {response.text}"
                )
            
    except requests.exceptions.RequestException as e:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": "Prefect is not available. Please ensure Prefect server is running.",
                "details": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error triggering ETL: {str(e)}"
        )


@app.post("/api/v1/etl/cancel/{flow_run_id}")
async def cancel_etl_run(flow_run_id: str):
    """
    Cancel a running Prefect flow run
    """
    try:
        # Cancel the flow run via Prefect API
        response = requests.post(
            f"{settings.prefect_api_url}/flow_runs/{flow_run_id}/set_state",
            json={
                "type": "CANCELLED",
                "name": "Cancelled",
                "message": "Manually cancelled by user"
            },
            timeout=5
        )
        
        if response.status_code in [200, 201]:
            return {
                "success": True,
                "message": "ETL run cancelled successfully",
                "flow_run_id": flow_run_id
            }
        else:
            return JSONResponse(
                status_code=response.status_code,
                content={
                    "success": False,
                    "error": f"Failed to cancel flow run: {response.text}"
                }
            )
    except requests.exceptions.RequestException as e:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": f"Could not connect to Prefect: {str(e)}"
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Failed to cancel ETL run: {str(e)}"
            }
        )


@app.get("/api/v1/etl/history")
def get_etl_run_history(limit: int = Query(20, ge=1, le=100)):
    """
    Get history of ETL runs from Prefect
    """
    try:
        # Get all flow runs (we'll filter in Python)
        response = requests.post(
            f"{settings.prefect_api_url}/flow_runs/filter",
            json={
                "sort": "START_TIME_DESC",
                "limit": limit * 2  # Get more than needed to account for filtering
            },
            timeout=5
        )
        
        if response.status_code == 200:
            runs = response.json()
            
            # Format the history data
            history = []
            for run in runs:
                # Get flow name for this run
                run_flow_id = run.get("flow_id")
                flow_name = "Unknown"
                if run_flow_id:
                    try:
                        flow_response = requests.get(
                            f"{settings.prefect_api_url}/flows/{run_flow_id}",
                            timeout=2
                        )
                        if flow_response.status_code == 200:
                            flow_name = flow_response.json().get("name", "Unknown")
                    except:
                        pass
                
                # Only include runs from "Advocacy Platform ETL" flow
                if flow_name != "Advocacy Platform ETL":
                    continue
                
                # Stop once we have enough runs
                if len(history) >= limit:
                    break
                
                start_date = run.get("start_time")
                end_date = run.get("end_time")
                
                # Calculate duration if both dates exist
                duration = None
                if start_date and end_date:
                    try:
                        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                        duration = int((end - start).total_seconds())
                    except:
                        pass
                
                # Map Prefect state to simple status
                state_name = run.get("state", {}).get("name", "").lower()
                if "completed" in state_name:
                    state = "success"
                elif "failed" in state_name or "crashed" in state_name:
                    state = "failed"
                elif "running" in state_name:
                    state = "running"
                elif "pending" in state_name or "scheduled" in state_name:
                    state = "queued"
                else:
                    state = state_name
                
                # Determine run type (manual vs scheduled)
                run_type = "scheduled"
                if "manual" in run.get("name", "").lower():
                    run_type = "manual"
                
                history.append({
                    "dag_run_id": run.get("id", "")[:16],  # Shorter ID for display
                    "state": state,
                    "execution_date": run.get("expected_start_time"),
                    "start_date": start_date,
                    "end_date": end_date,
                    "duration_seconds": duration,
                    "run_type": run_type
                })
            
            # If Prefect returned no runs, check if we should fall back to database
            if len(history) == 0:
                if settings.prefect_only_history:
                    # Prefect-only mode: return empty result
                    return {
                        "runs": [],
                        "total": 0,
                        "orchestration_available": True,
                        "message": "No Prefect flow runs found"
                    }
                else:
                    # Fallback mode: try database
                    raise requests.exceptions.RequestException("Prefect has no flow runs, falling back to database")
            
            return {
                "runs": history,
                "total": len(history),
                "orchestration_available": True
            }
        else:
            # Prefect API returned an error
            if settings.prefect_only_history:
                # Prefect-only mode: return empty result instead of falling back
                return {
                    "runs": [],
                    "total": 0,
                    "orchestration_available": False,
                    "message": "Prefect is unavailable"
                }
            else:
                return JSONResponse(
                    status_code=response.status_code,
                    content={
                        "success": False,
                        "error": "Failed to fetch ETL history from Prefect"
                    }
                )
            
    except requests.exceptions.RequestException:
        # Prefect is unavailable - check if we should fall back to database
        if settings.prefect_only_history:
            # Prefect-only mode: return empty result
            return {
                "runs": [],
                "total": 0,
                "orchestration_available": False,
                "message": "Prefect is unavailable (Prefect-only mode enabled)"
            }
        
        # Fallback to database when Prefect is unavailable
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT 
                        import_id,
                        processing_status,
                        imported_at,
                        processing_started_at,
                        processing_completed_at,
                        records_count,
                        file_name
                    FROM raw_imports
                    ORDER BY imported_at DESC
                    LIMIT %s
                """, (limit,))
                
                rows = cursor.fetchall()
                history = []
                
                for row in rows:
                    import_id, status, imported_at, started_at, completed_at, records_count, file_name = row
                    
                    # Calculate duration
                    duration = None
                    if started_at and completed_at:
                        duration = int((completed_at - started_at).total_seconds())
                    
                    # Map database status to UI status
                    state_map = {
                        'completed': 'success',
                        'failed': 'failed',
                        'processing': 'running',
                        'pending': 'queued'
                    }
                    
                    history.append({
                        "dag_run_id": str(import_id)[:16],
                        "state": state_map.get(status, status),
                        "execution_date": imported_at.isoformat() if imported_at else None,
                        "start_date": started_at.isoformat() if started_at else None,
                        "end_date": completed_at.isoformat() if completed_at else None,
                        "duration_seconds": duration,
                        "run_type": "manual",  # Database doesn't track this
                        "records_count": records_count,
                        "file_name": file_name
                    })
                
                return {
                    "runs": history,
                    "total": len(history),
                    "orchestration_available": False,
                    "message": "Showing history from database (Prefect unavailable)"
                }
        except Exception as db_error:
            print(f"Failed to fetch history from database: {db_error}")
            return {
                "runs": [],
                "total": 0,
                "orchestration_available": False,
                "message": "Prefect and database are unavailable"
            }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Failed to get ETL history: {str(e)}"
            }
        )


@app.get("/api/v1/etl/pending-files")
def get_pending_files_count():
    """
    Get count of JSON files waiting to be processed in the data folder
    """
    try:
        data_dir = Path("data")
        
        if not data_dir.exists():
            return {
                "count": 0,
                "files": []
            }
        
        # Get all JSON files
        json_files = list(data_dir.glob("*.json"))
        
        # Get file details
        files = []
        total_size = 0
        for file_path in json_files:
            stat = file_path.stat()
            files.append({
                "filename": file_path.name,
                "size": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
            total_size += stat.st_size
        
        # Sort by modified date (most recent first)
        files.sort(key=lambda x: x['modified_at'], reverse=True)
        
        return {
            "count": len(files),
            "files": files[:10],  # Return only first 10 for preview
            "total_size_mb": round(total_size / (1024 * 1024), 2)
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Failed to count pending files: {str(e)}"
            }
        )


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/api/v1/health")
def health_check():
    """Health check endpoint"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "database": "disconnected",
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
