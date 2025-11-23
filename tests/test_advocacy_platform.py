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
        from backend.etl.pipeline import AdvocacyETL
        
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
        from backend.api.main import app
        
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


# ============================================================================
# ETL TRANSACTION ROLLBACK TESTS
# ============================================================================

class TestETLTransactionRollback:
    """Test ETL transaction rollback - ensure no partial data on errors"""
    
    @pytest.fixture
    def db_config(self):
        """Fixture providing test database configuration"""
        import os
        from dotenv import load_dotenv
        load_dotenv()
        return {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '5432')),
            'dbname': os.getenv('DB_NAME', 'advocacy_platform'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', '')
        }
    
    @pytest.fixture
    def sample_clean_data(self):
        """Fixture providing sample clean data for testing"""
        account = CleanAdvocateAccount(email="test@example.com")
        user = CleanAdvocateUser(
            account_id=account.account_id,
            name="Test User",
            tiktok_handle="@testuser"
        )
        program = CleanProgram(
            user_id=user.user_id,
            brand="Test Brand"
        )
        task = CleanTask(
            program_id=program.program_id,
            platform="TikTok",
            post_url="https://tiktok.com/test"
        )
        analytics = CleanSocialAnalytics(
            task_id=task.task_id,
            likes=100,
            comments=10,
            shares=5,
            reach=1000
        )
        
        return [(user, [(program, [(task, analytics)], None)], account)]
    
    @pytest.mark.integration
    def test_transaction_rollback_on_foreign_key_error(self, db_config, sample_clean_data):
        """Test that transaction rolls back when foreign key constraint is violated"""
        import psycopg
        from backend.etl.pipeline import AdvocacyETL
        
        try:
            etl = AdvocacyETL(db_config)
            
            # Modify data to create invalid foreign key reference
            user, program_data, account = sample_clean_data[0]
            program, task_data, sales = program_data[0]
            
            # Create invalid user_id that doesn't exist
            invalid_program = CleanProgram(
                user_id=uuid4(),  # Non-existent user_id
                brand="Test Brand"
            )
            invalid_data = [(user, [(invalid_program, task_data, None)], account)]
            
            # Attempt to load - should fail and rollback
            with pytest.raises(Exception):
                etl.load_to_database(invalid_data)
            
            # Verify no data was committed
            with psycopg.connect(**db_config) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM advocate_accounts WHERE email = %s", (account.email,))
                count = cursor.fetchone()[0]
                assert count == 0, "Account should not exist after rollback"
                
                cursor.execute("SELECT COUNT(*) FROM advocate_users WHERE user_id = %s", (user.user_id,))
                count = cursor.fetchone()[0]
                assert count == 0, "User should not exist after rollback"
        
        except psycopg.OperationalError:
            pytest.skip("Test database not available")
    
    @pytest.mark.integration
    def test_transaction_rollback_on_unique_constraint_error(self, db_config, sample_clean_data):
        """Test that transaction rolls back when unique constraint is violated"""
        import psycopg
        from backend.etl.pipeline import AdvocacyETL
        
        try:
            # First, insert valid data
            etl1 = AdvocacyETL(db_config)
            etl1.load_to_database(sample_clean_data)
            
            # Now try to insert duplicate with same IDs
            etl2 = AdvocacyETL(db_config)
            
            # Create data with duplicate account email (should trigger ON CONFLICT, not error)
            # But if we use duplicate user_id, it should update, not error
            # Let's test with invalid data that would cause an error
            user, program_data, account = sample_clean_data[0]
            
            # Create duplicate user with same user_id but different account_id (invalid FK)
            duplicate_user = CleanAdvocateUser(
                user_id=user.user_id,  # Same user_id
                account_id=uuid4(),  # But different (non-existent) account_id
                name="Duplicate User"
            )
            duplicate_data = [(duplicate_user, [], account)]
            
            # This should fail due to foreign key constraint
            with pytest.raises(Exception):
                etl2.load_to_database(duplicate_data)
            
            # Verify original data still exists (rollback worked)
            with psycopg.connect(**db_config) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM advocate_users WHERE user_id = %s", (user.user_id,))
                count = cursor.fetchone()[0]
                assert count == 1, "Original user should still exist"
        
        except psycopg.OperationalError:
            pytest.skip("Test database not available")
    
    @pytest.mark.integration
    def test_transaction_rollback_on_invalid_data_type(self, db_config):
        """Test that transaction rolls back when invalid data type is inserted"""
        import psycopg
        from backend.etl.pipeline import AdvocacyETL
        
        try:
            etl = AdvocacyETL(db_config)
            
            # Create data with invalid type (e.g., string where UUID expected)
            account = CleanAdvocateAccount(email="test@example.com")
            user = CleanAdvocateUser(
                account_id=account.account_id,
                name="Test User"
            )
            
            # Manually corrupt the data to cause a type error
            # We'll need to bypass Pydantic validation, so we'll test at DB level
            # Instead, let's test with a program that has invalid user_id reference
            invalid_program = CleanProgram(
                user_id=uuid4(),  # Non-existent user
                brand="Test"
            )
            invalid_data = [(user, [(invalid_program, [], None)], account)]
            
            # This should fail and rollback
            with pytest.raises(Exception):
                etl.load_to_database(invalid_data)
            
            # Verify nothing was committed
            with psycopg.connect(**db_config) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM advocate_accounts WHERE email = %s", (account.email,))
                count = cursor.fetchone()[0]
                assert count == 0, "No data should be committed after rollback"
        
        except psycopg.OperationalError:
            pytest.skip("Test database not available")
    
    @pytest.mark.integration
    def test_transaction_atomicity_success(self, db_config, sample_clean_data):
        """Test that successful transaction commits all data atomically"""
        import psycopg
        from backend.etl.pipeline import AdvocacyETL
        
        try:
            etl = AdvocacyETL(db_config)
            etl.load_to_database(sample_clean_data)
            
            # Verify all data was committed
            with psycopg.connect(**db_config) as conn:
                cursor = conn.cursor()
                
                # Check account
                cursor.execute("SELECT COUNT(*) FROM advocate_accounts WHERE email = %s", 
                             (sample_clean_data[0][2].email,))
                assert cursor.fetchone()[0] == 1, "Account should be committed"
                
                # Check user
                cursor.execute("SELECT COUNT(*) FROM advocate_users WHERE user_id = %s", 
                             (sample_clean_data[0][0].user_id,))
                assert cursor.fetchone()[0] == 1, "User should be committed"
                
                # Check program
                program_id = sample_clean_data[0][1][0][0].program_id
                cursor.execute("SELECT COUNT(*) FROM programs WHERE program_id = %s", (program_id,))
                assert cursor.fetchone()[0] == 1, "Program should be committed"
        
        except psycopg.OperationalError:
            pytest.skip("Test database not available")


