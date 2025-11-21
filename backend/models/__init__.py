"""
Data models for advocacy platform
"""

from .raw import (
    RawAdvocateUser,
    RawProgram,
    RawTask,
    RawSocialAnalytics,
    # Backwards compatibility
    RawUser
)

from .clean import (
    CleanAdvocateAccount,
    CleanAdvocateUser,
    CleanProgram,
    CleanTask,
    CleanSocialAnalytics,
    CleanSalesAttribution,
    DataQualityIssue,
    # Backwards compatibility
    CleanUser
)

__all__ = [
    # Raw models
    'RawAdvocateUser',
    'RawProgram',
    'RawTask',
    'RawSocialAnalytics',
    'RawUser',
    # Clean models
    'CleanAdvocateAccount',
    'CleanAdvocateUser',
    'CleanProgram',
    'CleanTask',
    'CleanSocialAnalytics',
    'CleanSalesAttribution',
    'DataQualityIssue',
    'CleanUser'
]

