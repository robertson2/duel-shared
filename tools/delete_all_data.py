#!/usr/bin/env python3
"""
Delete All Data Script
Safely removes all data from database tables while preserving schema
"""

import os
import sys
from dotenv import load_dotenv

# Import psycopg3
import psycopg as db

# Load environment variables
load_dotenv()

# Database configuration
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD'),
    'dbname': os.getenv('DB_NAME', 'advocacy_platform')  # psycopg3 uses 'dbname'
}

def get_table_counts(cursor):
    """Get row counts for all tables"""
    cursor.execute("""
        SELECT 
            table_name,
            (xpath('/row/count/text()', 
                   query_to_xml(format('select count(*) as count from %I.%I', 
                   table_schema, table_name), 
                   false, true, ''))
            )[1]::text::int AS row_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    return cursor.fetchall()

def delete_all_data(confirm=True, verbose=True):
    """
    Delete all data from database tables
    
    Args:
        confirm: If True, ask for user confirmation before deleting
        verbose: If True, show detailed progress
    """
    print("="*80)
    print("DELETE ALL DATA FROM DATABASE")
    print("="*80)
    
    try:
        # Connect to database
        conn = db.connect(**db_config)
        cursor = conn.cursor()
        
        if verbose:
            print(f"\n[1] Connected to database: {os.getenv('DB_NAME', 'advocacy_platform')}")
        
        # Get current row counts
        if verbose:
            print("\n[2] Current data in tables:")
            print("-" * 60)
            
        try:
            counts = get_table_counts(cursor)
            total_rows = 0
            
            for table_name, row_count in counts:
                if row_count > 0:
                    print(f"    {table_name:30} {row_count:>10} rows")
                    total_rows += row_count
            
            if total_rows == 0:
                print("    [No data found in any tables]")
                cursor.close()
                conn.close()
                return
            
            print("-" * 60)
            print(f"    {'TOTAL':30} {total_rows:>10} rows")
            
        except Exception as e:
            print(f"    [Could not get exact counts: {e}]")
            print("    [Will proceed with deletion anyway]")
        
        # Confirmation
        if confirm:
            print("\n" + "="*80)
            print("WARNING: This will permanently delete ALL data from ALL tables!")
            print("The database schema (tables, columns, etc.) will remain intact.")
            print("="*80)
            
            response = input("\nType 'DELETE ALL DATA' to confirm: ")
            
            if response != "DELETE ALL DATA":
                print("\n[CANCELLED] No data was deleted.")
                cursor.close()
                conn.close()
                return
        
        # Delete data in correct order (respecting foreign keys)
        print("\n[3] Deleting data from tables...")
        print("-" * 60)
        
        # Start transaction
        cursor.execute("BEGIN;")
        
        # Order matters due to foreign key constraints
        # Delete in reverse dependency order
        tables_to_truncate = [
            'data_quality_issues',    # References raw_imports
            'social_analytics',       # References tasks
            'sales_attribution',      # References programs
            'tasks',                  # References programs
            'programs',               # References advocate_users
            'advocate_users',         # References advocate_accounts
            'advocate_accounts',      # Parent table (no dependencies)
            'raw_imports'            # Referenced by data_quality_issues
        ]
        
        deleted_tables = []
        
        for table in tables_to_truncate:
            try:
                # TRUNCATE is faster than DELETE and resets sequences
                cursor.execute(f"TRUNCATE TABLE {table} CASCADE;")
                deleted_tables.append(table)
                if verbose:
                    print(f"    [OK] Truncated: {table}")
            except Exception as e:
                if verbose:
                    print(f"    [SKIP] {table}: {e}")
        
        # Commit transaction
        conn.commit()
        print("-" * 60)
        print(f"    [OK] Deleted data from {len(deleted_tables)} tables")
        
        # Refresh materialized views
        if verbose:
            print("\n[3.5] Refreshing materialized views...")
            print("-" * 60)
        
        materialized_views = [
            'mv_account_engagement',
            'mv_platform_performance',
            'mv_brand_performance'
        ]
        
        for view in materialized_views:
            try:
                cursor.execute(f"REFRESH MATERIALIZED VIEW {view};")
                conn.commit()
                if verbose:
                    print(f"    [OK] Refreshed: {view}")
            except Exception as e:
                if verbose:
                    print(f"    [SKIP] {view}: {e}")
        
        # Verify deletion
        if verbose:
            print("\n[4] Verifying deletion...")
            print("-" * 60)
            
            try:
                counts = get_table_counts(cursor)
                remaining_rows = sum(count for _, count in counts)
                
                if remaining_rows == 0:
                    print("    [OK] All data successfully deleted")
                else:
                    print(f"    [WARNING] {remaining_rows} rows still remain")
                    for table_name, row_count in counts:
                        if row_count > 0:
                            print(f"        {table_name}: {row_count} rows")
            except Exception as e:
                print(f"    [Could not verify: {e}]")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*80)
        print("[SUCCESS] All data has been deleted from the database")
        print("="*80)
        print("\nThe database schema is intact. You can run the ETL pipeline again")
        print("to reload data: python etl_pipeline.py")
        print()
        
    except Exception as e:
        print(f"\n[ERROR] Failed to delete data: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def delete_specific_tables(tables, confirm=True, verbose=True):
    """
    Delete data from specific tables only
    
    Args:
        tables: List of table names to delete from
        confirm: If True, ask for user confirmation
        verbose: If True, show detailed progress
    """
    print("="*80)
    print("DELETE DATA FROM SPECIFIC TABLES")
    print("="*80)
    
    try:
        conn = db.connect(**db_config)
        cursor = conn.cursor()
        
        print(f"\n[1] Connected to database: {os.getenv('DB_NAME', 'advocacy_platform')}")
        print(f"[2] Tables to delete: {', '.join(tables)}")
        
        if confirm:
            print("\n" + "="*80)
            print(f"WARNING: This will delete ALL data from: {', '.join(tables)}")
            print("="*80)
            
            response = input("\nType 'DELETE' to confirm: ")
            
            if response != "DELETE":
                print("\n[CANCELLED] No data was deleted.")
                cursor.close()
                conn.close()
                return
        
        print("\n[3] Deleting data...")
        print("-" * 60)
        
        cursor.execute("BEGIN;")
        
        for table in tables:
            try:
                cursor.execute(f"TRUNCATE TABLE {table} CASCADE;")
                if verbose:
                    print(f"    [OK] Truncated: {table}")
            except Exception as e:
                print(f"    [ERROR] {table}: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("-" * 60)
        print("[SUCCESS] Data deleted from specified tables")
        print()
        
    except Exception as e:
        print(f"\n[ERROR] Failed to delete data: {e}")
        sys.exit(1)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Delete data from database tables',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Delete all data (with confirmation)
  python delete_all_data.py
  
  # Delete all data without confirmation (DANGEROUS!)
  python delete_all_data.py --no-confirm
  
  # Delete data from specific tables
  python delete_all_data.py --tables users programs tasks
  
  # Delete quietly (less output)
  python delete_all_data.py --quiet
        """
    )
    
    parser.add_argument(
        '--no-confirm',
        action='store_true',
        help='Skip confirmation prompt (DANGEROUS!)'
    )
    
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Reduce output verbosity'
    )
    
    parser.add_argument(
        '--tables',
        nargs='+',
        help='Delete data from specific tables only'
    )
    
    args = parser.parse_args()
    
    # Check if password is set
    if not db_config['password']:
        print("[ERROR] DB_PASSWORD environment variable is required!")
        print("Create a .env file with your database credentials.")
        sys.exit(1)
    
    # Run deletion
    if args.tables:
        delete_specific_tables(
            args.tables,
            confirm=not args.no_confirm,
            verbose=not args.quiet
        )
    else:
        delete_all_data(
            confirm=not args.no_confirm,
            verbose=not args.quiet
        )

