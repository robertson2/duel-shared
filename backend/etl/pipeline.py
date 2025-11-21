"""
ETL Pipeline for Advocacy Platform Data
Reads JSON files, cleans data, and loads into PostgreSQL
"""

import json
import logging
import shutil
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from uuid import UUID, uuid4
from datetime import datetime
from decimal import Decimal

# Import psycopg3 (modern PostgreSQL adapter)
import psycopg
from psycopg.types.json import Json

from backend.models import (
    RawAdvocateUser,
    CleanAdvocateAccount, CleanAdvocateUser, CleanProgram, CleanTask,
    CleanSocialAnalytics, CleanSalesAttribution,
    DataQualityIssue
)

# Setup logging
logger = logging.getLogger(__name__)


class AdvocacyETL:
    """
    ETL pipeline for advocacy platform data
    
    This class orchestrates the Extract-Transform-Load process for advocacy
    data. It handles the entire workflow from reading JSON files to inserting
    validated data into PostgreSQL.
    
    Pipeline Stages:
        1. Extract: Read and validate JSON files from data directory
        2. Transform: Clean, validate, and normalize data using Pydantic models
        3. Load: Insert data into PostgreSQL with transaction safety
        4. Quality: Log data quality issues for monitoring
        
    Key Features:
        - Graceful handling of malformed data
        - Comprehensive data quality tracking
        - Transaction-based insertion (all-or-nothing)
        - Automatic JSON file fixing for common errors
        - Duplicate detection (email-based account deduplication)
        - Detailed statistics and reporting
        
    Architecture:
        - Uses Pydantic models for validation (models/raw.py, models/clean.py)
        - Maintains in-memory cache of accounts to avoid duplicates
        - Tracks all quality issues for post-processing analysis
        - Generates unique import_id for each ETL run
    """
    
    def __init__(self, db_config: Dict[str, str]):
        """
        Initialize ETL pipeline with database configuration
        
        Args:
            db_config: Database connection parameters dictionary with keys:
                - host: PostgreSQL server hostname
                - port: PostgreSQL server port
                - dbname: Database name
                - user: Database username
                - password: Database password
                
        Initializes:
            - Database connection (lazy - connected when needed)
            - Unique import_id for this ETL run
            - Empty data quality issues list
            - In-memory account cache (for duplicate detection)
            - Statistics counters for reporting
        """
        self.db_config = db_config
        self.conn = None  # Database connection (initialized in connect_db())
        self.import_id = uuid4()  # Unique ID for this ETL run
        self.data_quality_issues: List[DataQualityIssue] = []
        
        # In-memory cache of advocate accounts to avoid duplicates
        # Key: email (lowercase), Value: CleanAdvocateAccount
        # This enables email-based deduplication without DB queries
        self.advocate_accounts: Dict[str, CleanAdvocateAccount] = {}
        
        # Statistics tracked during ETL for reporting
        self.stats = {
            'files_processed': 0,      # Successfully processed JSON files
            'files_failed': 0,          # Failed JSON files (couldn't parse)
            'accounts_created': 0,      # New advocate accounts created
            'users_created': 0,         # New advocate users created
            'programs_created': 0,      # New programs created
            'tasks_created': 0,         # New tasks created
            'analytics_created': 0,     # New analytics records created
            'sales_created': 0,         # New sales attribution records
            'quality_issues': 0         # Total data quality issues logged
        }
    
    def connect_db(self):
        """Establish database connection"""
        try:
            # psycopg3 uses 'dbname' instead of 'database'
            config = self.db_config.copy()
            if 'database' in config:
                config['dbname'] = config.pop('database')
            self.conn = psycopg.connect(**config)
            logger.info("✅ Database connection established")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            logger.error("   Check:")
            logger.error("   1. PostgreSQL is running")
            logger.error("   2. Database 'advocacy_platform' exists")
            logger.error("   3. Credentials in .env file are correct")
            logger.error("   4. Run: python test_db_connection.py for diagnostics")
            raise
    
    def close_db(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
    
    def log_quality_issue(
        self,
        severity: str,
        issue_type: str,
        description: str,
        record_id: Optional[str] = None,
        field: Optional[str] = None,
        value: Optional[Dict] = None
    ):
        """Log a data quality issue"""
        issue = DataQualityIssue(
            import_id=self.import_id,
            severity=severity,
            issue_type=issue_type,
            issue_description=description,
            affected_record_id=record_id,
            affected_field=field,
            problematic_value=value
        )
        self.data_quality_issues.append(issue)
        self.stats['quality_issues'] += 1
    
    def get_or_create_advocate_account(self, email: Optional[str]) -> Optional[CleanAdvocateAccount]:
        """
        Get or create an advocate account for the given email
        
        This implements email-based account deduplication. Multiple advocate users
        with the same email are grouped under a single account. This is important
        because advocates often have multiple social media profiles (Instagram,
        TikTok) but should be tracked as one person.
        
        Deduplication Strategy:
            - Normalize email to lowercase for case-insensitive matching
            - Check in-memory cache first (fast lookup, no DB queries)
            - Create new account only if email not seen before
            - Return None for invalid/missing emails (handled by caller)
        
        Args:
            email: Email address (can be None if invalid)
            
        Returns:
            CleanAdvocateAccount if email is valid, None otherwise
            
        Example:
            >>> account1 = etl.get_or_create_advocate_account("John@Example.com")
            >>> account2 = etl.get_or_create_advocate_account("john@example.com")
            >>> account1.account_id == account2.account_id  # True (deduplicated)
        """
        # If no email, return None
        # Caller will handle by creating placeholder account
        if not email:
            return None
        
        # Normalize email to lowercase for case-insensitive matching
        # This ensures "John@Example.com" and "john@example.com" are treated as same
        email_lower = email.lower()
        
        # Check if we've already created an account for this email
        # This avoids duplicate accounts for the same person
        if email_lower in self.advocate_accounts:
            return self.advocate_accounts[email_lower]
        
        # Create new account and add to cache
        # account_id is auto-generated (UUID)
        account = CleanAdvocateAccount(email=email_lower)
        self.advocate_accounts[email_lower] = account
        self.stats['accounts_created'] += 1
        
        return account
    
    def validate_and_fix_json_file(self, json_file: Path) -> bool:
        """
        Validate and attempt to fix broken JSON files
        
        Args:
            json_file: Path to JSON file
            
        Returns:
            True if file is valid or was successfully fixed, False otherwise
        """
        try:
            # First, try to parse as-is
            with open(json_file, 'r', encoding='utf-8') as f:
                json.load(f)
            return True  # File is already valid
        except json.JSONDecodeError:
            # File is broken, attempt to fix
            logger.warning(f"⚠️  JSON file has errors, attempting to fix: {json_file.name}")
            
            try:
                # Read the file content
                with open(json_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                fixed_content = None
                
                # Fix 1: Missing closing brace at the end
                if content.strip().endswith(']'):
                    fixed_content = content.rstrip() + '\n}'
                    logger.info(f"   Applied Fix: Added missing closing brace")
                
                # Fix 2: Extra trailing content after valid JSON
                elif not content.strip().endswith('}'):
                    # Try to find the last ] and add }
                    if ']' in content:
                        last_bracket = content.rfind(']')
                        fixed_content = content[:last_bracket+1].rstrip() + '\n}'
                        logger.info(f"   Applied Fix: Truncated after last ] and added closing brace")
                
                if fixed_content:
                    # Validate the fix
                    try:
                        json.loads(fixed_content)
                        
                        # Write the fixed content back
                        with open(json_file, 'w', encoding='utf-8') as f:
                            f.write(fixed_content)
                        
                        logger.info(f"   ✅ Successfully fixed: {json_file.name}")
                        return True
                    except json.JSONDecodeError:
                        logger.error(f"   ❌ Fix did not produce valid JSON: {json_file.name}")
                        return False
                else:
                    logger.error(f"   ❌ No applicable fix found: {json_file.name}")
                    return False
                    
            except Exception as e:
                logger.error(f"   ❌ Error attempting to fix {json_file.name}: {e}")
                return False
        except Exception as e:
            logger.error(f"❌ Unexpected error validating {json_file.name}: {e}")
            return False
    
    def extract_json_files(self, data_dir: Path) -> List[Dict]:
        """
        Extract JSON files from directory
        
        Args:
            data_dir: Path to directory containing JSON files
            
        Returns:
            List of parsed JSON objects
        """
        logger.info(f"📁 Extracting JSON files from {data_dir}")
        
        json_files = list(data_dir.glob("*.json"))
        logger.info(f"Found {len(json_files)} JSON files")
        
        # Step 1: Validate and fix JSON files
        logger.info("🔍 Validating JSON files...")
        valid_files = []
        for json_file in json_files:
            if self.validate_and_fix_json_file(json_file):
                valid_files.append(json_file)
            else:
                logger.error(f"❌ Skipping invalid JSON file: {json_file.name}")
                self.stats['files_failed'] += 1
                self.log_quality_issue(
                    severity='critical',
                    issue_type='invalid_json_file',
                    description=f"JSON file could not be validated or fixed and was skipped",
                    record_id=str(json_file)
                )
        
        logger.info(f"✅ Validated {len(valid_files)}/{len(json_files)} JSON files")
        
        # Step 2: Parse valid JSON files
        raw_data = []
        for json_file in valid_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    raw_data.append(data)
                    self.stats['files_processed'] += 1
            except Exception as e:
                logger.error(f"❌ Failed to parse {json_file.name}: {e}")
                logger.error(f"   Skipping this file and continuing...")
                self.stats['files_failed'] += 1
                self.log_quality_issue(
                    severity='critical',
                    issue_type='file_parse_error',
                    description=f"Failed to parse JSON file after validation: {str(e)}",
                    record_id=str(json_file)
                )
                # Continue processing other files
                continue
        
        logger.info(f"✅ Successfully extracted {len(raw_data)} files")
        return raw_data
    
    def transform_user_data(self, raw_data: List[Dict]) -> List[Tuple[CleanAdvocateUser, List, CleanAdvocateAccount]]:
        """
        Transform raw JSON data into clean models
        
        Args:
            raw_data: List of raw JSON objects
            
        Returns:
            List of (CleanAdvocateUser, [(CleanProgram, CleanTask, CleanSocialAnalytics, Optional[CleanSalesAttribution])...], CleanAdvocateAccount)
        """
        logger.info("🔄 Transforming data...")
        
        clean_data = []
        
        for raw_json in raw_data:
            try:
                # Parse raw user
                raw_user = RawAdvocateUser(**raw_json)
                
                # Get or create advocate account based on email
                advocate_account = self.get_or_create_advocate_account(raw_user.email)
                
                # If no valid email, create a placeholder account with a generated email
                if advocate_account is None:
                    # Generate a placeholder email for users without valid email
                    placeholder_email = f"noemail_{uuid4()}@placeholder.local"
                    advocate_account = CleanAdvocateAccount(email=placeholder_email)
                    self.advocate_accounts[placeholder_email] = advocate_account
                    self.stats['accounts_created'] += 1
                    
                    self.log_quality_issue(
                        severity='high',
                        issue_type='missing_email',
                        description='User has no valid email, created placeholder advocate account',
                        record_id=str(raw_user.user_id) if raw_user.user_id else 'unknown',
                        field='email'
                    )
                
                # Create clean advocate user (without email, linked to account)
                clean_user = CleanAdvocateUser(
                    user_id=UUID(raw_user.user_id) if raw_user.user_id else uuid4(),
                    account_id=advocate_account.account_id,
                    name=raw_user.name,
                    instagram_handle=raw_user.instagram_handle,
                    tiktok_handle=raw_user.tiktok_handle,
                    joined_at=datetime.fromisoformat(raw_user.joined_at) if raw_user.joined_at else None
                )
                
                # Track quality issues for user
                if raw_user.user_id is None:
                    self.log_quality_issue(
                        severity='medium',
                        issue_type='missing_user_id',
                        description='User ID was null or invalid, generated new UUID',
                        record_id=str(clean_user.user_id),
                        field='user_id'
                    )
                
                if raw_user.name is None:
                    self.log_quality_issue(
                        severity='low',
                        issue_type='missing_name',
                        description='User name was null or placeholder',
                        record_id=str(clean_user.user_id),
                        field='name'
                    )
                
                if raw_user.email is None:
                    self.log_quality_issue(
                        severity='medium',
                        issue_type='invalid_email',
                        description='Email was null or invalid format',
                        record_id=str(clean_user.user_id),
                        field='email'
                    )
                
                # Process programs
                program_data = []
                for raw_program in raw_user.advocacy_programs:
                    # Use fallback brand if null or numeric
                    program_brand = raw_program.brand
                    if program_brand is None:
                        program_brand = 'Unknown'  # Fallback for null/numeric brands
                        self.log_quality_issue(
                            severity='medium',
                            issue_type='missing_brand',
                            description='Program brand was null, empty, or numeric value - using fallback: Unknown',
                            record_id=str(clean_user.user_id),
                            field='brand'
                        )
                    
                    clean_program = CleanProgram(
                        program_id=UUID(raw_program.program_id) if raw_program.program_id else uuid4(),
                        user_id=clean_user.user_id,
                        brand=program_brand  # Use fallback if needed
                    )
                    
                    # Process sales attribution (once per program, outside task loop)
                    clean_sales = None
                    if raw_program.sales_attributed is not None:
                        try:
                            clean_sales = CleanSalesAttribution(
                                program_id=clean_program.program_id,
                                amount=Decimal(str(raw_program.sales_attributed))
                            )
                        except Exception as e:
                            self.log_quality_issue(
                                severity='medium',
                                issue_type='invalid_sales_amount',
                                description=f'Failed to parse sales amount: {str(e)}',
                                record_id=str(clean_program.program_id),
                                field='sales_attributed',
                                value={'raw_value': raw_program.sales_attributed}
                            )
                    
                    # Process tasks for this program
                    task_data = []
                    for raw_task in raw_program.tasks:
                        # Use fallback platform if invalid
                        task_platform = raw_task.platform
                        if task_platform is None:
                            task_platform = 'Unknown'  # Fallback to Unknown for invalid platforms
                            self.log_quality_issue(
                                severity='high',
                                issue_type='invalid_platform',
                                description='Task platform was null or invalid, using fallback: Unknown',
                                record_id=str(clean_program.program_id),
                                field='platform',
                                value={'original_value': 'null or invalid'}
                            )
                        
                        clean_task = CleanTask(
                            task_id=UUID(raw_task.task_id) if raw_task.task_id else uuid4(),
                            program_id=clean_program.program_id,
                            platform=task_platform,
                            post_url=raw_task.post_url,
                            posted_at=datetime.fromisoformat(raw_task.posted_at) if raw_task.posted_at else None
                        )
                        
                        # Process analytics
                        clean_analytics = None
                        if raw_task.analytics:
                            clean_analytics = CleanSocialAnalytics(
                                task_id=clean_task.task_id,
                                likes=raw_task.analytics.likes,
                                comments=raw_task.analytics.comments,
                                shares=raw_task.analytics.shares,
                                reach=raw_task.analytics.reach,
                                impressions=raw_task.analytics.impressions,
                                engagement_rate=raw_task.analytics.engagement_rate
                            )
                        
                        task_data.append((clean_task, clean_analytics))
                    
                    # Add program with its tasks and sales (even if tasks list is empty)
                    program_data.append((clean_program, task_data, clean_sales))
                
                # Append user, program data, and advocate account
                clean_data.append((clean_user, program_data, advocate_account))
                
            except Exception as e:
                logger.error(f"❌ Failed to transform user data: {e}")
                logger.error(f"   Skipping this record and continuing...")
                self.log_quality_issue(
                    severity='critical',
                    issue_type='transformation_error',
                    description=f'Failed to transform user record: {str(e)}',
                    value={'raw_data': raw_json}
                )
                # Continue processing other records
                continue
        
        logger.info(f"✅ Transformed {len(clean_data)} user records")
        return clean_data
    
    def load_to_database(self, clean_data: List[Tuple[CleanAdvocateUser, List, CleanAdvocateAccount]]):
        """
        Load clean data into PostgreSQL using transaction-safe batch insertion
        
        This method implements a multi-stage insertion process with proper
        foreign key dependency ordering. All insertions happen within a
        single transaction for atomicity (all-or-nothing).
        
        Insertion Order (critical for foreign keys):
            1. raw_imports record (this ETL run metadata)
            2. advocate_accounts (parent table)
            3. advocate_users (depends on accounts)
            4. programs (depends on users)
            5. sales_attribution (depends on programs)
            6. tasks (depends on programs)
            7. social_analytics (depends on tasks)
            8. data_quality_issues (references import_id)
            
        Upsert Strategy:
            - ON CONFLICT for all tables to handle re-imports
            - Existing records are updated with new data
            - account_id mapping handles account deduplication
            
        Transaction Safety:
            - Single BEGIN/COMMIT for entire batch
            - Automatic ROLLBACK on any error
            - No partial data committed on failure
        
        Args:
            clean_data: List of tuples containing:
                (CleanAdvocateUser, program_data, CleanAdvocateAccount)
                where program_data is a list of:
                (CleanProgram, task_data, CleanSalesAttribution)
        """
        logger.info("💾 Loading data to database...")
        
        cursor = self.conn.cursor()
        
        try:
            # ================================================================
            # START TRANSACTION
            # ================================================================
            # Everything within this block is atomic - either all succeeds
            # or all is rolled back. This prevents partial data corruption.
            cursor.execute("BEGIN;")
            
            # ================================================================
            # STEP 0: Insert Import Record
            # ================================================================
            # This tracks metadata about this ETL run and is required first
            # because data_quality_issues references import_id
            cursor.execute("""
                INSERT INTO raw_imports (
                    import_id, file_name, original_data, 
                    processing_status, processing_started_at, processed_by
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (import_id) DO NOTHING
            """, (
                self.import_id,
                'etl_pipeline_batch',
                Json({'source': 'etl_pipeline', 'timestamp': datetime.now().isoformat()}),
                'processing',  # Will be updated to 'completed' at end
                datetime.now(),
                'etl_pipeline'
            ))
            
            # ================================================================
            # STEP 1: Insert Advocate Accounts (Parent Table)
            # ================================================================
            # Accounts must be inserted first because users have a foreign key
            # to accounts. We also need to map emails to actual database
            # account_ids for proper foreign key relationships.
            #
            # Important: Multiple users may share the same email, so we:
            # 1. Process each unique email only once
            # 2. Map email → actual database account_id
            # 3. Use the mapped account_id when inserting users
            
            email_to_account_id = {}  # Maps email → actual DB account_id
            processed_emails = set()   # Track which emails we've processed
            
            for clean_user, program_data, advocate_account in clean_data:
                # Only process each email once (avoid duplicate account insertions)
                if advocate_account.email not in processed_emails:
                    # Insert or update account
                    # ON CONFLICT handles re-imports gracefully
                    cursor.execute("""
                        INSERT INTO advocate_accounts (
                            account_id, email, metadata
                        ) VALUES (%s, %s, %s)
                        ON CONFLICT (email) DO UPDATE SET
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW()
                        RETURNING account_id
                    """, (
                        advocate_account.account_id,
                        advocate_account.email,
                        Json(advocate_account.metadata)
                    ))
                    
                    # CRITICAL: Get the actual account_id from database
                    # This may differ from our generated ID if account already exists
                    actual_account_id = cursor.fetchone()[0]
                    
                    # Store the mapping for use in user insertion
                    email_to_account_id[advocate_account.email] = actual_account_id
                    processed_emails.add(advocate_account.email)
            
            # ================================================================
            # STEP 2: Insert Advocate Users
            # ================================================================
            # Now that accounts exist in database, we can insert users that
            # reference them via account_id foreign key.
            #
            # Critical: We must use the ACTUAL account_id from the database
            # (retrieved in Step 1), not our generated account_id, because:
            # - Account might already exist with different ID
            # - Multiple users share the same account (same email)
            # - Foreign key constraint requires valid account_id
            
            for clean_user, program_data, advocate_account in clean_data:
                # Look up the actual database account_id for this user's email
                actual_account_id = email_to_account_id[advocate_account.email]
                
                # Insert or update user
                # ON CONFLICT handles re-imports and updates existing users
                cursor.execute("""
                    INSERT INTO advocate_users (
                        user_id, account_id, name, instagram_handle, 
                        tiktok_handle, joined_at, metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id) DO UPDATE SET
                        account_id = EXCLUDED.account_id,
                        name = EXCLUDED.name,
                        instagram_handle = EXCLUDED.instagram_handle,
                        tiktok_handle = EXCLUDED.tiktok_handle,
                        joined_at = EXCLUDED.joined_at,
                        updated_at = NOW()
                """, (
                    clean_user.user_id,
                    actual_account_id,  # CRITICAL: Use actual DB account_id, not generated
                    clean_user.name,
                    clean_user.instagram_handle,
                    clean_user.tiktok_handle,
                    clean_user.joined_at,
                    Json(clean_user.metadata)
                ))
                self.stats['users_created'] += 1
                
                # ============================================================
                # STEP 3: Insert Programs, Sales, Tasks, and Analytics
                # ============================================================
                # Now process the hierarchical data for this user:
                # user → programs → sales + tasks → analytics
                #
                # Nesting structure:
                #   clean_user
                #     └─ program_data (list)
                #          └─ (clean_program, task_data, clean_sales)
                #               └─ task_data (list)
                #                    └─ (clean_task, clean_analytics)
                
                for clean_program, task_data, clean_sales in program_data:
                    # --------------------------------------------------------
                    # Insert Program
                    # --------------------------------------------------------
                    cursor.execute("""
                        INSERT INTO programs (
                            program_id, user_id, brand, program_data, started_at
                        ) VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (program_id) DO UPDATE SET
                            brand = EXCLUDED.brand,
                            updated_at = NOW()
                    """, (
                        clean_program.program_id,
                        clean_program.user_id,
                        clean_program.brand,
                        Json(clean_program.program_data),
                        clean_program.started_at
                    ))
                    self.stats['programs_created'] += 1
                    
                    # --------------------------------------------------------
                    # Insert Sales Attribution (if present)
                    # --------------------------------------------------------
                    # Not all programs have sales - many are awareness-focused
                    # Sales is inserted after program because of FK dependency
                    if clean_sales:
                        cursor.execute("""
                            INSERT INTO sales_attribution (
                                attribution_id, program_id, amount, currency, 
                                attributed_at, attribution_data
                            ) VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (attribution_id) DO UPDATE SET
                                amount = EXCLUDED.amount
                        """, (
                            clean_sales.attribution_id,
                            clean_sales.program_id,
                            clean_sales.amount,
                            clean_sales.currency,
                            clean_sales.attributed_at,
                            Json(clean_sales.attribution_data)
                        ))
                        self.stats['sales_created'] += 1
                    
                    # --------------------------------------------------------
                    # Insert Tasks and Analytics
                    # --------------------------------------------------------
                    # Tasks are the atomic work units (social media posts)
                    # Analytics are time-series metrics for each task
                    for clean_task, clean_analytics in task_data:
                        # Insert task
                        cursor.execute("""
                            INSERT INTO tasks (
                                task_id, program_id, platform, post_url, 
                                posted_at, platform_data
                            ) VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (task_id) DO UPDATE SET
                                platform = EXCLUDED.platform,
                                post_url = EXCLUDED.post_url,
                                posted_at = EXCLUDED.posted_at,
                                updated_at = NOW()
                        """, (
                            clean_task.task_id,
                            clean_task.program_id,
                            clean_task.platform,
                            clean_task.post_url,
                            clean_task.posted_at,
                            Json(clean_task.platform_data)
                        ))
                        self.stats['tasks_created'] += 1
                        
                        # Insert analytics if present (not all tasks have analytics yet)
                        # New posts don't have metrics until they accumulate engagement
                        if clean_analytics:
                            cursor.execute("""
                                INSERT INTO social_analytics (
                                    analytics_id, task_id, likes, comments, 
                                    shares, reach, additional_metrics, measured_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (task_id, measured_at) DO UPDATE SET
                                    likes = EXCLUDED.likes,
                                    comments = EXCLUDED.comments,
                                    shares = EXCLUDED.shares,
                                    reach = EXCLUDED.reach,
                                    updated_at = NOW()
                            """, (
                                clean_analytics.analytics_id,
                                clean_analytics.task_id,
                                clean_analytics.likes,
                                clean_analytics.comments,
                                clean_analytics.shares,
                                clean_analytics.reach,
                                Json(clean_analytics.additional_metrics),
                                clean_analytics.measured_at
                            ))
                            self.stats['analytics_created'] += 1
            
            # ================================================================
            # STEP 4: Insert Data Quality Issues
            # ================================================================
            # Log all data quality problems encountered during ETL
            # These are stored for trend analysis and data source improvement
            for issue in self.data_quality_issues:
                cursor.execute("""
                    INSERT INTO data_quality_issues (
                        issue_id, import_id, severity, issue_type,
                        issue_description, affected_record_id, affected_field,
                        problematic_value
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    issue.issue_id,
                    issue.import_id,
                    issue.severity,
                    issue.issue_type,
                    issue.issue_description,
                    issue.affected_record_id,
                    issue.affected_field,
                    Json(issue.problematic_value) if issue.problematic_value else None
                ))
            
            # ================================================================
            # STEP 5: Update Import Record Status
            # ================================================================
            # Mark this import run as completed with metadata
            cursor.execute("""
                UPDATE raw_imports
                SET processing_status = %s, processing_completed_at = %s,
                    records_count = %s
                WHERE import_id = %s
            """, ('completed', datetime.now(), len(clean_data), self.import_id))
            
            # ================================================================
            # COMMIT TRANSACTION
            # ================================================================
            # If we reach here, all insertions succeeded
            # Commit the transaction to make changes permanent
            self.conn.commit()
            logger.info("✅ Data loaded successfully")
            
            # ================================================================
            # REFRESH MATERIALIZED VIEWS
            # ================================================================
            # Materialized views cache complex analytics queries
            # Refresh them after data load to reflect new data
            logger.info("🔄 Refreshing materialized views...")
            try:
                cursor.execute("SELECT refresh_all_materialized_views();")
                self.conn.commit()
                logger.info("✅ Materialized views refreshed")
            except Exception as e:
                # This is optional and may fail if function doesn't exist yet
                logger.warning(f"⚠️  Could not refresh materialized views: {e}")
                logger.warning("   This is OK if the function doesn't exist yet")
            
        except Exception as e:
            # ================================================================
            # ERROR HANDLING: ROLLBACK TRANSACTION
            # ================================================================
            # If ANY error occurs, rollback ALL changes
            # This maintains database consistency (all-or-nothing)
            self.conn.rollback()
            logger.error(f"❌ Failed to load data: {e}")
            raise  # Re-raise exception for caller to handle
        finally:
            # Always close cursor, even if error occurred
            cursor.close()
    
    def print_summary(self):
        """Print ETL summary statistics"""
        print("\n" + "="*80)
        print("ETL PIPELINE SUMMARY")
        print("="*80)
        print(f"Files processed:      {self.stats['files_processed']}")
        print(f"Files failed:         {self.stats['files_failed']}")
        print(f"Accounts created:     {self.stats['accounts_created']}")
        print(f"Users created:        {self.stats['users_created']}")
        print(f"Programs created:     {self.stats['programs_created']}")
        print(f"Tasks created:        {self.stats['tasks_created']}")
        print(f"Analytics created:    {self.stats['analytics_created']}")
        print(f"Sales records:        {self.stats['sales_created']}")
        print(f"Quality issues:       {self.stats['quality_issues']}")
        print("="*80)
        
        # Breakdown of quality issues by severity
        severity_counts = {}
        for issue in self.data_quality_issues:
            severity_counts[issue.severity] = severity_counts.get(issue.severity, 0) + 1
        
        if severity_counts:
            print("\nQuality Issues by Severity:")
            for severity in ['critical', 'high', 'medium', 'low']:
                if severity in severity_counts:
                    print(f"  {severity.upper():10} : {severity_counts[severity]}")
    
    def run(self, data_dir: Path):
        """
        Run the complete ETL pipeline
        
        Args:
            data_dir: Path to directory containing JSON files
        """
        try:
            logger.info("🚀 Starting ETL pipeline...")
            start_time = datetime.now()
            
            # Connect to database
            self.connect_db()
            
            # Extract
            raw_data = self.extract_json_files(data_dir)
            
            # Transform
            clean_data = self.transform_user_data(raw_data)
            
            # Load
            self.load_to_database(clean_data)
            
            # Summary
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            self.print_summary()
            print(f"\nTotal execution time: {duration:.2f} seconds")
            print(f"[SUCCESS] ETL pipeline completed successfully!\n")
            
        except Exception as e:
            logger.error(f"❌ ETL pipeline failed: {e}")
            raise
        finally:
            self.close_db()

