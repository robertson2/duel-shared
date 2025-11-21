"""
Clean data models for database insertion

This module defines Pydantic models for validated, normalized data ready
for database insertion. These models represent the "clean" data after ETL
processing, with all validation and normalization complete.

Key Differences from Raw Models:
    - All data is validated and normalized
    - Required fields are enforced
    - UUIDs are generated for missing IDs
    - Proper Python types (no string/int unions)
    - Business rules are enforced
    - Metadata fields for extensibility

Database Schema Mapping:
    - CleanAdvocateAccount → advocate_accounts table
    - CleanAdvocateUser → advocate_users table
    - CleanProgram → programs table
    - CleanTask → tasks table
    - CleanSocialAnalytics → social_analytics table
    - CleanSalesAttribution → sales_attribution table
    - DataQualityIssue → data_quality_issues table

Design Philosophy:
    These models enforce data integrity at the application layer before
    hitting the database. This provides early error detection and clear
    validation messages.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator


class CleanAdvocateAccount(BaseModel):
    """
    Clean advocate account model for database insertion
    
    Represents an advocate's account (email-based). An account can have
    multiple users (advocate_users) representing different social media
    profiles for the same person/organization.
    
    Relationship:
        One account → Many users (one-to-many)
        
    Fields:
        account_id: Unique identifier (auto-generated if missing)
        email: Account email address (required, unique constraint in DB)
        metadata: Flexible JSON field for additional account data
        
    Business Rules:
        - Email is required and must be unique across all accounts
        - Account IDs are UUIDs for global uniqueness
        - Metadata is optional but useful for future extensibility
        
    Example:
        >>> account = CleanAdvocateAccount(email="john@example.com")
        >>> print(account.account_id)  # Auto-generated UUID
    """
    account_id: UUID = Field(default_factory=uuid4)
    email: str  # Required and unique (enforced at DB level)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        # Custom JSON encoding for non-standard types
        json_encoders = {
            UUID: str,  # Serialize UUIDs as strings for JSON
            datetime: lambda v: v.isoformat()  # ISO 8601 format for dates
        }


class CleanAdvocateUser(BaseModel):
    """
    Clean advocate user model for database insertion
    
    Represents a single user (social media profile) linked to an advocate account.
    One account can have multiple users representing different platforms or personas.
    
    Relationship:
        Many users → One account (many-to-one)
        One user → Many programs (one-to-many)
        
    Fields:
        user_id: Unique identifier (auto-generated if missing)
        account_id: Foreign key to advocate_accounts (required)
        name: Display name of the user (may be null)
        instagram_handle: Instagram handle with @ prefix
        tiktok_handle: TikTok handle with @ prefix
        joined_at: Date user joined the advocacy platform
        metadata: Flexible JSON field for additional user data
        
    Business Rules:
        - Each user must be linked to exactly one account
        - Social media handles should include @ prefix
        - Name is optional (some users don't provide real names)
        
    Example:
        >>> user = CleanAdvocateUser(
        ...     account_id=account.account_id,
        ...     name="John Doe",
        ...     instagram_handle="@johndoe"
        ... )
    """
    user_id: UUID = Field(default_factory=uuid4)
    account_id: UUID  # Required foreign key - links to advocate account
    name: Optional[str] = None
    instagram_handle: Optional[str] = None  # Format: @username
    tiktok_handle: Optional[str] = None     # Format: @username
    joined_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            UUID: str,
            datetime: lambda v: v.isoformat()
        }


class CleanProgram(BaseModel):
    """
    Clean program model for database insertion
    
    Represents an advocacy program (brand campaign) that a user participates in.
    Programs contain multiple tasks (social media posts).
    
    Relationship:
        Many programs → One user (many-to-one)
        One program → Many tasks (one-to-many)
        One program → Zero or one sales attribution (one-to-zero-or-one)
        
    Fields:
        program_id: Unique identifier (auto-generated if missing)
        user_id: Foreign key to advocate_users (required)
        brand: Brand name for this program (required)
        program_data: Flexible JSON field for program details
        started_at: Program start date (optional)
        completed_at: Program completion date (optional)
        
    Business Rules:
        - Each program belongs to exactly one user
        - Brand name is required and normalized during ETL
        - Programs can have 0 or more tasks
        - Programs may or may not have sales attribution
        
    Example:
        >>> program = CleanProgram(
        ...     user_id=user.user_id,
        ...     brand="Nike",
        ...     started_at=datetime.now()
        ... )
    """
    program_id: UUID = Field(default_factory=uuid4)
    user_id: UUID  # Required foreign key
    brand: str     # Required - brand name for this campaign
    program_data: Dict[str, Any] = Field(default_factory=dict)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            UUID: str,
            datetime: lambda v: v.isoformat()
        }


class CleanTask(BaseModel):
    """
    Clean task model for database insertion
    
    Represents a single social media post created as part of a program.
    Tasks are the atomic unit of work in advocacy programs.
    
    Relationship:
        Many tasks → One program (many-to-one)
        One task → Zero or one analytics record (one-to-zero-or-one)
        
    Fields:
        task_id: Unique identifier (auto-generated if missing)
        program_id: Foreign key to programs (required)
        platform: Social media platform (TikTok, Instagram, etc.)
        post_url: URL to the social media post (optional)
        posted_at: Date/time the post was published (optional)
        platform_data: Flexible JSON field for platform-specific data
        
    Business Rules:
        - Each task belongs to exactly one program
        - Platform is required and normalized to proper case
        - Post URL may be missing for drafts or deleted posts
        - Tasks may or may not have analytics (newly posted tasks don't)
        
    Example:
        >>> task = CleanTask(
        ...     program_id=program.program_id,
        ...     platform="Instagram",
        ...     post_url="https://instagram.com/p/ABC123",
        ...     posted_at=datetime.now()
        ... )
    """
    task_id: UUID = Field(default_factory=uuid4)
    program_id: UUID  # Required foreign key
    platform: str     # Required - standardized platform name
    post_url: Optional[str] = None
    posted_at: Optional[datetime] = None
    platform_data: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator('platform')
    @classmethod
    def validate_platform(cls, v):
        """
        Validate platform string
        
        Accepts any platform string for flexibility with evolving data.
        Standard platforms are: TikTok, Instagram, Facebook, YouTube, Twitter, Unknown
        
        We don't enforce specific values here to allow for:
            - New platforms added in the future
            - Platform variations in source data
            - 'Unknown' fallback for invalid data
            
        Platform standardization happens during ETL (raw.py validators).
        """
        # Accepted platforms (for reference, but don't enforce strict validation)
        # allowed = ['TikTok', 'Instagram', 'Facebook', 'YouTube', 'Twitter', 'Unknown']
        return str(v) if v else None
    
    class Config:
        json_encoders = {
            UUID: str,
            datetime: lambda v: v.isoformat()
        }


class CleanSocialAnalytics(BaseModel):
    """
    Clean social analytics model for database insertion
    
    Represents engagement metrics for a social media post (task).
    Analytics are time-series data - the same task can have multiple
    analytics records at different measurement times.
    
    Relationship:
        Many analytics → One task (many-to-one)
        
    Fields:
        analytics_id: Unique identifier (auto-generated)
        task_id: Foreign key to tasks (required)
        likes: Number of likes/hearts on the post
        comments: Number of comments on the post
        shares: Number of shares/retweets
        reach: Number of unique users who saw the post
        impressions: Total number of times the post was displayed
        engagement_rate: Calculated engagement percentage
        additional_metrics: Flexible JSON field for platform-specific metrics
        measured_at: Timestamp when these metrics were captured
        
    Business Rules:
        - All metrics must be non-negative (enforced by validator)
        - Each analytics record is linked to exactly one task
        - Multiple analytics records per task are allowed (time-series)
        - Unique constraint on (task_id, measured_at) in database
        
    Calculated Fields (done in database):
        - engagement_score: Weighted sum of engagement metrics
        - impact_score: Engagement + reach-based scoring
        
    Example:
        >>> analytics = CleanSocialAnalytics(
        ...     task_id=task.task_id,
        ...     likes=150,
        ...     comments=12,
        ...     shares=8,
        ...     reach=2500,
        ...     measured_at=datetime.now()
        ... )
    """
    analytics_id: UUID = Field(default_factory=uuid4)
    task_id: UUID  # Required foreign key
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    reach: Optional[int] = None
    impressions: Optional[int] = None
    engagement_rate: Optional[float] = None  # Typically (likes+comments+shares)/reach
    additional_metrics: Dict[str, Any] = Field(default_factory=dict)
    measured_at: datetime = Field(default_factory=datetime.now)
    
    @field_validator('likes', 'comments', 'shares', 'reach', 'impressions')
    @classmethod
    def validate_non_negative(cls, v):
        """
        Ensure all engagement metrics are non-negative
        
        Business Rule: Engagement metrics cannot be negative as they
        represent counts of user actions or audience size.
        
        Strategy: Convert negative values to 0 rather than failing.
        This handles data entry errors while preserving the record.
        """
        if v is not None and v < 0:
            return 0  # Floor at 0 for invalid negative values
        return v
    
    class Config:
        json_encoders = {
            UUID: str,
            datetime: lambda v: v.isoformat()
        }


class CleanSalesAttribution(BaseModel):
    """
    Clean sales attribution model for database insertion
    
    Represents sales revenue attributed to an advocacy program.
    Not all programs have sales attribution (many are awareness-focused).
    
    Relationship:
        Zero or one attribution → One program (zero-or-one-to-one)
        
    Fields:
        attribution_id: Unique identifier (auto-generated)
        program_id: Foreign key to programs (required, unique constraint)
        amount: Sales amount (required, must be positive)
        currency: Currency code (default: USD)
        attributed_at: Timestamp when sales were attributed
        attribution_data: Flexible JSON field for attribution details
        
    Business Rules:
        - Amount must be positive (enforced by validator)
        - One program can have at most one sales attribution record
        - Amount is stored as Decimal for precise currency handling
        - Currency follows ISO 4217 codes (USD, EUR, GBP, etc.)
        
    Analytics Use Cases:
        - Calculate ROI per program
        - Identify high-performing advocates
        - Segment programs by revenue generation
        - Track conversion rates
        
    Example:
        >>> sales = CleanSalesAttribution(
        ...     program_id=program.program_id,
        ...     amount=Decimal("1234.56"),
        ...     currency="USD",
        ...     attributed_at=datetime.now()
        ... )
    """
    attribution_id: UUID = Field(default_factory=uuid4)
    program_id: UUID  # Required foreign key (unique constraint in DB)
    amount: Decimal   # Required - use Decimal for precise currency handling
    currency: str = 'USD'  # ISO 4217 currency code
    attributed_at: datetime = Field(default_factory=datetime.now)
    attribution_data: Dict[str, Any] = Field(default_factory=dict)
    
    @field_validator('amount')
    @classmethod
    def validate_positive_amount(cls, v):
        """
        Ensure sales amount is positive
        
        Business Rule: Sales attribution must represent actual revenue,
        which cannot be negative or zero.
        
        Strategy: Raise validation error for non-positive amounts.
        This is stricter than analytics metrics because revenue must
        be real and positive by definition.
        """
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v
    
    class Config:
        json_encoders = {
            UUID: str,
            Decimal: lambda v: float(v),  # Convert to float for JSON serialization
            datetime: lambda v: v.isoformat()
        }


class DataQualityIssue(BaseModel):
    """
    Data quality issue for logging and monitoring
    
    Tracks data quality problems encountered during ETL processing.
    These issues are logged to the database for analysis and trend monitoring.
    
    Fields:
        issue_id: Unique identifier (auto-generated)
        import_id: Foreign key to raw_imports (links to ETL run)
        severity: Issue severity level (low, medium, high, critical)
        issue_type: Type of issue (missing_email, invalid_platform, etc.)
        issue_description: Human-readable description
        affected_record_id: ID of the affected record (user_id, program_id, etc.)
        affected_field: Name of the problematic field
        problematic_value: The invalid value that caused the issue
        
    Severity Levels:
        - low: Minor issues that don't affect functionality (missing optional fields)
        - medium: Issues that reduce data quality but are handled (invalid emails)
        - high: Significant issues requiring fallback logic (missing required fields)
        - critical: Severe issues that prevent record processing (corrupted data)
        
    Use Cases:
        - Identify recurring data quality problems
        - Monitor data quality trends over time
        - Prioritize data source improvements
        - Generate data quality reports for stakeholders
        
    Example:
        >>> issue = DataQualityIssue(
        ...     import_id=etl.import_id,
        ...     severity='high',
        ...     issue_type='missing_email',
        ...     issue_description='User has no valid email address',
        ...     affected_record_id=str(user_id),
        ...     affected_field='email'
        ... )
    """
    issue_id: UUID = Field(default_factory=uuid4)
    import_id: Optional[UUID] = None  # Links to the ETL import run
    severity: str  # 'low', 'medium', 'high', 'critical'
    issue_type: str  # Category of issue (missing_email, invalid_platform, etc.)
    issue_description: str  # Human-readable description
    affected_record_id: Optional[str] = None  # ID of affected record
    affected_field: Optional[str] = None      # Name of problematic field
    problematic_value: Optional[Dict[str, Any]] = None  # The invalid value
    
    @field_validator('severity')
    @classmethod
    def validate_severity(cls, v):
        """
        Ensure severity level is valid
        
        Validates that severity is one of the four allowed levels.
        This ensures consistent severity classification across all
        data quality issues.
        
        Allowed Values:
            - low: Minor issues (missing optional data)
            - medium: Moderate issues (invalid formats that can be handled)
            - high: Significant issues (missing required data with fallback)
            - critical: Severe issues (data corruption, processing failures)
        """
        allowed = ['low', 'medium', 'high', 'critical']
        if v not in allowed:
            raise ValueError(f"Severity must be one of {allowed}")
        return v
    
    class Config:
        json_encoders = {
            UUID: str
        }


# ========================================================================
# BACKWARDS COMPATIBILITY ALIASES
# ========================================================================
# These aliases maintain compatibility with older code that used different names
CleanUser = CleanAdvocateUser  # Legacy alias for CleanAdvocateUser