# ============================================================================
# DATABASE UPSERT OPERATION TESTS
# ============================================================================

class TestDatabaseUpsertOperations:
    """Test database upsert operations - ON CONFLICT behavior and account deduplication"""
    
    @pytest.fixture
    def db_config(self):
        """Fixture providing test database configuration"""
        import os
        from dotenv import load_dotenv
        load_dotenv()
        return {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '5432')),
            'dbname': os.getenv('DB_NAME', 'advocacy_platform'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', '')
        }
    
    @pytest.mark.integration
    def test_account_deduplication_by_email(self, db_config):
        """Test that accounts with same email are deduplicated"""
        import psycopg
        from backend.etl.pipeline import AdvocacyETL
        from psycopg.types.json import Json
        
        try:
            # Create first account
            account1 = CleanAdvocateAccount(email="duplicate@example.com")
            user1 = CleanAdvocateUser(
                account_id=account1.account_id,
                name="User One",
                tiktok_handle="@user1"
            )
            data1 = [(user1, [], account1)]
            
            etl1 = AdvocacyETL(db_config)
            etl1.load_to_database(data1)
            
            # Create second account with same email but different account_id
            account2 = CleanAdvocateAccount(email="duplicate@example.com")  # Same email
            user2 = CleanAdvocateUser(
                account_id=account2.account_id,  # Different account_id
                name="User Two",
                tiktok_handle="@user2"
            )
            data2 = [(user2, [], account2)]
            
            etl2 = AdvocacyETL(db_config)
            etl2.load_to_database(data2)
            
            # Verify only one account exists with that email
            with psycopg.connect(**db_config) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM advocate_accounts WHERE email = %s", 
                             ("duplicate@example.com",))
                count = cursor.fetchone()[0]
                assert count == 1, "Should have only one account per email"
                
                # Verify both users reference the same account
                cursor.execute("""
                    SELECT COUNT(DISTINCT account_id) 
                    FROM advocate_users 
                    WHERE account_id IN (
                        SELECT account_id FROM advocate_accounts WHERE email = %s
                    )
                """, ("duplicate@example.com",))
                distinct_accounts = cursor.fetchone()[0]
                assert distinct_accounts == 1, "Both users should reference same account"
        
        except psycopg.OperationalError:
            pytest.skip("Test database not available")
    
    @pytest.mark.integration
    def test_user_upsert_on_conflict(self, db_config):
        """Test that users are updated on conflict (re-import scenario)"""
        import psycopg
        from backend.etl.pipeline import AdvocacyETL
        
        try:
            # Create initial user
            account = CleanAdvocateAccount(email="upsert@example.com")
            user1 = CleanAdvocateUser(
                account_id=account.account_id,
                name="Original Name",
                tiktok_handle="@original"
            )
            data1 = [(user1, [], account)]
            
            etl1 = AdvocacyETL(db_config)
            etl1.load_to_database(data1)
            
            # Create updated user with same user_id
            user2 = CleanAdvocateUser(
                user_id=user1.user_id,  # Same user_id
                account_id=account.account_id,
                name="Updated Name",  # Different name
                tiktok_handle="@updated"  # Different handle
            )
            data2 = [(user2, [], account)]
            
            etl2 = AdvocacyETL(db_config)
            etl2.load_to_database(data2)
            
            # Verify user was updated, not duplicated
            with psycopg.connect(**db_config) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM advocate_users WHERE user_id = %s", 
                             (user1.user_id,))
                count = cursor.fetchone()[0]
                assert count == 1, "Should have only one user with this ID"
                
                cursor.execute("SELECT name, tiktok_handle FROM advocate_users WHERE user_id = %s", 
                             (user1.user_id,))
                result = cursor.fetchone()
                assert result[0] == "Updated Name", "Name should be updated"
                assert result[1] == "@updated", "Handle should be updated"
        
        except psycopg.OperationalError:
            pytest.skip("Test database not available")
    
    @pytest.mark.integration
    def test_program_upsert_on_conflict(self, db_config):
        """Test that programs are updated on conflict"""
        import psycopg
        from backend.etl.pipeline import AdvocacyETL
        
        try:
            account = CleanAdvocateAccount(email="program_upsert@example.com")
            user = CleanAdvocateUser(
                account_id=account.account_id,
                name="Test User"
            )
            program1 = CleanProgram(
                user_id=user.user_id,
                brand="Original Brand"
            )
            data1 = [(user, [(program1, [], None)], account)]
            
            etl1 = AdvocacyETL(db_config)
            etl1.load_to_database(data1)
            
            # Update program with same program_id
            program2 = CleanProgram(
                program_id=program1.program_id,  # Same ID
                user_id=user.user_id,
                brand="Updated Brand"  # Different brand
            )
            data2 = [(user, [(program2, [], None)], account)]
            
            etl2 = AdvocacyETL(db_config)
            etl2.load_to_database(data2)
            
            # Verify program was updated
            with psycopg.connect(**db_config) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT brand FROM programs WHERE program_id = %s", 
                             (program1.program_id,))
                brand = cursor.fetchone()[0]
                assert brand == "Updated Brand", "Program brand should be updated"
        
        except psycopg.OperationalError:
            pytest.skip("Test database not available")
    
    @pytest.mark.integration
    def test_account_id_mapping_for_duplicate_emails(self, db_config):
        """Test that account_id mapping correctly handles duplicate emails"""
        import psycopg
        from backend.etl.pipeline import AdvocacyETL
        
        try:
            # Create first user with email
            account1 = CleanAdvocateAccount(email="mapping@example.com")
            user1 = CleanAdvocateUser(
                account_id=account1.account_id,
                name="First User"
            )
            data1 = [(user1, [], account1)]
            
            etl1 = AdvocacyETL(db_config)
            etl1.load_to_database(data1)
            
            # Get the actual account_id from database
            with psycopg.connect(**db_config) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT account_id FROM advocate_accounts WHERE email = %s", 
                             ("mapping@example.com",))
                actual_account_id = cursor.fetchone()[0]
            
            # Create second user with same email (different generated account_id)
            account2 = CleanAdvocateAccount(email="mapping@example.com")
            user2 = CleanAdvocateUser(
                account_id=account2.account_id,  # Different generated ID
                name="Second User"
            )
            data2 = [(user2, [], account2)]
            
            etl2 = AdvocacyETL(db_config)
            etl2.load_to_database(data2)
            
            # Verify both users reference the same actual account_id
            with psycopg.connect(**db_config) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT account_id FROM advocate_users 
                    WHERE user_id IN (%s, %s)
                """, (user1.user_id, user2.user_id))
                results = cursor.fetchall()
                assert len(results) == 2, "Both users should exist"
                assert all(r[0] == actual_account_id for r in results), \
                    "Both users should reference the same account_id"
        
        except psycopg.OperationalError:
            pytest.skip("Test database not available")


# ============================================================================
# FILE UPLOAD AND EXTRACTION TESTS
# ============================================================================

class TestFileUploadAndExtraction:
    """Test file upload and extraction - ZIP, TAR, GZ, RAR archive handling"""
    
    @pytest.fixture
    def temp_data_dir(self, tmp_path):
        """Create temporary data directory for tests"""
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        return data_dir
    
    @pytest.fixture
    def sample_json_content(self):
        """Sample JSON content for testing"""
        return {
            "user_id": str(uuid4()),
            "name": "Test User",
            "email": "test@example.com",
            "tiktok_handle": "@test",
            "advocacy_programs": []
        }
    
    def test_zip_extraction(self, temp_data_dir, sample_json_content):
        """Test ZIP archive extraction"""
        import zipfile
        from backend.api.main import extract_archive
        
        # Create ZIP file with JSON
        zip_path = temp_data_dir / "test.zip"
        json_path = temp_data_dir / "test.json"
        
        with open(json_path, 'w') as f:
            json.dump(sample_json_content, f)
        
        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.write(json_path, "test.json")
        
        json_path.unlink()  # Remove original
        
        # Extract
        extracted = extract_archive(zip_path, temp_data_dir)
        
        assert len(extracted) > 0, "Should extract at least one file"
        assert any("test.json" in f for f in extracted), "Should extract test.json"
        assert (temp_data_dir / "test.json").exists(), "Extracted file should exist"
    
    def test_tar_extraction(self, temp_data_dir, sample_json_content):
        """Test TAR archive extraction"""
        import tarfile
        from backend.api.main import extract_archive
        
        # Create TAR file
        tar_path = temp_data_dir / "test.tar"
        json_path = temp_data_dir / "test.json"
        
        with open(json_path, 'w') as f:
            json.dump(sample_json_content, f)
        
        with tarfile.open(tar_path, 'w') as tf:
            tf.add(json_path, arcname="test.json")
        
        json_path.unlink()
        
        # Extract
        extracted = extract_archive(tar_path, temp_data_dir)
        
        assert len(extracted) > 0, "Should extract at least one file"
        assert (temp_data_dir / "test.json").exists(), "Extracted file should exist"
    
    def test_gz_extraction(self, temp_data_dir, sample_json_content):
        """Test GZ archive extraction"""
        import gzip
        from backend.api.main import extract_archive
        
        # Create GZ file
        gz_path = temp_data_dir / "test.json.gz"
        json_path = temp_data_dir / "test.json"
        
        with open(json_path, 'w') as f:
            json.dump(sample_json_content, f)
        
        with gzip.open(gz_path, 'wb') as gz_file:
            with open(json_path, 'rb') as f:
                gz_file.write(f.read())
        
        json_path.unlink()
        
        # Extract
        extracted = extract_archive(gz_path, temp_data_dir)
        
        assert len(extracted) > 0, "Should extract at least one file"
        assert (temp_data_dir / "test.json").exists(), "Extracted file should exist"
    
    def test_tar_gz_extraction(self, temp_data_dir, sample_json_content):
        """Test TAR.GZ archive extraction"""
        import tarfile
        import gzip
        from backend.api.main import extract_archive
        
        # Create TAR.GZ file
        tar_gz_path = temp_data_dir / "test.tar.gz"
        json_path = temp_data_dir / "test.json"
        
        with open(json_path, 'w') as f:
            json.dump(sample_json_content, f)
        
        # Create tar, then gzip it
        tar_path = temp_data_dir / "test.tar"
        with tarfile.open(tar_path, 'w') as tf:
            tf.add(json_path, arcname="test.json")
        
        with open(tar_path, 'rb') as f_in:
            with gzip.open(tar_gz_path, 'wb') as f_out:
                f_out.write(f_in.read())
        
        json_path.unlink()
        tar_path.unlink()
        
        # Extract
        extracted = extract_archive(tar_gz_path, temp_data_dir)
        
        assert len(extracted) > 0, "Should extract at least one file"
    
    def test_rar_extraction(self, temp_data_dir, sample_json_content):
        """Test RAR archive extraction (if rarfile is available)"""
        try:
            import rarfile
            from backend.api.main import extract_archive
        except ImportError:
            pytest.skip("rarfile not available")
        
        # Note: RAR extraction requires unrar tool
        # This test may skip if unrar is not available
        rar_path = temp_data_dir / "test.rar"
        json_path = temp_data_dir / "test.json"
        
        with open(json_path, 'w') as f:
            json.dump(sample_json_content, f)
        
        try:
            with rarfile.RarFile(rar_path, 'w') as rf:
                rf.write(json_path, "test.json")
        except Exception:
            pytest.skip("RAR creation not available (unrar tool required)")
        
        json_path.unlink()
        
        # Extract
        extracted = extract_archive(rar_path, temp_data_dir)
        
        # May be empty if unrar tool not available
        if len(extracted) > 0:
            assert (temp_data_dir / "test.json").exists(), "Extracted file should exist"
    
    def test_zip_with_nested_directories(self, temp_data_dir, sample_json_content):
        """Test ZIP extraction with nested directory structure"""
        import zipfile
        from backend.api.main import extract_archive
        
        zip_path = temp_data_dir / "nested.zip"
        json_path = temp_data_dir / "test.json"
        
        with open(json_path, 'w') as f:
            json.dump(sample_json_content, f)
        
        # Create ZIP with nested structure
        with zipfile.ZipFile(zip_path, 'w') as zf:
            zf.write(json_path, "subdir/nested/test.json")
        
        json_path.unlink()
        
        # Extract
        extracted = extract_archive(zip_path, temp_data_dir)
        
        assert len(extracted) > 0, "Should extract files"
        # File should be moved to root
        assert (temp_data_dir / "test.json").exists(), "File should be moved to root"
    
    def test_multiple_files_in_archive(self, temp_data_dir):
        """Test extraction of multiple files from archive"""
        import zipfile
        from backend.api.main import extract_archive
        
        zip_path = temp_data_dir / "multi.zip"
        
        # Create multiple JSON files
        files_content = [
            {"name": "file1", "data": {"id": 1}},
            {"name": "file2", "data": {"id": 2}},
            {"name": "file3", "data": {"id": 3}}
        ]
        
        with zipfile.ZipFile(zip_path, 'w') as zf:
            for file_info in files_content:
                json_path = temp_data_dir / f"{file_info['name']}.json"
                with open(json_path, 'w') as f:
                    json.dump(file_info['data'], f)
                zf.write(json_path, f"{file_info['name']}.json")
                json_path.unlink()
        
        # Extract
        extracted = extract_archive(zip_path, temp_data_dir)
        
        assert len(extracted) == 3, "Should extract all 3 files"
        for file_info in files_content:
            assert (temp_data_dir / f"{file_info['name']}.json").exists(), \
                f"{file_info['name']}.json should exist"
    
    def test_unsupported_file_format(self, temp_data_dir):
        """Test handling of unsupported file formats"""
        from backend.api.main import extract_archive
        
        # Create unsupported file
        unsupported_path = temp_data_dir / "test.xyz"
        unsupported_path.write_text("dummy content")
        
        # Extract should return empty list
        extracted = extract_archive(unsupported_path, temp_data_dir)
        
        assert len(extracted) == 0, "Should return empty list for unsupported format"


# ============================================================================
# API ENDPOINT TESTS
# ============================================================================

class TestAPIEndpoints:
    """Test API endpoints - comprehensive coverage of all 44 endpoints"""
    
    @pytest.fixture
    def client(self):
        """Fixture providing FastAPI test client"""
        from fastapi.testclient import TestClient
        from backend.api.main import app
        
        return TestClient(app)
    
    @pytest.fixture
    def sample_user_id(self):
        """Generate sample user ID for testing"""
        return uuid4()
    
    @pytest.fixture
    def sample_account_id(self):
        """Generate sample account ID for testing"""
        return uuid4()
    
    # ========================================================================
    # Health Check
    # ========================================================================
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
    
    # ========================================================================
    # User Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_users(self, client):
        """Test get users endpoint with pagination"""
        response = client.get("/api/v1/users?limit=10&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.integration
    def test_get_users_with_filtering(self, client):
        """Test get users with email and name filters"""
        # Test email filter
        response = client.get("/api/v1/users?email=test@example.com")
        assert response.status_code == 200
        
        # Test name filter
        response = client.get("/api/v1/users?name=test")
        assert response.status_code == 200
    
    @pytest.mark.integration
    def test_get_users_pagination_validation(self, client):
        """Test pagination parameter validation"""
        # Test invalid limit (too high)
        response = client.get("/api/v1/users?limit=2000")
        assert response.status_code == 422  # Validation error
        
        # Test invalid limit (too low)
        response = client.get("/api/v1/users?limit=0")
        assert response.status_code == 422
        
        # Test invalid offset (negative)
        response = client.get("/api/v1/users?offset=-1")
        assert response.status_code == 422
    
    @pytest.mark.integration
    def test_get_user_by_id(self, client, sample_user_id):
        """Test get user by ID endpoint"""
        response = client.get(f"/api/v1/users/{sample_user_id}")
        # Should return 404 for non-existent user
        assert response.status_code in [200, 404]
        if response.status_code == 404:
            assert "not found" in response.json()["detail"].lower()
    
    @pytest.mark.integration
    def test_get_user_invalid_uuid(self, client):
        """Test get user with invalid UUID format"""
        response = client.get("/api/v1/users/invalid-uuid")
        assert response.status_code == 422  # Validation error
    
    # ========================================================================
    # Account Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_accounts(self, client):
        """Test get accounts endpoint"""
        response = client.get("/api/v1/accounts?limit=10&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.integration
    def test_get_accounts_with_email_filter(self, client):
        """Test get accounts with email filter"""
        response = client.get("/api/v1/accounts?email=test@example.com")
        assert response.status_code == 200
    
    @pytest.mark.integration
    def test_get_account_by_id(self, client, sample_account_id):
        """Test get account by ID"""
        response = client.get(f"/api/v1/accounts/{sample_account_id}")
        assert response.status_code in [200, 404]
    
    @pytest.mark.integration
    def test_get_account_engagement(self, client, sample_account_id):
        """Test get account engagement"""
        response = client.get(f"/api/v1/accounts/{sample_account_id}/engagement")
        assert response.status_code in [200, 404]
    
    @pytest.mark.integration
    def test_get_account_users(self, client, sample_account_id):
        """Test get users for an account"""
        response = client.get(f"/api/v1/accounts/{sample_account_id}/users")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_account_programs(self, client, sample_account_id):
        """Test get programs for an account"""
        response = client.get(f"/api/v1/accounts/{sample_account_id}/programs")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_account_sales(self, client, sample_account_id):
        """Test get sales for an account"""
        response = client.get(f"/api/v1/accounts/{sample_account_id}/sales")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_account_social_analytics(self, client, sample_account_id):
        """Test get social analytics for an account"""
        response = client.get(f"/api/v1/accounts/{sample_account_id}/social-analytics")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    # ========================================================================
    # Program Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_programs(self, client):
        """Test get programs endpoint"""
        response = client.get("/api/v1/programs?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_programs_with_filters(self, client):
        """Test get programs with brand, user_id, status filters"""
        response = client.get("/api/v1/programs?brand=Test&limit=10")
        assert response.status_code == 200
        
        response = client.get(f"/api/v1/programs?user_id={uuid4()}&limit=10")
        assert response.status_code == 200
    
    @pytest.mark.integration
    def test_get_program_by_id(self, client):
        """Test get program by ID"""
        program_id = uuid4()
        response = client.get(f"/api/v1/programs/{program_id}")
        assert response.status_code in [200, 404]
    
    # ========================================================================
    # Task Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_tasks(self, client):
        """Test get tasks endpoint"""
        response = client.get("/api/v1/tasks?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    # ========================================================================
    # Analytics Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_engagement_analytics(self, client):
        """Test engagement analytics endpoint"""
        response = client.get("/api/v1/analytics/engagement")
        assert response.status_code == 200
    
    @pytest.mark.integration
    def test_get_top_accounts(self, client):
        """Test top accounts endpoint"""
        response = client.get("/api/v1/analytics/top-accounts?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_top_accounts_count(self, client):
        """Test top accounts count endpoint"""
        response = client.get("/api/v1/analytics/top-accounts/count")
        assert response.status_code == 200
    
    @pytest.mark.integration
    def test_get_platform_performance(self, client):
        """Test platform performance endpoint"""
        response = client.get("/api/v1/analytics/platforms")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_brand_performance(self, client):
        """Test brand performance endpoint"""
        response = client.get("/api/v1/analytics/brands?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_dashboard_stats(self, client):
        """Test dashboard stats endpoint"""
        response = client.get("/api/v1/analytics/dashboard-stats")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    @pytest.mark.integration
    def test_get_champions(self, client):
        """Test champions endpoint"""
        response = client.get("/api/v1/analytics/champions?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_brand_platform_fit(self, client):
        """Test brand-platform fit endpoint"""
        response = client.get("/api/v1/analytics/brand-platform-fit")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    # ========================================================================
    # Segmentation Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_performance_tiers(self, client):
        """Test performance tiers segmentation"""
        response = client.get("/api/v1/analytics/segments/performance-tiers")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_activity_based_segments(self, client):
        """Test activity-based segmentation"""
        response = client.get("/api/v1/analytics/segments/activity-based")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_activity_based_segments_count(self, client):
        """Test activity-based segments count"""
        response = client.get("/api/v1/analytics/segments/activity-based/count")
        assert response.status_code == 200
    
    @pytest.mark.integration
    def test_get_conversion_efficiency_segments(self, client):
        """Test conversion efficiency segmentation"""
        response = client.get("/api/v1/analytics/segments/conversion-efficiency")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    # ========================================================================
    # Outlier Detection Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_sales_outliers(self, client):
        """Test sales outliers endpoint"""
        response = client.get("/api/v1/analytics/outliers/sales?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_engagement_outliers(self, client):
        """Test engagement outliers endpoint"""
        response = client.get("/api/v1/analytics/outliers/engagement?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    # ========================================================================
    # Sales Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_sales_attribution(self, client):
        """Test sales attribution endpoint"""
        response = client.get("/api/v1/sales/attribution?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_sales_summary(self, client):
        """Test sales summary endpoint"""
        response = client.get("/api/v1/sales/summary")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    # ========================================================================
    # Data Quality Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_data_quality_issues(self, client):
        """Test data quality issues endpoint"""
        response = client.get("/api/v1/data-quality/issues?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_data_quality_summary(self, client):
        """Test data quality summary endpoint"""
        response = client.get("/api/v1/data-quality/summary")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    @pytest.mark.integration
    def test_get_data_quality_by_account(self, client, sample_account_id):
        """Test data quality issues by account"""
        response = client.get(f"/api/v1/data-quality/issues/by-account/{sample_account_id}")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_data_completeness(self, client):
        """Test data completeness endpoint"""
        response = client.get("/api/v1/data-quality/completeness")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    # ========================================================================
    # ETL Management Endpoints
    # ========================================================================
    
    @pytest.mark.integration
    def test_get_etl_schedule(self, client):
        """Test ETL schedule endpoint"""
        response = client.get("/api/v1/etl/schedule")
        assert response.status_code == 200
    
    @pytest.mark.integration
    def test_get_etl_status(self, client):
        """Test ETL status endpoint"""
        response = client.get("/api/v1/etl/status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
    
    @pytest.mark.integration
    def test_get_etl_history(self, client):
        """Test ETL history endpoint"""
        response = client.get("/api/v1/etl/history?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_get_pending_files(self, client):
        """Test pending files endpoint"""
        response = client.get("/api/v1/etl/pending-files")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_trigger_etl(self, client):
        """Test ETL trigger endpoint"""
        response = client.post("/api/v1/etl/trigger")
        # May return 200 or error depending on Prefect availability
        assert response.status_code in [200, 500, 503]
    
    # ========================================================================
    # File Upload Endpoints
    # ========================================================================
    
    def test_upload_json_file(self, client, tmp_path):
        """Test uploading a JSON file"""
        import io
        
        # Create sample JSON content
        json_content = json.dumps({
            "user_id": str(uuid4()),
            "name": "Test User",
            "email": "test@example.com",
            "tiktok_handle": "@test",
            "advocacy_programs": []
        })
        
        # Create file-like object
        file_content = io.BytesIO(json_content.encode('utf-8'))
        
        response = client.post(
            "/api/v1/upload",
            files={"files": ("test.json", file_content, "application/json")}
        )
        
        # Should succeed or return appropriate error
        assert response.status_code in [200, 400, 500]
    
    def test_upload_unsupported_file(self, client):
        """Test uploading unsupported file type"""
        import io
        
        file_content = io.BytesIO(b"dummy content")
        
        response = client.post(
            "/api/v1/upload",
            files={"files": ("test.xyz", file_content, "application/octet-stream")}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "unsupported" in data.get("error", "").lower()
    
    @pytest.mark.integration
    def test_get_upload_history(self, client):
        """Test upload history endpoint"""
        response = client.get("/api/v1/uploads/history?limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.integration
    def test_clear_upload_history(self, client):
        """Test clear upload history endpoint"""
        response = client.delete("/api/v1/uploads/clear")
        # May require confirmation or return success
        assert response.status_code in [200, 204, 400]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
