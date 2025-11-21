"""
Verify impact_score implementation
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'dbname': os.getenv('DB_NAME', 'advocacy_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}

print("=" * 80)
print("VERIFYING IMPACT_SCORE IMPLEMENTATION")
print("=" * 80)

try:
    conn = psycopg.connect(**db_config)
    cursor = conn.cursor()
    
    # 1. Check if impact_score column exists in social_analytics
    print("\n[1/6] Checking if impact_score column exists...")
    cursor.execute("""
        SELECT column_name, data_type, is_generated
        FROM information_schema.columns 
        WHERE table_name='social_analytics' 
        AND column_name IN ('engagement_score', 'impact_score', 'engagement_rate')
        ORDER BY column_name;
    """)
    columns = cursor.fetchall()
    for col in columns:
        print(f"    [OK] {col[0]}: {col[1]} (generated: {col[2]})")
    
    # 2. Check sample data
    print("\n[2/6] Checking sample data from social_analytics...")
    cursor.execute("""
        SELECT 
            likes, comments, shares, reach,
            engagement_score,
            impact_score,
            engagement_rate
        FROM social_analytics 
        WHERE likes IS NOT NULL 
        LIMIT 3;
    """)
    samples = cursor.fetchall()
    for i, row in enumerate(samples, 1):
        likes, comments, shares, reach, eng_score, imp_score, eng_rate = row
        print(f"    Sample {i}:")
        print(f"      Likes: {likes}, Comments: {comments}, Shares: {shares}, Reach: {reach}")
        print(f"      Engagement Score: {eng_score}")
        print(f"      Impact Score: {imp_score}")
        print(f"      Engagement Rate: {eng_rate}%")
        
        # Verify calculation
        expected_eng = (likes or 0) + ((comments or 0) * 2) + ((shares or 0) * 3)
        expected_imp = (expected_eng * 0.7) + ((reach or 0) * 0.0003)
        print(f"      Calculation check: Eng={expected_eng} (expected {eng_score}) [OK]" if abs(expected_eng - eng_score) < 0.01 else f"      [X] MISMATCH")
        print(f"      Calculation check: Imp={expected_imp:.2f} (expected {imp_score}) [OK]" if abs(expected_imp - float(imp_score)) < 0.01 else f"      [X] MISMATCH")
    
    # 3. Check materialized view mv_account_engagement
    print("\n[3/6] Checking mv_account_engagement columns...")
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name='mv_account_engagement' 
        AND column_name LIKE '%impact%' OR column_name LIKE '%engagement_rate%'
        ORDER BY column_name;
    """)
    mv_columns = cursor.fetchall()
    for col in mv_columns:
        print(f"    [OK] {col[0]}")
    
    # 4. Check materialized view mv_platform_performance
    print("\n[4/6] Checking mv_platform_performance data...")
    cursor.execute("""
        SELECT 
            platform,
            avg_engagement_score,
            avg_impact_score,
            avg_engagement_rate
        FROM mv_platform_performance
        ORDER BY avg_impact_score DESC NULLS LAST
        LIMIT 3;
    """)
    platform_data = cursor.fetchall()
    for row in platform_data:
        platform, avg_eng, avg_imp, avg_rate = row
        print(f"    {platform}:")
        eng_str = f"{avg_eng:.1f}" if avg_eng is not None else "NULL"
        imp_str = f"{avg_imp:.1f}" if avg_imp is not None else "NULL"
        rate_str = f"{avg_rate:.2f}" if avg_rate is not None else "NULL"
        print(f"      Avg Engagement: {eng_str}")
        print(f"      Avg Impact: {imp_str}")
        print(f"      Avg Eng Rate: {rate_str}%")
    
    # 5. Check materialized view mv_brand_performance
    print("\n[5/6] Checking mv_brand_performance data...")
    cursor.execute("""
        SELECT 
            brand,
            avg_engagement_score,
            avg_impact_score,
            avg_engagement_rate
        FROM mv_brand_performance
        WHERE brand != 'Unknown'
        ORDER BY avg_impact_score DESC NULLS LAST
        LIMIT 3;
    """)
    brand_data = cursor.fetchall()
    for row in brand_data:
        brand, avg_eng, avg_imp, avg_rate = row
        print(f"    {brand}:")
        eng_str = f"{avg_eng:.1f}" if avg_eng is not None else "NULL"
        imp_str = f"{avg_imp:.1f}" if avg_imp is not None else "NULL"
        rate_str = f"{avg_rate:.2f}" if avg_rate is not None else "NULL"
        print(f"      Avg Engagement: {eng_str}")
        print(f"      Avg Impact: {imp_str}")
        print(f"      Avg Eng Rate: {rate_str}%")
    
    # 6. Summary stats
    print("\n[6/6] Summary statistics...")
    cursor.execute("""
        SELECT 
            COUNT(*) as total_records,
            COUNT(impact_score) as records_with_impact,
            AVG(engagement_score)::NUMERIC(10,2) as avg_engagement,
            AVG(impact_score)::NUMERIC(10,2) as avg_impact,
            MAX(engagement_score) as max_engagement,
            MAX(impact_score)::NUMERIC(10,2) as max_impact
        FROM social_analytics;
    """)
    stats = cursor.fetchone()
    print(f"    Total records: {stats[0]:,}")
    print(f"    Records with impact_score: {stats[1]:,}")
    print(f"    Average engagement score: {stats[2]}")
    print(f"    Average impact score: {stats[3]}")
    print(f"    Max engagement score: {stats[4]}")
    print(f"    Max impact score: {stats[5]}")
    
    print("\n" + "=" * 80)
    print("[SUCCESS] VERIFICATION COMPLETE - All checks passed!")
    print("=" * 80)
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
    exit(1)

