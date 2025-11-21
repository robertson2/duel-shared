"""
Test suite for Advocacy Platform ETL Pipeline and API
Run with: pytest test_advocacy_platform.py -v
"""

import pytest
from uuid import uuid4, UUID
from datetime import datetime
from decimal import Decimal
import json
from pathlib import Path

from backend.models import (
    RawAdvocateUser, RawProgram, RawTask, RawSocialAnalytics,
    CleanAdvocateAccount, CleanAdvocateUser, CleanProgram, CleanTask, 
    CleanSocialAnalytics, CleanSalesAttribution,
    # Backwards compatibility
    RawUser, CleanUser
)


# ============================================================================
# DATA VALIDATION TESTS
# ============================================================================

class TestRawDataValidation:
    """Test raw data validation and cleaning"""
    
    def test_clean_invalid_email(self):
        """Test that invalid emails are converted to None"""
        raw_user = RawUser(
            email="invalid-email",
            name="Test User",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.email is None
    
    def test_clean_valid_email(self):
        """Test that valid emails are preserved"""
        raw_user = RawUser(
            email="test@example.com",
            name="Test User",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.email == "test@example.com"
    
    def test_clean_placeholder_name(self):
        """Test that placeholder names are converted to None"""
        raw_user = RawUser(
            email="test@example.com",
            name="???",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.name is None
    
    def test_clean_empty_name(self):
        """Test that empty names are converted to None"""
        raw_user = RawUser(
            email="test@example.com",
            name="",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.name is None
    
    def test_clean_valid_name(self):
        """Test that valid names are preserved"""
        raw_user = RawUser(
            email="test@example.com",
            name="John Doe",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.name == "John Doe"
    
    def test_clean_invalid_user_id(self):
        """Test that invalid UUIDs are converted to None"""
        raw_user = RawUser(
            user_id="not-a-uuid",
            email="test@example.com",
            name="Test User",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.user_id is None
    
    def test_clean_valid_user_id(self):
        """Test that valid UUIDs are preserved"""
        valid_uuid = str(uuid4())
        raw_user = RawUser(
            user_id=valid_uuid,
            email="test@example.com",
            name="Test User",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.user_id == valid_uuid
    
    def test_clean_instagram_handle(self):
        """Test Instagram handle formatting"""
        raw_user = RawUser(
            email="test@example.com",
            name="Test User",
            instagram_handle="testuser",  # Without @
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.instagram_handle == "@testuser"
    
    def test_clean_tiktok_handle(self):
        """Test TikTok handle formatting"""
        raw_user = RawUser(
            email="test@example.com",
            name="Test User",
            tiktok_handle="testuser",  # Without @
            advocacy_programs=[]
        )
        assert raw_user.tiktok_handle == "@testuser"
    
    def test_clean_invalid_date(self):
        """Test that invalid dates are converted to None"""
        raw_user = RawUser(
            email="test@example.com",
            name="Test User",
            joined_at="not-a-date",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.joined_at is None
    
    def test_clean_valid_date(self):
        """Test that valid dates are parsed"""
        raw_user = RawUser(
            email="test@example.com",
            name="Test User",
            joined_at="2024-01-15",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.joined_at is not None
    
    def test_clean_date_with_milliseconds(self):
        """Test that ISO dates with milliseconds are parsed correctly"""
        raw_user = RawUser(
            email="test@example.com",
            name="Test User",
            joined_at="2024-09-07T15:59:34.170Z",
            tiktok_handle="@test",
            advocacy_programs=[]
        )
        assert raw_user.joined_at is not None
        assert "2024-09-07" in raw_user.joined_at
        assert "15:59:34" in raw_user.joined_at
    
    def test_clean_numeric_brand_to_null(self):
        """Test that numeric brand values are converted to None"""
        raw_program = RawProgram(
            brand=12345,  # Numeric value
            tasks=[]
        )
        assert raw_program.brand is None  # Numeric values become None
    
    def test_clean_string_brand(self):
        """Test that string brands are preserved"""
        raw_program = RawProgram(
            brand="Test Brand",
            tasks=[]
        )
        assert raw_program.brand == "Test Brand"
    
    def test_clean_empty_brand(self):
        """Test that empty brands are converted to None"""
        raw_program = RawProgram(
            brand="",
            tasks=[]
        )
        assert raw_program.brand is None
    
    def test_clean_nan_likes(self):
        """Test that 'NaN' strings for likes are converted to None"""
        raw_analytics = RawSocialAnalytics(
            likes="NaN"
        )
        assert raw_analytics.likes is None
    
    def test_clean_numeric_likes(self):
        """Test that numeric likes are preserved"""
        raw_analytics = RawSocialAnalytics(
            likes=150
        )
        assert raw_analytics.likes == 150
    
    def test_clean_negative_reach(self):
        """Test that negative reach is floored at 0"""
        raw_analytics = RawSocialAnalytics(
            reach=-1000
        )
        assert raw_analytics.reach == 0
    
    def test_clean_broken_link(self):
        """Test that broken links are converted to None"""
        raw_task = RawTask(
            platform="TikTok",
            post_url="broken_link"
        )
        assert raw_task.post_url is None
    
    def test_clean_numeric_platform(self):
        """Test that numeric platforms are converted to None"""
        raw_task = RawTask(
            platform=12345
        )
        assert raw_task.platform is None
    
    def test_clean_platform_normalization(self):
        """Test that platform names are normalized"""
        raw_task = RawTask(
            platform="tiktok"  # Lowercase
        )
        assert raw_task.platform == "TikTok"
    
    def test_clean_no_data_sales(self):
        """Test that 'no-data' sales are converted to None"""
        raw_program = RawProgram(
            brand="Test Brand",
            sales_attributed="no-data",
            tasks=[]
        )
        assert raw_program.sales_attributed is None
    
    def test_clean_numeric_sales(self):
        """Test that numeric sales are preserved"""
        raw_program = RawProgram(
            brand="Test Brand",
            sales_attributed=2500.50,
            tasks=[]
        )
        assert raw_program.sales_attributed == 2500.50
    
    def test_sales_attributed_alias(self):
        """Test that total_sales_attributed maps to sales_attributed"""
        data = {
            "brand": "Test Brand",
            "total_sales_attributed": 500.50,  # JSON field name
            "tasks_completed": []
        }
        raw_program = RawProgram(**data)
        assert raw_program.sales_attributed == 500.50
    
    def test_tasks_completed_alias(self):
        """Test that tasks_completed maps to tasks field"""
        data = {
            "brand": "Test Brand",
            "tasks_completed": [  # JSON field name
                {
                    "platform": "TikTok",
                    "post_url": "https://test.com"
                }
            ]
        }
        raw_program = RawProgram(**data)
        assert len(raw_program.tasks) == 1
        assert raw_program.tasks[0].platform == "TikTok"
    
    def test_flat_analytics_structure(self):
        """Test that flat analytics fields are converted to nested structure"""
        data = {
            "platform": "Instagram",
            "likes": 100,
            "comments": 20,
            "shares": 10,
            "reach": 5000
        }
        raw_task = RawTask(**data)
        assert raw_task.analytics is not None
        assert raw_task.analytics.likes == 100
        assert raw_task.analytics.comments == 20
        assert raw_task.analytics.shares == 10
        assert raw_task.analytics.reach == 5000
    
    def test_unknown_platform_accepted(self):
        """Test that 'Unknown' is accepted as a valid platform"""
        raw_task = RawTask(platform="Unknown")
        assert raw_task.platform == "Unknown"
    
    def test_clean_impressions(self):
        """Test that impressions are parsed correctly"""
        raw_analytics = RawSocialAnalytics(
            impressions=15000
        )
        assert raw_analytics.impressions == 15000
    
    def test_clean_nan_impressions(self):
        """Test that 'NaN' impressions are converted to None"""
        raw_analytics = RawSocialAnalytics(
            impressions="NaN"
        )
        assert raw_analytics.impressions is None
    
    def test_clean_engagement_rate(self):
        """Test that engagement rate is parsed correctly"""
        raw_analytics = RawSocialAnalytics(
            engagement_rate=0.085
        )
        assert raw_analytics.engagement_rate == 0.085
    
    def test_clean_nan_engagement_rate(self):
        """Test that 'NaN' engagement rate is converted to None"""
        raw_analytics = RawSocialAnalytics(
            engagement_rate="NaN"
        )
        assert raw_analytics.engagement_rate is None
    
    def test_posted_at_date_parsing(self):
        """Test that posted_at dates are parsed correctly"""
        raw_task = RawTask(
            platform="TikTok",
            posted_at="2024-05-10T14:22:33.456Z"
        )
        assert raw_task.posted_at is not None
        assert "2024-05-10" in raw_task.posted_at
    
    def test_started_at_date_parsing(self):
        """Test that started_at dates are parsed correctly"""
        raw_program = RawProgram(
            brand="Test Brand",
            started_at="2024-01-01T00:00:00.000Z",
            tasks=[]
        )
        assert raw_program.started_at is not None
        assert "2024-01-01" in raw_program.started_at
    
    def test_completed_at_date_parsing(self):
        """Test that completed_at dates are parsed correctly"""
        raw_program = RawProgram(
            brand="Test Brand",
            completed_at="2024-11-15T23:59:59.999Z",
            tasks=[]
        )
        assert raw_program.completed_at is not None
        assert "2024-11-15" in raw_program.completed_at


class TestCleanDataModels:
    """Test clean data models"""
    
    def test_clean_advocate_account_model(self):
        """Test CleanAdvocateAccount model creation"""
        account = CleanAdvocateAccount(
            email="test@example.com"
        )
        assert isinstance(account.account_id, UUID)
        assert account.email == "test@example.com"
    
    def test_clean_advocate_user_model(self):
        """Test CleanAdvocateUser model creation"""
        account_id = uuid4()
        user = CleanAdvocateUser(
            account_id=account_id,
            name="Test User",
            instagram_handle="@testuser",
            tiktok_handle="@testuser"
        )
        assert isinstance(user.user_id, UUID)
        assert user.account_id == account_id
        assert user.name == "Test User"
    
    def test_clean_program_model(self):
        """Test CleanProgram model creation"""
        user_id = uuid4()
        program = CleanProgram(
            user_id=user_id,
            brand="Test Brand"
        )
        assert isinstance(program.program_id, UUID)
        assert program.user_id == user_id
        assert program.brand == "Test Brand"
    
    def test_clean_task_model_validation(self):
        """Test CleanTask platform validation"""
        program_id = uuid4()
        
        # Valid platform
        task = CleanTask(
            program_id=program_id,
            platform="TikTok"
        )
        assert task.platform == "TikTok"
        
        # Unknown platform is now accepted (for flexibility)
        task_unknown = CleanTask(
            program_id=program_id,
            platform="Unknown"
        )
        assert task_unknown.platform == "Unknown"
    
    def test_clean_analytics_non_negative(self):
        """Test that analytics values are non-negative"""
        task_id = uuid4()
        analytics = CleanSocialAnalytics(
            task_id=task_id,
            likes=-10,  # Should be converted to 0
            comments=5,
            shares=10,
            impressions=-100  # Should be converted to 0
        )
        assert analytics.likes == 0
        assert analytics.comments == 5
        assert analytics.impressions == 0
    
    def test_clean_analytics_with_new_fields(self):
        """Test CleanSocialAnalytics with impressions and engagement_rate"""
        task_id = uuid4()
        analytics = CleanSocialAnalytics(
            task_id=task_id,
            likes=1000,
            comments=50,
            shares=25,
            reach=10000,
            impressions=15000,
            engagement_rate=0.085
        )
        assert analytics.impressions == 15000
        assert analytics.engagement_rate == 0.085
    
    def test_clean_sales_positive_amount(self):
        """Test that sales amount must be positive"""
        program_id = uuid4()
        
        # Valid positive amount
        sales = CleanSalesAttribution(
            program_id=program_id,
            amount=Decimal("100.00")
        )
        assert sales.amount == Decimal("100.00")
        
        # Zero or negative should raise error
        with pytest.raises(ValueError):
            CleanSalesAttribution(
                program_id=program_id,
                amount=Decimal("0.00")
            )


# ============================================================================
# ETL PIPELINE TESTS
# ============================================================================

class TestETLPipeline:
    """Test ETL pipeline functionality"""
    
    @pytest.fixture
    def sample_json_data(self):
        """Fixture providing sample JSON data"""
        return {
            "user_id": str(uuid4()),
            "name": "Test User",
            "email": "test@example.com",
            "instagram_handle": "@testuser",
            "tiktok_handle": "@testuser",
            "joined_at": "2024-09-07T15:59:34.170Z",  # ISO with milliseconds
            "advocacy_programs": [
                {
                    "program_id": str(uuid4()),
                    "brand": "Test Brand",
                    "started_at": "2024-01-01T00:00:00.000Z",
                    "completed_at": "2024-11-15T23:59:59.999Z",
                    "total_sales_attributed": 1500.00,  # Correct JSON field name
                    "tasks_completed": [  # Correct JSON field name
                        {
                            "task_id": str(uuid4()),
                            "platform": "TikTok",
                            "post_url": "https://tiktok.com/test",
                            "posted_at": "2024-05-10T14:22:33.456Z",  # ISO with milliseconds
                            "likes": 250,  # Flat structure (also tests analytics builder)
                            "comments": 30,
                            "shares": 15,
                            "reach": 5000,
                            "impressions": 7500,
                            "engagement_rate": 0.06
                        }
                    ]
                }
            ]
        }
    
    def test_parse_valid_json(self, sample_json_data):
        """Test parsing valid JSON data"""
        raw_user = RawUser(**sample_json_data)
        
        # Test user fields
        assert raw_user.name == "Test User"
        assert raw_user.email == "test@example.com"
        assert raw_user.joined_at is not None
        assert "2024-09-07" in raw_user.joined_at  # Date with milliseconds parsed
        
        # Test program fields
        assert len(raw_user.advocacy_programs) == 1
        program = raw_user.advocacy_programs[0]
        assert program.brand == "Test Brand"
        assert program.sales_attributed == 1500.00  # From total_sales_attributed
        assert program.started_at is not None
        assert "2024-01-01" in program.started_at
        assert program.completed_at is not None
        assert "2024-11-15" in program.completed_at
        
        # Test task fields
        assert len(program.tasks) == 1  # From tasks_completed
        task = program.tasks[0]
        assert task.platform == "TikTok"
        assert task.posted_at is not None
        assert "2024-05-10" in task.posted_at
        
        # Check that flat analytics were converted to nested structure
        assert task.analytics is not None
        assert task.analytics.likes == 250
        assert task.analytics.comments == 30
        assert task.analytics.shares == 15
        assert task.analytics.reach == 5000
        assert task.analytics.impressions == 7500
        assert task.analytics.engagement_rate == 0.06
    
    def test_parse_json_with_errors(self):
        """Test parsing JSON with data quality issues"""
        data = {
            "user_id": "invalid-uuid",
            "name": "???",
            "email": "invalid-email",
            "instagram_handle": None,
            "tiktok_handle": "@test",
            "joined_at": "not-a-date",
            "advocacy_programs": [
                {
                    "program_id": "",
                    "brand": 12345,  # Numeric value - converted to string
                    "sales_attributed": "no-data",
                    "tasks": [
                        {
                            "task_id": None,
                            "platform": 999,  # Numeric error
                            "post_url": "broken_link",
                            "analytics": {
                                "likes": "NaN",
                                "comments": None,
                                "reach": -1000
                            }
                        }
                    ]
                }
            ]
        }
        
        raw_user = RawUser(**data)
        
        # All invalid values should be cleaned appropriately
        assert raw_user.user_id is None
        assert raw_user.name is None
        assert raw_user.email is None
        assert raw_user.joined_at is None
        assert raw_user.advocacy_programs[0].program_id is None
        assert raw_user.advocacy_programs[0].brand is None  # Numeric converted to None
        assert raw_user.advocacy_programs[0].sales_attributed is None
        assert raw_user.advocacy_programs[0].tasks[0].platform is None  # Numeric platform → None
        assert raw_user.advocacy_programs[0].tasks[0].post_url is None
        assert raw_user.advocacy_programs[0].tasks[0].analytics.likes is None
        assert raw_user.advocacy_programs[0].tasks[0].analytics.reach == 0
    
    def test_etl_numeric_brand_uses_fallback(self):
        """Test that ETL transforms programs with numeric brands to use 'Unknown' fallback"""
        from etl_pipeline import AdvocacyETL
        
        data = [{
            "user_id": str(uuid4()),
            "name": "Test User",
            "email": "test@example.com",
            "tiktok_handle": "@test",
            "advocacy_programs": [
                {
                    "program_id": str(uuid4()),
                    "brand": 99999,  # Numeric brand
                    "tasks": [
                        {
                            "platform": "TikTok",
                            "post_url": "https://tiktok.com/test"
                        }
                    ]
                }
            ]
        }]
        
        # Mock ETL without database
        etl = AdvocacyETL({'host': 'localhost', 'port': 5432, 'database': 'test', 'user': 'test', 'password': 'test'})
        clean_data = etl.transform_user_data(data)
        
        # Verify program was created with fallback brand
        assert len(clean_data) == 1
        user, programs, account = clean_data[0]
        assert isinstance(account, CleanAdvocateAccount)
        assert account.email == "test@example.com"
        assert len(programs) == 1
        program, tasks, sales = programs[0]
        assert program.brand == "Unknown"  # Fallback value used
        
        # Verify quality issue was logged
        quality_issues = [issue for issue in etl.data_quality_issues if issue.issue_type == 'missing_brand']
        assert len(quality_issues) == 1
        assert "Unknown" in quality_issues[0].issue_description


# ============================================================================
# DATABASE INTEGRATION TESTS (requires test DB)
# ============================================================================

class TestDatabaseOperations:
    """Test database operations (requires test database)"""
    
    @pytest.fixture
    def db_config(self):
        """Fixture providing test database configuration"""
        return {
            'host': 'localhost',
            'port': 5432,
            'dbname': 'advocacy_platform_test',  # psycopg3 uses 'dbname'
            'user': 'postgres',
            'password': 'test_password'
        }
    
    @pytest.mark.integration
    def test_insert_advocate_user(self, db_config):
        """Test inserting an advocate account and user into database"""
        import psycopg
        from psycopg.types.json import Json
        
        try:
            conn = psycopg.connect(**db_config)
            cursor = conn.cursor()
            
            # Create advocate account first
            account = CleanAdvocateAccount(
                email="test@example.com"
            )
            
            cursor.execute("""
                INSERT INTO advocate_accounts (account_id, email, metadata)
                VALUES (%s, %s, %s)
            """, (account.account_id, account.email, Json(account.metadata)))
            
            # Create advocate user
            user = CleanAdvocateUser(
                account_id=account.account_id,
                name="Test User"
            )
            
            cursor.execute("""
                INSERT INTO advocate_users (user_id, account_id, name, metadata)
                VALUES (%s, %s, %s, %s)
            """, (user.user_id, user.account_id, user.name, Json(user.metadata)))
            
            conn.commit()
            
            # Verify insertion
            cursor.execute("""
                SELECT u.user_id, u.name, acc.email 
                FROM advocate_users u
                JOIN advocate_accounts acc ON u.account_id = acc.account_id
                WHERE u.user_id = %s
            """, (user.user_id,))
            result = cursor.fetchone()
            
            assert result is not None
            assert result[1] == "Test User"
            assert result[2] == "test@example.com"
            
        except psycopg.OperationalError:
            pytest.skip("Test database not available")
        finally:
            if conn:
                conn.close()


# ============================================================================
# API ENDPOINT TESTS
# ============================================================================

class TestAPIEndpoints:
    """Test API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Fixture providing FastAPI test client"""
        from fastapi.testclient import TestClient
        from api import app
        
        return TestClient(app)
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
    
    @pytest.mark.integration
    def test_get_users(self, client):
        """Test get users endpoint"""
        response = client.get("/api/v1/users?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.integration
    def test_get_user_by_id(self, client):
        """Test get user by ID endpoint"""
        # This would fail without data, but tests the endpoint structure
        test_uuid = uuid4()
        response = client.get(f"/api/v1/users/{test_uuid}")
        # Expect 404 for non-existent user
        assert response.status_code in [200, 404]
    
    @pytest.mark.integration
    def test_get_platform_performance(self, client):
        """Test platform performance endpoint"""
        response = client.get("/api/v1/analytics/platforms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ============================================================================
# DATA QUALITY TESTS
# ============================================================================

class TestDataQualityChecks:
    """Test data quality validation"""
    
    def test_email_validation(self):
        """Test email format validation"""
        valid_emails = [
            "user@example.com",
            "test.user@example.com",
            "user+tag@example.co.uk"
        ]
        
        invalid_emails = [
            "invalid-email",
            "@example.com",
            "user@",
            "user",
            ""
        ]
        
        for email in valid_emails:
            user = RawUser(email=email, tiktok_handle="@test", advocacy_programs=[])
            assert user.email is not None
        
        for email in invalid_emails:
            user = RawUser(email=email, tiktok_handle="@test", advocacy_programs=[])
            assert user.email is None
    
    def test_platform_validation(self):
        """Test platform name validation"""
        valid_platforms = ["TikTok", "Instagram", "Facebook", "YouTube", "Twitter", "Unknown", "tiktok", "instagram"]
        
        for platform in valid_platforms:
            task = RawTask(platform=platform)
            assert task.platform is not None
        
        # Numeric platforms should be None (ETL will use 'Unknown' as fallback)
        task = RawTask(platform=12345)
        assert task.platform is None
    
    def test_sales_amount_validation(self):
        """Test sales amount validation"""
        program_id = uuid4()
        
        # Valid amounts
        for amount in [100.00, 1500.50, 4999.99]:
            sales = CleanSalesAttribution(
                program_id=program_id,
                amount=Decimal(str(amount))
            )
            assert sales.amount == Decimal(str(amount))
        
        # Invalid amounts should raise error
        with pytest.raises(ValueError):
            CleanSalesAttribution(
                program_id=program_id,
                amount=Decimal("0.00")
            )
        
        with pytest.raises(ValueError):
            CleanSalesAttribution(
                program_id=program_id,
                amount=Decimal("-100.00")
            )


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

class TestPerformance:
    """Test performance of data processing"""
    
    def test_bulk_user_parsing(self):
        """Test parsing large number of user records"""
        import time
        
        # Generate 1000 sample records
        records = []
        for i in range(1000):
            records.append({
                "user_id": str(uuid4()),
                "name": f"User {i}",
                "email": f"user{i}@example.com",
                "tiktok_handle": f"@user{i}",
                "advocacy_programs": []
            })
        
        start_time = time.time()
        
        # Parse all records
        parsed = []
        for record in records:
            parsed.append(RawUser(**record))
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should process 1000 records in less than 1 second
        assert duration < 1.0
        assert len(parsed) == 1000


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
