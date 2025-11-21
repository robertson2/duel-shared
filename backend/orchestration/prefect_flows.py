"""
Prefect Flow for Advocacy Platform ETL Pipeline
Runs daily to process new JSON files and refresh analytics
"""

from datetime import datetime
from pathlib import Path
import json
import shutil
import os
from typing import Dict, Any
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from prefect import flow, task
from prefect.tasks import task_input_hash
from dotenv import load_dotenv
import psycopg

# Load environment variables
load_dotenv()

# Import ETL pipeline
from backend.etl import AdvocacyETL
from backend.database import get_db_config
from backend.config.settings import settings

# Configuration
DATA_DIR = Path(os.getenv('DATA_DIR', 'data'))
DB_CONFIG = get_db_config()


@task(name="Extract and Validate Files", retries=2, retry_delay_seconds=60)
def extract_and_validate() -> Dict[str, Any]:
    """
    Extract JSON files and perform initial validation
    """
    # Count files
    json_files = list(DATA_DIR.glob("*.json"))
    file_count = len(json_files)
    
    print(f"📁 Found {file_count} JSON files to process")
    
    return {
        'file_count': file_count,
        'data_dir': str(DATA_DIR)
    }


@task(name="Run ETL Pipeline", retries=1, retry_delay_seconds=120)
def run_etl_pipeline(validation_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run the main ETL pipeline
    """
    data_dir = Path(validation_data['data_dir'])
    file_count = validation_data['file_count']
    
    if file_count == 0:
        print("⚠️ No files to process")
        return {
            'files_processed': 0,
            'files_failed': 0,
            'accounts_created': 0,
            'users_created': 0,
            'programs_created': 0,
            'tasks_created': 0,
            'analytics_created': 0,
            'sales_created': 0,
            'quality_issues': 0,
            'quality_issues_by_severity': {},
            'quality_issues_by_type': {},
            'processing_time_seconds': 0
        }
    
    print(f"🚀 Starting ETL pipeline for {file_count} files...")
    
    # Track execution time
    start_time = datetime.now()
    
    # Run ETL
    etl = AdvocacyETL(DB_CONFIG)
    etl.run(data_dir)
    
    # Calculate processing time
    end_time = datetime.now()
    processing_time = (end_time - start_time).total_seconds()
    
    # Aggregate quality issue breakdowns
    severity_counts = {}
    type_counts = {}
    for issue in etl.data_quality_issues:
        severity_counts[issue.severity] = severity_counts.get(issue.severity, 0) + 1
        type_counts[issue.issue_type] = type_counts.get(issue.issue_type, 0) + 1
    
    # Build comprehensive stats from ETL stats dictionary
    stats = {
        'files_processed': etl.stats.get('files_processed', 0),
        'files_failed': etl.stats.get('files_failed', 0),
        'accounts_created': etl.stats.get('accounts_created', 0),
        'users_created': etl.stats.get('users_created', 0),
        'programs_created': etl.stats.get('programs_created', 0),
        'tasks_created': etl.stats.get('tasks_created', 0),
        'analytics_created': etl.stats.get('analytics_created', 0),
        'sales_created': etl.stats.get('sales_created', 0),
        'quality_issues': etl.stats.get('quality_issues', 0),
        'quality_issues_by_severity': severity_counts,
        'quality_issues_by_type': type_counts,
        'processing_time_seconds': round(processing_time, 2)
    }
    
    print(f"✅ ETL completed: {stats}")
    
    return stats


@task(name="Refresh Materialized Views", retries=2)
def refresh_materialized_views() -> None:
    """
    Refresh all materialized views
    """
    print("🔄 Refreshing materialized views...")
    
    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT refresh_all_materialized_views();")
                conn.commit()
        
        print("✅ Materialized views refreshed")
    except Exception as e:
        print(f"❌ Failed to refresh views: {e}")
        raise


@task(name="Check Data Quality")
def check_data_quality(stats: Dict[str, Any]) -> bool:
    """
    Check data quality thresholds and alert if needed
    """
    print("🔍 Checking data quality...")
    
    # Define quality thresholds
    max_failed_files_pct = 5.0  # Max 5% failed files
    max_quality_issues_pct = 10.0  # Max 10% records with issues
    max_critical_issues = 0  # No critical issues allowed
    
    total_files = stats['files_processed'] + stats['files_failed']
    failed_pct = (stats['files_failed'] / total_files * 100) if total_files > 0 else 0
    
    total_records = stats['users_created']
    issues_pct = (stats['quality_issues'] / total_records * 100) if total_records > 0 else 0
    
    # Get severity breakdown
    severity_counts = stats.get('quality_issues_by_severity', {})
    critical_count = severity_counts.get('critical', 0)
    high_count = severity_counts.get('high', 0)
    
    alerts = []
    
    if failed_pct > max_failed_files_pct:
        alerts.append(f"⚠️ HIGH FAILURE RATE: {failed_pct:.1f}% of files failed to process")
    
    if critical_count > max_critical_issues:
        alerts.append(f"🚨 CRITICAL ISSUES FOUND: {critical_count} critical data quality issues detected")
    
    if issues_pct > max_quality_issues_pct:
        alerts.append(f"⚠️ HIGH QUALITY ISSUES: {issues_pct:.1f}% of records have quality issues")
    
    if high_count > (total_records * 0.05):  # More than 5% high severity issues
        alerts.append(f"⚠️ HIGH SEVERITY ISSUES: {high_count} high-severity issues detected")
    
    if alerts:
        print("\n" + "="*80)
        print("🚨 DATA QUALITY ALERTS")
        print("="*80)
        for alert in alerts:
            print(alert)
        
        # Print breakdown
        if severity_counts:
            print("\nIssue Breakdown:")
            for severity in ['critical', 'high', 'medium', 'low']:
                count = severity_counts.get(severity, 0)
                if count > 0:
                    print(f"  {severity.upper():10} : {count}")
        
        print("="*80 + "\n")
        return False
    else:
        print("✅ All data quality checks passed")
        if stats['quality_issues'] > 0:
            print(f"   ({stats['quality_issues']} low/medium issues logged for review)")
        return True


@task(name="Validate Analytics Data")
def validate_analytics() -> Dict[str, Any]:
    """
    Run analytics queries for validation
    """
    print("📊 Validating analytics data...")
    
    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cursor:
                # Verify data loaded correctly
                cursor.execute("""
                    SELECT 
                        'users' as table_name,
                        COUNT(*) as record_count,
                        COUNT(CASE WHEN name IS NULL THEN 1 END) as null_names,
                        COUNT(CASE WHEN instagram_handle IS NULL AND tiktok_handle IS NULL THEN 1 END) as null_handles
                    FROM advocate_users
                    WHERE created_at >= CURRENT_DATE
                    
                    UNION ALL
                    
                    SELECT 
                        'programs' as table_name,
                        COUNT(*) as record_count,
                        COUNT(CASE WHEN brand IS NULL THEN 1 END) as null_brands,
                        0
                    FROM programs
                    WHERE created_at >= CURRENT_DATE
                    
                    UNION ALL
                    
                    SELECT 
                        'social_analytics' as table_name,
                        COUNT(*) as record_count,
                        COUNT(CASE WHEN likes IS NULL THEN 1 END) as null_likes,
                        0
                    FROM social_analytics
                    WHERE created_at >= CURRENT_DATE
                """)
                
                results = cursor.fetchall()
                
                validation_data = {}
                for row in results:
                    validation_data[row[0]] = {
                        'record_count': row[1],
                        'null_count': row[2]
                    }
                
                print(f"✅ Analytics validation complete: {validation_data}")
                return validation_data
    except Exception as e:
        print(f"❌ Analytics validation failed: {e}")
        raise


@task(name="Archive Processed Files")
def archive_processed_files(validation_data: Dict[str, Any]) -> int:
    """
    Move processed files to archive directory
    """
    print("📦 Archiving processed files...")
    
    data_dir = Path(validation_data['data_dir'])
    archive_dir = data_dir / 'archive' / datetime.now().strftime('%Y-%m-%d')
    archive_dir.mkdir(parents=True, exist_ok=True)
    
    # Move processed files
    json_files = list(data_dir.glob("*.json"))
    for json_file in json_files:
        try:
            shutil.move(str(json_file), str(archive_dir / json_file.name))
        except Exception as e:
            print(f"⚠️ Failed to archive {json_file.name}: {e}")
    
    print(f"✅ Archived {len(json_files)} files to {archive_dir}")
    
    return len(json_files)


@task(name="Generate Daily Report")
def generate_daily_report(stats: Dict[str, Any], quality_passed: bool, validation_data: Dict[str, Any] = None) -> str:
    """
    Generate and store daily ETL report with comprehensive details
    """
    print("📝 Generating daily report...")
    
    # Calculate success rates
    total_files = stats['files_processed'] + stats['files_failed']
    success_rate = (stats['files_processed'] / total_files * 100) if total_files > 0 else 0
    
    # Calculate data quality metrics
    total_records = stats['users_created']
    quality_issue_rate = (stats['quality_issues'] / total_records * 100) if total_records > 0 else 0
    
    # Build comprehensive report
    report = {
        'report_version': '2.0',
        'execution_date': datetime.now().isoformat(),
        'timestamp': datetime.now().isoformat(),
        
        # Summary statistics
        'summary': {
            'total_files': total_files,
            'files_processed': stats['files_processed'],
            'files_failed': stats['files_failed'],
            'success_rate_percent': round(success_rate, 2),
            'processing_time_seconds': stats.get('processing_time_seconds', 0),
            'quality_check_passed': quality_passed
        },
        
        # Detailed statistics
        'data_created': {
            'accounts': stats['accounts_created'],
            'users': stats['users_created'],
            'programs': stats['programs_created'],
            'tasks': stats['tasks_created'],
            'analytics_records': stats['analytics_created'],
            'sales_attributions': stats['sales_created']
        },
        
        # Data quality metrics
        'data_quality': {
            'total_issues': stats['quality_issues'],
            'issue_rate_percent': round(quality_issue_rate, 2),
            'issues_by_severity': stats.get('quality_issues_by_severity', {}),
            'issues_by_type': stats.get('quality_issues_by_type', {}),
            'critical_issues': stats.get('quality_issues_by_severity', {}).get('critical', 0),
            'high_issues': stats.get('quality_issues_by_severity', {}).get('high', 0),
            'medium_issues': stats.get('quality_issues_by_severity', {}).get('medium', 0),
            'low_issues': stats.get('quality_issues_by_severity', {}).get('low', 0)
        },
        
        # Performance metrics
        'performance': {
            'total_execution_time_seconds': stats.get('processing_time_seconds', 0),
            'avg_time_per_file_seconds': round(stats.get('processing_time_seconds', 0) / total_files, 2) if total_files > 0 else 0,
            'records_per_second': round(total_records / stats.get('processing_time_seconds', 1), 2) if stats.get('processing_time_seconds', 0) > 0 else 0
        },
        
        # Validation data (if available)
        'validation': validation_data if validation_data else None
    }
    
    # Save report
    report_dir = DATA_DIR / 'reports'
    report_dir.mkdir(exist_ok=True)
    report_path = report_dir / f"etl_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"✅ Report generated: {report_path}")
    print(f"📊 Summary: {stats['files_processed']}/{total_files} files processed successfully")
    print(f"📊 Created: {stats['users_created']} users, {stats['programs_created']} programs, {stats['tasks_created']} tasks")
    print(f"⚠️  Quality issues: {stats['quality_issues']} ({quality_issue_rate:.1f}%)")
    
    return str(report_path)


@task(name="Send Email Notification")
def send_email_notification(stats: Dict[str, Any], quality_passed: bool, report_path: str, analytics_validation: Dict[str, Any] = None) -> bool:
    """
    Send email notification with ETL completion status and summary
    
    Returns:
        bool: True if email sent successfully, False if email is disabled or failed
    """
    # Check if email notifications are configured
    if not settings.notification_email:
        print("ℹ️  Email notifications not configured (NOTIFICATION_EMAIL not set)")
        return False
    
    if not settings.smtp_username or not settings.smtp_password:
        print("ℹ️  Email notifications not configured (SMTP credentials not set)")
        return False
    
    try:
        # Prepare email content
        total_files = stats.get('files_processed', 0) + stats.get('files_failed', 0)
        quality_issue_rate = (stats['quality_issues'] / (stats['users_created'] + stats['programs_created'] + stats['tasks_created']) * 100) if (stats['users_created'] + stats['programs_created'] + stats['tasks_created']) > 0 else 0
        
        # Determine overall status
        overall_status = "✅ SUCCESS" if quality_passed and stats.get('files_failed', 0) == 0 else "⚠️ COMPLETED WITH ISSUES"
        
        # Create email subject
        subject = f"ETL Pipeline {overall_status} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        # Create email body
        body = f"""
ETL Pipeline Execution Report
{"="*60}

STATUS: {overall_status}
Execution Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Processing Duration: {stats.get('processing_time_seconds', 0):.2f} seconds

FILE PROCESSING SUMMARY:
{"="*60}
Files Processed: {stats.get('files_processed', 0)}/{total_files}
Files Failed: {stats.get('files_failed', 0)}

DATA CREATED:
{"="*60}
Advocate Accounts: {stats.get('accounts_created', 0)}
Advocate Users: {stats.get('users_created', 0)}
Programs: {stats.get('programs_created', 0)}
Tasks: {stats.get('tasks_created', 0)}
Social Analytics: {stats.get('analytics_created', 0)}
Sales Attribution: {stats.get('sales_created', 0)}

DATA QUALITY:
{"="*60}
Total Quality Issues: {stats.get('quality_issues', 0)}
Quality Issue Rate: {quality_issue_rate:.1f}%
Quality Check: {"✅ PASSED" if quality_passed else "❌ FAILED"}
"""
        
        # Add quality issues breakdown if available
        if stats.get('quality_issues_by_severity'):
            body += "\nIssues by Severity:\n"
            for severity, count in stats['quality_issues_by_severity'].items():
                body += f"  {severity.upper()}: {count}\n"
        
        if stats.get('quality_issues_by_type'):
            body += "\nIssues by Type:\n"
            for issue_type, count in stats['quality_issues_by_type'].items():
                body += f"  {issue_type}: {count}\n"
        
        # Add analytics validation if available
        if analytics_validation:
            body += f"\nANALYTICS VALIDATION:\n{'='*60}\n"
            body += f"Analytics Check: {'✅ PASSED' if analytics_validation.get('success', False) else '❌ FAILED'}\n"
        
        body += f"\n{'='*60}\n"
        body += f"Full report available at: {report_path}\n"
        body += f"Dashboard URL: {settings.prefect_dashboard_url}\n"
        body += f"{'='*60}\n"
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = settings.notification_from_email
        msg['To'] = settings.notification_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        print(f"📧 Sending email notification to {settings.notification_email}...")
        
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_use_tls:
                server.starttls()
            
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            
            server.send_message(msg)
        
        print(f"✅ Email notification sent successfully to {settings.notification_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email notification: {e}")
        # Don't fail the entire pipeline if email fails
        return False


@flow(name="Advocacy Platform ETL", log_prints=True)
def advocacy_etl_flow():
    """
    Main ETL flow - runs automatically every 60 minutes
    
    This flow:
    1. Extracts and validates files
    2. Runs the ETL pipeline
    3. Refreshes materialized views
    4. Checks data quality
    5. Validates analytics
    6. Archives processed files
    7. Generates daily report
    8. Sends email notification
    """
    print("="*80)
    print("🚀 ADVOCACY PLATFORM ETL PIPELINE")
    print("="*80)
    
    # Step 1: Extract and validate
    validation_data = extract_and_validate()
    
    # Step 2: Run ETL pipeline
    stats = run_etl_pipeline(validation_data)
    
    # Step 3: Refresh materialized views
    refresh_materialized_views()
    
    # Step 4: Check data quality
    quality_passed = check_data_quality(stats)
    
    # Step 5: Validate analytics
    analytics_validation = validate_analytics()
    
    # Step 6: Archive processed files
    archive_processed_files(validation_data)
    
    # Step 7: Generate report
    report_path = generate_daily_report(stats, quality_passed, analytics_validation)
    
    # Step 8: Send email notification
    email_sent = send_email_notification(stats, quality_passed, report_path, analytics_validation)
    
    print("="*80)
    print("✅ ETL PIPELINE COMPLETED SUCCESSFULLY")
    print(f"📊 Report: {report_path}")
    if email_sent:
        print(f"📧 Email notification sent to {settings.notification_email}")
    print("="*80)
    
    return {
        'success': True,
        'stats': stats,
        'quality_passed': quality_passed,
        'report_path': report_path,
        'email_sent': email_sent
    }


@flow(name="Weekly Analytics Refresh", log_prints=True)
def weekly_analytics_refresh():
    """
    Weekly maintenance flow for full refresh and optimization
    
    Runs Sunday at 3 AM
    """
    print("="*80)
    print("🔧 WEEKLY ANALYTICS REFRESH")
    print("="*80)
    
    try:
        with psycopg.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cursor:
                # Full materialized view refresh
                print("🔄 Full materialized view refresh...")
                cursor.execute("""
                    REFRESH MATERIALIZED VIEW mv_user_engagement;
                    REFRESH MATERIALIZED VIEW mv_platform_performance;
                    REFRESH MATERIALIZED VIEW mv_brand_performance;
                """)
                conn.commit()
                print("✅ Views refreshed")
                
                # Vacuum and analyze for performance
                print("🧹 Running vacuum and analyze...")
                cursor.execute("""
                    VACUUM ANALYZE advocate_users;
                    VACUUM ANALYZE programs;
                    VACUUM ANALYZE tasks;
                    VACUUM ANALYZE social_analytics;
                    VACUUM ANALYZE sales_attribution;
                """)
                conn.commit()
                print("✅ Database optimized")
                
                # Weekly quality audit
                print("🔍 Running weekly quality audit...")
                cursor.execute("""
                    SELECT 
                        severity,
                        issue_type,
                        COUNT(*) as issue_count,
                        COUNT(CASE WHEN resolved THEN 1 END) as resolved_count
                    FROM data_quality_issues
                    WHERE detected_at >= CURRENT_DATE - INTERVAL '7 days'
                    GROUP BY severity, issue_type
                    ORDER BY 
                        CASE severity 
                            WHEN 'critical' THEN 1
                            WHEN 'high' THEN 2
                            WHEN 'medium' THEN 3
                            WHEN 'low' THEN 4
                        END,
                        issue_count DESC
                """)
                
                quality_report = cursor.fetchall()
                print(f"✅ Quality audit complete: {len(quality_report)} issue types found")
        
        print("="*80)
        print("✅ WEEKLY MAINTENANCE COMPLETED")
        print("="*80)
        
        return {'success': True, 'quality_issues': len(quality_report)}
        
    except Exception as e:
        print(f"❌ Weekly maintenance failed: {e}")
        raise


# Deployment configurations
if __name__ == "__main__":
    # For manual testing
    print("Running ETL flow manually...")
    result = advocacy_etl_flow()
    print(f"\nResult: {result}")

