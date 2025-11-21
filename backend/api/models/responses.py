"""
Pydantic response models for API endpoints
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal


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

