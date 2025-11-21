"""
Raw data models from JSON files

This module defines Pydantic models for parsing and validating raw JSON data
uploaded to the system. The models handle "dirty" data with extensive validation
and cleanup logic to gracefully handle common data quality issues.

Key Features:
    - Flexible type acceptance (handles both valid and invalid data)
    - Automatic data cleaning and normalization
    - Field validators for format standardization
    - Graceful handling of missing or malformed data
    - Converts invalid values to None instead of failing

Common Data Quality Issues Handled:
    - "NaN" strings instead of null values
    - Numeric values as strings ("123" → 123)
    - Invalid date formats or "not-a-date" strings
    - Platform names as numbers or wrong case
    - Broken URLs like "broken_link"
    - Invalid email formats or "invalid-email" placeholders
    - Currency symbols in numeric fields ("$123.45" → 123.45)
    - Missing UUIDs or invalid UUID formats

Philosophy:
    These models follow a "clean what we can, log what we can't" approach.
    Invalid data is converted to None and logged as data quality issues,
    allowing the ETL process to continue rather than failing entirely.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, model_validator
import re


class RawSocialAnalytics(BaseModel):
    """
    Raw social media analytics from JSON files
    
    Represents engagement metrics for social media posts. Handles common
    data quality issues like "NaN" strings, negative values, and missing data.
    
    Fields:
        likes: Number of likes/hearts on the post (may be "NaN" string)
        comments: Number of comments on the post
        shares: Number of shares/retweets
        reach: Number of unique users who saw the post
        impressions: Total number of times the post was displayed
        engagement_rate: Calculated engagement percentage (likes+comments+shares)/reach
        
    Data Quality Notes:
        - All fields are optional (many posts have incomplete analytics)
        - Numeric fields may come as strings and need conversion
        - "NaN" strings are normalized to None
        - Negative values are floored to 0 (reach, impressions)
    """
    likes: Optional[int | str] = None  # Can be int, "NaN", or null
    comments: Optional[int] = None
    shares: Optional[int] = None
    reach: Optional[int] = None
    impressions: Optional[int | str] = None  # Similar to likes, can be invalid
    engagement_rate: Optional[float | str] = None  # Can be float or invalid string
    
    @field_validator('likes', mode='before')
    @classmethod
    def clean_likes(cls, v):
        """
        Convert 'NaN' strings to None, handle invalid values
        
        Some data sources export "NaN" (Not a Number) as a string literal
        instead of null. This validator normalizes these to None.
        
        Handles:
            - None, empty string, "NaN" → None
            - Numeric strings → int
            - Invalid values → None (logged later as data quality issue)
        """
        if v is None or v == '' or v == 'NaN':
            return None
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                return None
        return v
    
    @field_validator('reach', mode='before')
    @classmethod
    def clean_reach(cls, v):
        """
        Ensure reach is non-negative
        
        Reach represents the number of unique users who saw content,
        so it cannot be negative. This validator floors negative values
        at 0 to handle data entry errors.
        
        Business Rule: Reach must be >= 0
        """
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return max(0, int(v))  # Floor at 0 (can't have negative reach)
        return None
    
    @field_validator('impressions', mode='before')
    @classmethod
    def clean_impressions(cls, v):
        """
        Convert 'NaN' strings to None, handle invalid values
        
        Impressions represent total views (including repeat views by same user).
        Like reach, this cannot be negative.
        
        Handles:
            - "NaN" strings → None
            - Negative values → 0
            - String numbers → int
        """
        if v is None or v == '' or v == 'NaN':
            return None
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                return None
        return max(0, int(v)) if isinstance(v, (int, float)) else None
    
    @field_validator('engagement_rate', mode='before')
    @classmethod
    def clean_engagement_rate(cls, v):
        """
        Parse engagement rate as float or return None
        
        Engagement rate is typically a percentage (0.0 to 100.0) representing
        (likes + comments + shares) / reach * 100.
        
        Handles:
            - "NaN" strings → None
            - String percentages → float
            - Invalid formats → None
        """
        if v is None or v == '' or v == 'NaN':
            return None
        if isinstance(v, str):
            try:
                return float(v)
            except ValueError:
                return None
        return float(v) if isinstance(v, (int, float)) else None


class RawTask(BaseModel):
    """
    Raw task data from JSON files
    
    Represents a single social media post/task completed by an advocate.
    Tasks are the atomic unit of work in advocacy programs.
    
    Fields:
        task_id: Unique identifier for the task (may be missing)
        platform: Social media platform (Instagram, TikTok, etc.)
        post_url: URL to the social media post
        posted_at: Date/time the post was published
        analytics: Nested analytics object (if available)
        likes/comments/shares/reach: Flat analytics fields (legacy format)
        
    Data Quality Issues Handled:
        - Platform as number instead of string (data entry error)
        - "broken_link" instead of actual URL
        - "not-a-date" instead of valid date
        - Missing task_id (generated during ETL)
        - Both nested and flat analytics formats
        
    Note:
        This model supports two analytics formats:
        1. Nested: analytics: {likes: 10, comments: 5}
        2. Flat: likes: 10, comments: 5 (at task level)
        The flat format is auto-converted to nested during validation.
    """
    task_id: Optional[str] = None
    platform: Optional[str | int] = None  # Can be string or number (data quality issue)
    post_url: Optional[str] = None
    posted_at: Optional[str] = None
    analytics: Optional[RawSocialAnalytics] = None
    
    # Analytics fields for flat JSON structure (backward compatibility)
    # Some data sources put analytics at the task level instead of nested
    likes: Optional[int | str] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    reach: Optional[int] = None
    
    @model_validator(mode='before')
    @classmethod
    def build_analytics(cls, values):
        """
        Build analytics object from flat structure if needed
        
        Some data sources provide analytics as flat fields at the task level:
            {task_id: "...", likes: 10, comments: 5, shares: 2}
        
        Others provide it nested:
            {task_id: "...", analytics: {likes: 10, comments: 5, shares: 2}}
        
        This validator detects the flat format and converts it to nested
        for consistent processing downstream.
        
        This enables backward compatibility with multiple data source formats.
        """
        if isinstance(values, dict):
            # Define analytics fields that might be at task level
            analytics_fields = ['likes', 'comments', 'shares', 'reach', 'impressions', 'engagement_rate']
            
            # If no nested analytics object exists but flat fields are present
            if 'analytics' not in values and any(k in values for k in analytics_fields):
                # Build nested analytics object from flat fields
                values['analytics'] = {
                    'likes': values.get('likes'),
                    'comments': values.get('comments'),
                    'shares': values.get('shares'),
                    'reach': values.get('reach'),
                    'impressions': values.get('impressions'),
                    'engagement_rate': values.get('engagement_rate')
                }
        return values
    
    @field_validator('task_id', mode='before')
    @classmethod
    def clean_task_id(cls, v):
        """
        Convert null or empty strings to None
        
        Missing task IDs will be generated during ETL (UUID).
        Empty strings are normalized to None for consistent handling.
        """
        if v is None or v == '':
            return None
        return v
    
    @field_validator('platform', mode='before')
    @classmethod
    def clean_platform(cls, v):
        """
        Normalize platform names and handle numeric errors
        
        Data Quality Issues:
            - Platform sometimes comes as a number (data entry error)
            - Platform names have inconsistent capitalization
            - Some platforms are unrecognized
        
        Solution:
            - Numbers → None (ETL will use 'Unknown' fallback)
            - Strings → Normalized to proper case (TikTok, Instagram, etc.)
            - Unrecognized → None (ETL will use 'Unknown' fallback)
        
        Business Rule:
            Valid platforms are: TikTok, Instagram, Facebook, YouTube, Twitter
            Invalid values are logged as data quality issues.
        """
        if v is None:
            return None
        
        # Handle data entry errors where platform is a number
        # This is a critical data quality issue that needs logging
        if isinstance(v, (int, float)):
            return None  # ETL will use 'Unknown' as fallback and log the issue
        
        # Normalize platform names to proper case for consistency
        # This enables consistent grouping and filtering in analytics
        platform_map = {
            'tiktok': 'TikTok',
            'instagram': 'Instagram',
            'facebook': 'Facebook',
            'youtube': 'YouTube',
            'twitter': 'Twitter',
            'unknown': 'Unknown'
        }
        
        # Convert to lowercase for case-insensitive matching
        platform_str = str(v).strip().lower()
        
        # Return standardized name or None for unrecognized platforms
        return platform_map.get(platform_str, None)
    
    @field_validator('post_url', mode='before')
    @classmethod
    def clean_post_url(cls, v):
        """Convert broken_link to None"""
        if v is None or v == '' or v == 'broken_link':
            return None
        # Basic URL validation
        if not isinstance(v, str) or not v.startswith(('http://', 'https://')):
            return None
        return v
    
    @field_validator('posted_at', mode='before')
    @classmethod
    def clean_posted_at(cls, v):
        """Parse date or return None"""
        if v is None or v == '' or v == 'not-a-date':
            return None
        if isinstance(v, str):
            # Try parsing with dateutil for better ISO format support
            try:
                from dateutil import parser as date_parser
                return date_parser.isoparse(v).isoformat()
            except (ValueError, ImportError):
                # Fallback to manual parsing
                date_formats = [
                    '%Y-%m-%d',
                    '%Y-%m-%dT%H:%M:%S.%fZ',  # ISO with milliseconds
                    '%Y-%m-%dT%H:%M:%S.%f',    # ISO with milliseconds, no Z
                    '%Y-%m-%dT%H:%M:%SZ',       # ISO without milliseconds
                    '%Y-%m-%dT%H:%M:%S',        # ISO without milliseconds or Z
                    '%Y-%m-%d %H:%M:%S',
                    '%m/%d/%Y',
                    '%d/%m/%Y'
                ]
                for fmt in date_formats:
                    try:
                        return datetime.strptime(v, fmt).isoformat()
                    except ValueError:
                        continue
        return None


class RawProgram(BaseModel):
    """Raw program data from JSON"""
    model_config = {'populate_by_name': True}  # Allow both 'tasks' and 'tasks_completed'
    
    program_id: Optional[str] = None
    brand: Optional[str | int] = None  # Can be string or number
    sales_attributed: Optional[str | float] = Field(default=None, alias='total_sales_attributed')  # Can be "no-data" or numeric
    tasks: List[RawTask] = Field(default_factory=list, alias='tasks_completed')
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    
    @field_validator('program_id', mode='before')
    @classmethod
    def clean_program_id(cls, v):
        """Convert empty strings to None"""
        if v is None or v == '':
            return None
        return v
    
    @field_validator('brand', mode='before')
    @classmethod
    def clean_brand(cls, v):
        """Convert to text, null if empty or numeric"""
        if v is None or v == '':
            return None
        # If brand is numeric (int or float), return None
        if isinstance(v, (int, float)):
            return None
        # Only accept string values
        return str(v).strip()
    
    @field_validator('sales_attributed', mode='before')
    @classmethod
    def clean_sales(cls, v):
        """Convert 'no-data' to None, parse numeric values"""
        if v is None or v == '' or v == 'no-data':
            return None
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            try:
                # Remove currency symbols and parse
                cleaned = re.sub(r'[,$]', '', v)
                return float(cleaned)
            except ValueError:
                return None
        return None
    
    @field_validator('started_at', mode='before')
    @classmethod
    def clean_started_at(cls, v):
        """Parse date or return None"""
        if v is None or v == '' or v == 'not-a-date':
            return None
        if isinstance(v, str):
            # Try parsing with dateutil for better ISO format support
            try:
                from dateutil import parser as date_parser
                return date_parser.isoparse(v).isoformat()
            except (ValueError, ImportError):
                # Fallback to manual parsing
                date_formats = [
                    '%Y-%m-%d',
                    '%Y-%m-%dT%H:%M:%S.%fZ',
                    '%Y-%m-%dT%H:%M:%S.%f',
                    '%Y-%m-%dT%H:%M:%SZ',
                    '%Y-%m-%dT%H:%M:%S',
                    '%Y-%m-%d %H:%M:%S',
                    '%m/%d/%Y',
                    '%d/%m/%Y'
                ]
                for fmt in date_formats:
                    try:
                        return datetime.strptime(v, fmt).isoformat()
                    except ValueError:
                        continue
        return None
    
    @field_validator('completed_at', mode='before')
    @classmethod
    def clean_completed_at(cls, v):
        """Parse date or return None"""
        if v is None or v == '' or v == 'not-a-date':
            return None
        if isinstance(v, str):
            # Try parsing with dateutil for better ISO format support
            try:
                from dateutil import parser as date_parser
                return date_parser.isoparse(v).isoformat()
            except (ValueError, ImportError):
                # Fallback to manual parsing
                date_formats = [
                    '%Y-%m-%d',
                    '%Y-%m-%dT%H:%M:%S.%fZ',
                    '%Y-%m-%dT%H:%M:%S.%f',
                    '%Y-%m-%dT%H:%M:%SZ',
                    '%Y-%m-%dT%H:%M:%S',
                    '%Y-%m-%d %H:%M:%S',
                    '%m/%d/%Y',
                    '%d/%m/%Y'
                ]
                for fmt in date_formats:
                    try:
                        return datetime.strptime(v, fmt).isoformat()
                    except ValueError:
                        continue
        return None


class RawAdvocateUser(BaseModel):
    """Raw advocate user data from JSON files"""
    user_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None  # Will be extracted to create/link advocate account
    instagram_handle: Optional[str] = None
    tiktok_handle: Optional[str] = None
    joined_at: Optional[str] = None
    advocacy_programs: List[RawProgram] = Field(default_factory=list)
    
    @field_validator('user_id', mode='before')
    @classmethod
    def clean_user_id(cls, v):
        """Validate UUID format or return None"""
        if v is None or v == '':
            return None
        try:
            from uuid import UUID
            UUID(v)
            return v
        except (ValueError, AttributeError):
            return None
    
    @field_validator('name', mode='before')
    @classmethod
    def clean_name(cls, v):
        """Always return text type, null if empty or placeholder"""
        if v is None or v == '' or v == '???':
            return None  # Null allowed when empty
        return str(v).strip()
    
    @field_validator('email', mode='before')
    @classmethod
    def clean_email(cls, v):
        """Validate email format or return None"""
        if v is None or v == '' or v == 'invalid-email':
            return None
        # Basic email validation
        if not isinstance(v, str) or '@' not in v:
            return None
        # More thorough validation
        email_pattern = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        if re.match(email_pattern, v):
            return v.lower()
        return None
    
    @field_validator('instagram_handle', mode='before')
    @classmethod
    def clean_instagram(cls, v):
        """Clean Instagram handle format"""
        if v is None or v == '':
            return None
        handle = str(v).strip()
        # Remove @ if present
        handle = handle.lstrip('@')
        # Validate format
        if re.match(r'^[A-Za-z0-9._]+$', handle):
            return f"@{handle}"
        return None
    
    @field_validator('tiktok_handle', mode='before')
    @classmethod
    def clean_tiktok(cls, v):
        """Clean TikTok handle format, handle errors"""
        if v is None or v == '' or not isinstance(v, str):
            return None
        handle = str(v).strip()
        # Remove @ if present
        handle = handle.lstrip('@')
        # Validate format
        if re.match(r'^[A-Za-z0-9._]+$', handle):
            return f"@{handle}"
        return None
    
    @field_validator('joined_at', mode='before')
    @classmethod
    def clean_joined_at(cls, v):
        """Parse date or return None"""
        if v is None or v == '' or v == 'not-a-date':
            return None
        if isinstance(v, str):
            # Try parsing with dateutil for better ISO format support
            try:
                from dateutil import parser as date_parser
                return date_parser.isoparse(v).isoformat()
            except (ValueError, ImportError):
                # Fallback to manual parsing
                date_formats = [
                    '%Y-%m-%d',
                    '%Y-%m-%dT%H:%M:%S.%fZ',  # ISO with milliseconds
                    '%Y-%m-%dT%H:%M:%S.%f',    # ISO with milliseconds, no Z
                    '%Y-%m-%dT%H:%M:%SZ',       # ISO without milliseconds
                    '%Y-%m-%dT%H:%M:%S',        # ISO without milliseconds or Z
                    '%Y-%m-%d %H:%M:%S',
                    '%m/%d/%Y',
                    '%d/%m/%Y'
                ]
                for fmt in date_formats:
                    try:
                        return datetime.strptime(v, fmt).isoformat()
                    except ValueError:
                        continue
        return None


# Backwards compatibility alias
RawUser = RawAdvocateUser

