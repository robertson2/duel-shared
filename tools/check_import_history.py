"""
Diagnostic tool to check ETL import history
Helps troubleshoot why imports aren't showing on the frontend
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import psycopg
import requests

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Database configuration
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'dbname': os.getenv('DB_NAME', 'advocacy_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}

# API configuration
API_BASE_URL = os.getenv('API_BASE_URL', 'http://127.0.0.1:8000')

def print_section(title):
    """Print a section header"""
    print("\n" + "=" * 80)
    print(f" {title}")
    print("=" * 80)

def check_database_connection():
    """Check if database is accessible"""
    print_section("1. DATABASE CONNECTION")
    try:
        with psycopg.connect(**db_config) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            print(f"✅ Database connected successfully")
            print(f"   PostgreSQL version: {version[:50]}...")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def check_raw_imports_table():
    """Check if raw_imports table exists and has data"""
    print_section("2. RAW_IMPORTS TABLE")
    try:
        with psycopg.connect(**db_config) as conn:
            cursor = conn.cursor()
            
            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'raw_imports'
                );
            """)
            exists = cursor.fetchone()[0]
            
            if not exists:
                print("❌ Table 'raw_imports' does not exist!")
                print("   Run: psql -U postgres -d advocacy_platform -f schema/schema.sql")
                return False
            
            print("✅ Table 'raw_imports' exists")
            
            # Check row count
            cursor.execute("SELECT COUNT(*) FROM raw_imports;")
            count = cursor.fetchone()[0]
            print(f"   Total imports in database: {count}")
            
            if count == 0:
                print("\n⚠️  No imports found in database!")
                print("   This is why nothing shows on the import page.")
                print("   Run an ETL import: python etl_pipeline.py")
                return False
            
            # Show last 5 imports
            cursor.execute("""
                SELECT 
                    import_id,
                    file_name,
                    processing_status,
                    records_count,
                    imported_at,
                    processing_completed_at
                FROM raw_imports
                ORDER BY imported_at DESC
                LIMIT 5;
            """)
            
            rows = cursor.fetchall()
            print(f"\n   Last {len(rows)} imports:")
            print("   " + "-" * 76)
            
            for row in rows:
                import_id, file_name, status, records, imported_at, completed_at = row
                print(f"   ID: {str(import_id)[:8]}... | Status: {status:12} | Records: {records or 0:5} | {imported_at}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error checking raw_imports: {e}")
        return False

def check_api_server():
    """Check if API server is running"""
    print_section("3. API SERVER")
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=3)
        if response.status_code == 200:
            print(f"✅ API server is running at {API_BASE_URL}")
            return True
        else:
            print(f"⚠️  API server responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to API server at {API_BASE_URL}")
        print("   Start the server: uvicorn api:app --reload")
        return False
    except Exception as e:
        print(f"❌ Error connecting to API: {e}")
        return False

def check_api_history_endpoint():
    """Check if the /api/v1/etl/history endpoint works"""
    print_section("4. API HISTORY ENDPOINT")
    try:
        response = requests.get(f"{API_BASE_URL}/api/v1/etl/history?limit=5", timeout=5)
        
        if response.status_code != 200:
            print(f"❌ API returned status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
        
        data = response.json()
        print("✅ API endpoint is working")
        print(f"   Endpoint: {API_BASE_URL}/api/v1/etl/history")
        print(f"   Total runs returned: {data.get('total', 0)}")
        print(f"   Orchestration available: {data.get('orchestration_available', False)}")
        
        if data.get('message'):
            print(f"   Message: {data.get('message')}")
        
        runs = data.get('runs', [])
        if runs:
            print(f"\n   Showing {len(runs)} run(s):")
            print("   " + "-" * 76)
            for run in runs:
                print(f"   Run ID: {run.get('dag_run_id', 'N/A')[:16]} | "
                      f"State: {run.get('state', 'N/A'):10} | "
                      f"Duration: {run.get('duration_seconds', 0)}s")
        else:
            print("\n   ⚠️  API returned 0 runs (but table might have data)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing API endpoint: {e}")
        return False

def check_frontend_config():
    """Check frontend configuration"""
    print_section("5. FRONTEND CONFIGURATION")
    
    # Check .env.local file
    frontend_env_path = "frontend/.env.local"
    if os.path.exists(frontend_env_path):
        print(f"✅ Frontend config file exists: {frontend_env_path}")
        with open(frontend_env_path, 'r') as f:
            content = f.read()
            if 'NEXT_PUBLIC_API_URL' in content:
                for line in content.split('\n'):
                    if 'NEXT_PUBLIC_API_URL' in line and not line.strip().startswith('#'):
                        print(f"   {line.strip()}")
            else:
                print("   ⚠️  NEXT_PUBLIC_API_URL not set (will use default)")
    else:
        print(f"⚠️  No frontend config file at {frontend_env_path}")
        print("   Frontend will use default: http://127.0.0.1:8000")
    
    print(f"\n   Expected API URL: {API_BASE_URL}")

def check_browser_console():
    """Provide instructions for checking browser console"""
    print_section("6. BROWSER DEBUGGING")
    print("To check for frontend errors:")
    print("   1. Open your browser to http://localhost:3000/imports")
    print("   2. Open Developer Tools (F12)")
    print("   3. Go to Console tab")
    print("   4. Look for errors (especially CORS or network errors)")
    print("   5. Go to Network tab")
    print("   6. Look for the request to /api/v1/etl/history")
    print("   7. Check if it's returning data")

def main():
    """Run all diagnostic checks"""
    print("\n" + "=" * 80)
    print("ETL IMPORT HISTORY DIAGNOSTIC TOOL")
    print("=" * 80)
    
    results = {
        'database': check_database_connection(),
        'raw_imports': False,
        'api_server': False,
        'api_endpoint': False
    }
    
    if results['database']:
        results['raw_imports'] = check_raw_imports_table()
        results['api_server'] = check_api_server()
        
        if results['api_server']:
            results['api_endpoint'] = check_api_history_endpoint()
    
    check_frontend_config()
    check_browser_console()
    
    # Summary
    print_section("SUMMARY")
    
    all_checks = [
        ("Database Connection", results['database']),
        ("Raw Imports Table", results['raw_imports']),
        ("API Server Running", results['api_server']),
        ("API History Endpoint", results['api_endpoint']),
    ]
    
    for check_name, passed in all_checks:
        status = "✅" if passed else "❌"
        print(f"{status} {check_name}")
    
    # Recommendations
    print_section("RECOMMENDATIONS")
    
    if not results['database']:
        print("1. ❌ Fix database connection first")
        print("   Check your .env file and ensure PostgreSQL is running")
    
    elif not results['raw_imports']:
        print("1. ⚠️  Run an ETL import to populate data:")
        print("   python etl_pipeline.py")
    
    elif not results['api_server']:
        print("1. ❌ Start the API server:")
        print("   uvicorn api:app --reload")
    
    elif not results['api_endpoint']:
        print("1. ❌ API endpoint has issues")
        print("   Check the API logs for errors")
    
    else:
        print("✅ All systems operational!")
        print("\nIf data still doesn't show on the frontend:")
        print("   1. Clear browser cache (Ctrl+Shift+R)")
        print("   2. Check browser console for errors (F12)")
        print("   3. Verify frontend server is running: npm run dev")
        print("   4. Check that frontend is pointing to correct API URL")

if __name__ == '__main__':
    main()

