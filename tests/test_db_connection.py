#!/usr/bin/env python3
"""
Database Connection Diagnostic Tool
Tests PostgreSQL connection and diagnoses common issues
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("="*60)
print("DATABASE CONNECTION DIAGNOSTIC")
print("="*60)

# Step 1: Check environment variables
print("\n[1] Checking environment variables...")
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'advocacy_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}

print(f"    DB_HOST:     {db_config['host']}")
print(f"    DB_PORT:     {db_config['port']}")
print(f"    DB_NAME:     {db_config['database']}")
print(f"    DB_USER:     {db_config['user']}")
print(f"    DB_PASSWORD: {'***' if db_config['password'] else '[NOT SET]'}")

if not db_config['password']:
    print("\n[!] ERROR: DB_PASSWORD is not set!")
    print("    Solution: Create a .env file and set DB_PASSWORD=your_password")
    sys.exit(1)

print("    [OK] All environment variables are set")

# Step 2: Check psycopg installation
print("\n[2] Checking psycopg3 installation...")
try:
    import psycopg
    print(f"    [OK] psycopg3 version {psycopg.__version__} installed")
except ImportError:
    print("    [!] ERROR: psycopg3 is not installed!")
    print("    Solution: pip install psycopg[binary]>=3.2.0")
    sys.exit(1)

# Step 3: Test basic connectivity
print("\n[3] Testing database connection...")
try:
    # psycopg3 connection
    conn = psycopg.connect(
        host=db_config['host'],
        port=db_config['port'],
        dbname=db_config['database'],
        user=db_config['user'],
        password=db_config['password'],
        connect_timeout=10
    )
    
    print("    [OK] Successfully connected to database!")
    
    # Step 4: Check database version
    print("\n[4] Checking PostgreSQL version...")
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print(f"    [OK] {version.split(',')[0]}")
    
    # Step 5: Check if tables exist
    print("\n[5] Checking database schema...")
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables = cursor.fetchall()
    
    if tables:
        print(f"    [OK] Found {len(tables)} tables:")
        for table in tables:
            print(f"        - {table[0]}")
    else:
        print("    [!] WARNING: No tables found in database")
        print("    Solution: Run schema.sql to create tables")
        print("    Command: psql -d advocacy_platform -f schema.sql")
    
    # Step 6: Test write permissions
    print("\n[6] Testing write permissions...")
    try:
        cursor.execute("CREATE TEMP TABLE test_write (id INT);")
        cursor.execute("DROP TABLE test_write;")
        conn.commit()
        print("    [OK] Write permissions confirmed")
    except Exception as e:
        print(f"    [!] WARNING: Write test failed: {e}")
    
    cursor.close()
    conn.close()
    
    print("\n" + "="*60)
    print("[SUCCESS] Database connection is working properly!")
    print("="*60)
    
except psycopg.OperationalError as e:
    print(f"    [!] ERROR: Connection failed!")
    print(f"    Details: {e}")
    print("\n" + "="*60)
    print("COMMON SOLUTIONS:")
    print("="*60)
    print("\n1. PostgreSQL not running:")
    print("   - Windows: Check Services, start 'postgresql' service")
    print("   - Check: pg_ctl status")
    print("   - Start: pg_ctl start")
    
    print("\n2. Wrong credentials:")
    print("   - Check your .env file")
    print("   - Verify password is correct")
    print("   - Try: psql -U postgres -d advocacy_platform")
    
    print("\n3. Database doesn't exist:")
    print("   - Create it: createdb advocacy_platform")
    print("   - Or: psql -U postgres -c \"CREATE DATABASE advocacy_platform;\"")
    
    print("\n4. PostgreSQL on different host/port:")
    print("   - Update DB_HOST and DB_PORT in .env")
    print("   - Default is localhost:5432")
    
    print("\n5. Firewall blocking connection:")
    print("   - Check firewall settings")
    print("   - Verify pg_hba.conf allows local connections")
    
    sys.exit(1)
    
except Exception as e:
    print(f"    [!] ERROR: Unexpected error!")
    print(f"    Details: {e}")
    print(f"    Type: {type(e).__name__}")
    sys.exit(1)

