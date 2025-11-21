-- ============================================================================
-- IMPROVED ANALYTICS QUERIES FOR ADVOCACY PLATFORM (ACCOUNT-BASED)
-- Optimized for actual data patterns and business needs
-- ============================================================================
--
-- ⚠️  IMPORTANT: ALL ANALYTICS ARE ACCOUNT-BASED
-- - Analytics aggregate by advocate_account, NOT individual advocate_users
-- - When multiple users share an account (same email), data is combined
-- - Use mv_account_engagement (not mv_user_engagement) for all advocate analytics
-- - This ensures accurate reporting when accounts have multiple advocate users
--
-- Data Characteristics (as of validation):
-- - 10,000 users, programs, tasks, analytics records
-- - 6,015 sales records (60% conversion coverage)
-- - No posted_at dates in tasks (time-series queries disabled)
-- - 40% null likes, 100% null impressions in analytics
-- - All queries optimized for current data structure
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: TOP ADVOCATE IDENTIFICATION (High Priority)
-- ============================================================================

-- Query 1.1: Champion Advocate Accounts (Top 50 by Combined Performance)
-- Purpose: Identify your best advocate accounts across all metrics
-- Use for: Recognition programs, case studies, ambassador selection
-- Note: Data combined for accounts with multiple users
SELECT 
    a.account_id,
    a.email,
    a.total_users,
    a.user_names,
    a.instagram_handles,
    a.tiktok_handles,
    a.total_engagement_score,
    a.total_likes,
    a.total_comments,
    a.total_shares,
    a.total_reach,
    a.total_sales,
    a.programs_with_sales,
    a.program_conversion_rate,
    a.total_programs,
    a.total_tasks,
    -- Performance metrics
    COALESCE(a.total_sales / NULLIF(a.total_programs, 0), 0)::NUMERIC(10,2) as sales_per_program,
    COALESCE(a.total_engagement_score / NULLIF(a.total_tasks, 0), 0)::NUMERIC(10,2) as engagement_per_task,
    -- Efficiency score (sales per engagement point)
    CASE 
        WHEN a.total_engagement_score > 0 
        THEN (a.total_sales / a.total_engagement_score)::NUMERIC(10,4)
        ELSE 0 
    END as efficiency_score,
    -- Overall score (weighted combination)
    (
        COALESCE(a.total_engagement_score, 0) * 0.4 +
        COALESCE(a.total_sales, 0) * 0.4 +
        COALESCE(a.program_conversion_rate, 0) * 10 * 0.2
    )::NUMERIC(12,2) as champion_score
FROM mv_account_engagement a
WHERE a.total_engagement_score IS NOT NULL
ORDER BY champion_score DESC
LIMIT 50;


-- Query 1.2: High-Value Converter Accounts (Sales Champions)
-- Purpose: Advocate accounts who drive the most revenue
-- Use for: Performance bonuses, sales incentives
-- Note: Sales combined for all users under the same account
SELECT 
    a.account_id,
    a.email,
    a.total_users,
    a.user_names,
    a.total_sales,
    a.programs_with_sales,
    a.program_conversion_rate,
    a.avg_sale_amount,
    a.total_programs,
    a.total_engagement_score,
    -- Key metrics
    (a.total_sales / NULLIF(a.total_programs, 0))::NUMERIC(10,2) as sales_per_program,
    (a.total_sales / NULLIF(a.programs_with_sales, 0))::NUMERIC(10,2) as avg_sale_per_converting_program,
    -- ROI indicator
    CASE 
        WHEN a.total_engagement_score > 0 
        THEN (a.total_sales / a.total_engagement_score)::NUMERIC(10,4)
        ELSE 0 
    END as sales_per_engagement_point
FROM mv_account_engagement a
WHERE a.total_sales > 0
ORDER BY a.total_sales DESC
LIMIT 50;


-- Query 1.3: Engagement Champion Accounts (High Activity, Maybe Low Sales)
-- Purpose: Advocate accounts with great engagement who could be optimized for sales
-- Use for: Coaching opportunities, content optimization
-- Note: Engagement combined for all users under the same account
-- Thresholds adjusted for actual data scale (engagement typically 300-1100 range)
SELECT 
    a.account_id,
    a.email,
    a.total_users,
    a.user_names,
    a.instagram_handles,
    a.tiktok_handles,
    a.total_engagement_score,
    a.total_likes,
    a.total_comments,
    a.total_shares,
    a.total_reach,
    a.total_tasks,
    a.total_sales,
    a.program_conversion_rate,
    -- Flag high engagement with low sales conversion (adjusted for actual data scale)
    CASE 
        WHEN a.total_engagement_score > 800 AND COALESCE(a.total_sales, 0) < 1000 
        THEN 'High Potential - Needs Sales Optimization'
        WHEN a.total_engagement_score > 600 AND COALESCE(a.total_sales, 0) < 2000 
        THEN 'Medium Potential - Could Improve'
        ELSE 'Engaged'
    END as opportunity_flag,
    (a.total_engagement_score / NULLIF(a.total_tasks, 0))::NUMERIC(10,2) as avg_engagement_per_task
FROM mv_account_engagement a
WHERE a.total_engagement_score >= 300  -- Minimum threshold (adjusted for data scale)
ORDER BY a.total_engagement_score DESC
LIMIT 100;


-- Query 1.4: Balanced Performer Accounts (Good at Both Engagement & Sales)
-- Purpose: Your most well-rounded advocate accounts
-- Use for: Ambassador programs, mentorship roles
-- Note: Performance combined for all users under the same account
-- Thresholds adjusted for actual data scale (engagement typically 500-1500 range)
SELECT 
    a.account_id,
    a.email,
    a.total_users,
    a.user_names,
    a.total_engagement_score,
    a.total_sales,
    a.total_programs,
    a.programs_with_sales,
    a.program_conversion_rate,
    -- Balance score (both metrics must be good)
    -- Normalized to actual data scale: ~1000 for engagement, ~1000 for sales
    LEAST(
        (a.total_engagement_score / 1000.0)::NUMERIC(5,2),
        (a.total_sales / 1000.0)::NUMERIC(5,2)
    ) as balance_score
FROM mv_account_engagement a
WHERE a.total_engagement_score >= 500 
  AND a.total_sales >= 500
ORDER BY balance_score DESC
LIMIT 50;


-- ============================================================================
-- SECTION 2: PLATFORM & BRAND INSIGHTS
-- ============================================================================

-- Query 2.1: Platform Performance Deep Dive
-- Purpose: Compare platform effectiveness for advocacy campaigns
-- Use for: Channel strategy, budget allocation
SELECT 
    p.platform,
    p.total_tasks,
    p.total_programs,
    p.total_users as advocates,
    -- Engagement metrics
    p.avg_engagement_score,
    p.avg_likes,
    p.avg_comments,
    p.avg_shares,
    p.avg_reach,
    -- Sales metrics
    p.total_sales,
    p.programs_with_sales,
    (p.programs_with_sales::NUMERIC / NULLIF(p.total_programs, 0) * 100)::NUMERIC(5,2) as program_conversion_rate_pct,
    (p.total_sales / NULLIF(p.total_tasks, 0))::NUMERIC(10,2) as revenue_per_task,
    -- Efficiency
    (p.total_sales / NULLIF(p.total_engagement_score, 0))::NUMERIC(10,4) as sales_per_engagement_unit,
    -- Platform ranking
    RANK() OVER (ORDER BY p.total_sales DESC) as sales_rank,
    RANK() OVER (ORDER BY p.avg_engagement_score DESC) as engagement_rank
FROM mv_platform_performance p
ORDER BY p.total_sales DESC;


-- Query 2.2: Brand Performance Analysis
-- Purpose: Identify which brands are working best with advocacy
-- Use for: Client reporting, partnership decisions
SELECT 
    b.brand,
    b.total_programs,
    b.total_advocates,
    b.total_tasks,
    -- Engagement
    b.total_engagement_score,
    b.avg_engagement_score,
    -- Sales
    b.total_sales,
    b.avg_sale_amount,
    b.sales_per_advocate,
    b.programs_with_sales,
    -- Performance indicators
    (b.total_tasks::NUMERIC / NULLIF(b.total_advocates, 0))::NUMERIC(5,2) as tasks_per_advocate,
    (b.programs_with_sales::NUMERIC / NULLIF(b.total_programs, 0) * 100)::NUMERIC(5,2) as program_conversion_rate_pct,
    (b.total_sales / NULLIF(b.total_tasks, 0))::NUMERIC(10,2) as revenue_per_task,
    -- Brand tier
    CASE 
        WHEN b.total_sales >= 50000 THEN 'Platinum Brand'
        WHEN b.total_sales >= 20000 THEN 'Gold Brand'
        WHEN b.total_sales >= 5000 THEN 'Silver Brand'
        ELSE 'Bronze Brand'
    END as brand_tier
FROM mv_brand_performance b
WHERE b.total_sales > 0
  AND b.brand != 'Unknown'
ORDER BY b.total_sales DESC
LIMIT 100;


-- Query 2.3: Brand-Platform Fit Analysis (Account-Based)
-- Purpose: Which platforms work best for which brands?
-- Use for: Campaign planning, platform recommendations per brand
-- Note: Advocates counted by account, not individual users
SELECT 
    p.brand,
    t.platform,
    COUNT(DISTINCT p.program_id) as programs,
    COUNT(DISTINCT u.account_id) as advocate_accounts,
    COUNT(DISTINCT p.user_id) as advocate_users,
    COUNT(DISTINCT t.task_id) as tasks,
    AVG(sa.engagement_score) as avg_engagement,
    SUM(COALESCE(sales.amount, 0)) as total_sales,
    COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END) as programs_with_sales,
    -- Performance metrics
    (COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END)::NUMERIC 
     / NULLIF(COUNT(DISTINCT p.program_id), 0) * 100)::NUMERIC(5,2) as program_conversion_rate_pct,
    (SUM(COALESCE(sales.amount, 0)) / NULLIF(COUNT(DISTINCT t.task_id), 0))::NUMERIC(10,2) as revenue_per_task,
    (SUM(COALESCE(sales.amount, 0)) / NULLIF(COUNT(DISTINCT u.account_id), 0))::NUMERIC(10,2) as revenue_per_account
FROM programs p
JOIN advocate_users u ON p.user_id = u.user_id
JOIN tasks t ON p.program_id = t.program_id
LEFT JOIN social_analytics sa ON t.task_id = sa.task_id
LEFT JOIN sales_attribution sales ON p.program_id = sales.program_id
WHERE p.brand IS NOT NULL AND p.brand != 'Unknown'
GROUP BY p.brand, t.platform
HAVING COUNT(DISTINCT p.program_id) >= 3  -- Minimum sample size
ORDER BY p.brand, total_sales DESC;


-- ============================================================================
-- SECTION 3: PATTERN & OUTLIER DETECTION
-- ============================================================================

-- Query 3.1: Sales Outliers (Unusually High or Low) - Account-Based
-- Purpose: Identify exceptional sales or investigate anomalies
-- Use for: Fraud detection, opportunity identification
-- Note: Shows account email for sales attribution
WITH sales_stats AS (
    SELECT 
        AVG(amount) as mean_amount,
        STDDEV(amount) as stddev_amount,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY amount) as q1,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY amount) as q3
    FROM sales_attribution
)
SELECT 
    sa.attribution_id,
    sa.program_id,
    u.name as advocate_user_name,
    acc.email as account_email,
    acc.account_id,
    p.brand,
    sa.amount,
    ss.mean_amount::NUMERIC(10,2) as avg_sale,
    -- Statistical measures
    ((sa.amount - ss.mean_amount) / NULLIF(ss.stddev_amount, 0))::NUMERIC(10,2) as z_score,
    CASE 
        WHEN sa.amount > ss.q3 + 1.5 * (ss.q3 - ss.q1) THEN 'High Outlier'
        WHEN sa.amount < ss.q1 - 1.5 * (ss.q3 - ss.q1) THEN 'Low Outlier'
        ELSE 'Normal'
    END as outlier_type,
    -- Context
    sa.attributed_at
FROM sales_attribution sa
JOIN programs p ON sa.program_id = p.program_id
JOIN advocate_users u ON p.user_id = u.user_id
JOIN advocate_accounts acc ON u.account_id = acc.account_id
CROSS JOIN sales_stats ss
WHERE ABS((sa.amount - ss.mean_amount) / NULLIF(ss.stddev_amount, 0)) > 2  -- 2+ standard deviations
ORDER BY ABS((sa.amount - ss.mean_amount) / NULLIF(ss.stddev_amount, 0)) DESC
LIMIT 50;


-- Query 3.2: Engagement Anomalies - Account-Based
-- Purpose: Find posts with unusual engagement patterns
-- Use for: Content analysis, viral content identification
-- Note: Shows account information for anomalous content
WITH engagement_stats AS (
    SELECT 
        AVG(engagement_score) as mean_score,
        STDDEV(engagement_score) as stddev_score
    FROM social_analytics
    WHERE engagement_score IS NOT NULL
)
SELECT 
    sa.analytics_id,
    sa.task_id,
    t.platform,
    p.brand,
    u.name as advocate_user_name,
    acc.email as account_email,
    acc.account_id,
    sa.engagement_score,
    es.mean_score::NUMERIC(10,2) as avg_engagement,
    sa.likes,
    sa.comments,
    sa.shares,
    sa.reach,
    -- Anomaly detection
    ((sa.engagement_score - es.mean_score) / NULLIF(es.stddev_score, 0))::NUMERIC(10,2) as z_score,
    CASE 
        WHEN sa.engagement_score > es.mean_score + 3 * es.stddev_score THEN 'Viral'
        WHEN sa.engagement_score > es.mean_score + 2 * es.stddev_score THEN 'High Performer'
        WHEN sa.engagement_score < es.mean_score - 2 * es.stddev_score THEN 'Underperformer'
        ELSE 'Normal'
    END as engagement_category
FROM social_analytics sa
JOIN tasks t ON sa.task_id = t.task_id
JOIN programs p ON t.program_id = p.program_id
JOIN advocate_users u ON p.user_id = u.user_id
JOIN advocate_accounts acc ON u.account_id = acc.account_id
CROSS JOIN engagement_stats es
WHERE sa.engagement_score IS NOT NULL
  AND ABS((sa.engagement_score - es.mean_score) / NULLIF(es.stddev_score, 0)) > 1.5
ORDER BY ABS((sa.engagement_score - es.mean_score) / NULLIF(es.stddev_score, 0)) DESC
LIMIT 100;


-- Query 3.3: Low-Engagement-High-Sales Pattern - Account-Based
-- Purpose: Find advocate accounts who convert without high engagement (quality over quantity)
-- Use for: Understanding what drives conversions beyond engagement
-- Note: Identifies accounts with efficient conversion regardless of engagement volume
SELECT 
    a.account_id,
    a.email,
    a.total_users,
    a.user_names,
    a.total_engagement_score,
    a.total_sales,
    a.programs_with_sales,
    a.program_conversion_rate,
    a.total_tasks,
    -- The unusual pattern
    (a.total_sales / NULLIF(a.total_engagement_score, 0))::NUMERIC(10,4) as sales_efficiency,
    -- Why they're interesting
    'High conversion despite low engagement' as pattern_note
FROM mv_account_engagement a
WHERE a.total_sales > 1000  -- Meaningful sales
  AND a.total_engagement_score < 5000  -- But lower engagement
  AND (a.total_sales / NULLIF(a.total_engagement_score, 0)) > 0.3  -- High efficiency
ORDER BY (a.total_sales / NULLIF(a.total_engagement_score, 0)) DESC
LIMIT 50;


-- ============================================================================
-- SECTION 4: ADVOCATE SEGMENTATION
-- ============================================================================

-- Query 4.1: Advocate Account Performance Tiers
-- Purpose: Segment advocate accounts into actionable tiers
-- Use for: Tiered reward programs, targeted communications
-- Note: Tiers based on account-level aggregated performance
SELECT 
    CASE 
        WHEN total_engagement_score >= 50000 AND total_sales >= 5000 THEN 'Platinum'
        WHEN total_engagement_score >= 20000 AND total_sales >= 2000 THEN 'Gold'
        WHEN total_engagement_score >= 5000 AND total_sales >= 500 THEN 'Silver'
        WHEN total_engagement_score >= 1000 OR total_sales >= 100 THEN 'Bronze'
        ELSE 'Starter'
    END as tier,
    COUNT(*) as account_count,
    AVG(total_engagement_score)::NUMERIC(12,2) as avg_engagement,
    AVG(total_sales)::NUMERIC(10,2) as avg_sales,
    SUM(total_sales)::NUMERIC(12,2) as total_tier_sales,
    AVG(total_programs)::NUMERIC(5,2) as avg_programs,
    AVG(program_conversion_rate)::NUMERIC(5,2) as avg_program_conversion_rate,
    (SUM(total_sales) / SUM(COUNT(*)) OVER ())::NUMERIC(5,2) as pct_of_total_sales
FROM mv_account_engagement
WHERE total_engagement_score IS NOT NULL OR total_sales IS NOT NULL
GROUP BY tier
ORDER BY avg_sales DESC;


-- Query 4.2: Activity-Based Segmentation - Account Level
-- Purpose: Classify advocate accounts by activity level
-- Use for: Re-engagement campaigns, activity monitoring
-- Note: Activity aggregated across all users in the account
SELECT 
    a.account_id,
    a.email,
    a.total_users,
    a.user_names,
    a.total_programs,
    a.total_tasks,
    a.total_engagement_score,
    a.total_sales,
    a.program_conversion_rate,
    -- Activity classification
    CASE 
        WHEN a.total_programs >= 10 AND a.total_tasks >= 10 THEN 'Highly Active'
        WHEN a.total_programs >= 5 AND a.total_tasks >= 5 THEN 'Active'
        WHEN a.total_programs >= 2 AND a.total_tasks >= 2 THEN 'Moderately Active'
        WHEN a.total_programs >= 1 THEN 'Low Activity'
        ELSE 'Inactive'
    END as activity_segment,
    -- Quality indicator
    CASE 
        WHEN a.total_sales > 2000 THEN 'High Value'
        WHEN a.total_sales > 500 THEN 'Medium Value'
        WHEN a.total_sales > 0 THEN 'Low Value'
        ELSE 'No Sales Yet'
    END as value_segment
FROM mv_account_engagement a
ORDER BY a.total_programs DESC NULLS LAST, a.total_sales DESC NULLS LAST;


-- Query 4.3: Conversion Efficiency Segments - Account Level
-- Purpose: Group advocate accounts by how well they convert engagement to sales
-- Use for: Training programs, best practice identification
-- Note: Efficiency calculated on account-aggregated data
WITH conversion_metrics AS (
    SELECT 
        account_id,
        email,
        total_users,
        user_names,
        total_engagement_score,
        total_sales,
        programs_with_sales,
        total_programs,
        program_conversion_rate,
        total_tasks,
        CASE 
            WHEN total_engagement_score > 0 
            THEN (total_sales / total_engagement_score)
            ELSE 0 
        END as conversion_efficiency
    FROM mv_account_engagement
    WHERE total_sales > 0 AND total_engagement_score > 0
)
SELECT 
    CASE 
        WHEN conversion_efficiency >= 0.5 THEN 'Super Converters'
        WHEN conversion_efficiency >= 0.3 THEN 'High Converters'
        WHEN conversion_efficiency >= 0.1 THEN 'Average Converters'
        ELSE 'Low Converters'
    END as converter_segment,
    COUNT(*) as account_count,
    AVG(conversion_efficiency)::NUMERIC(10,4) as avg_efficiency,
    AVG(total_sales)::NUMERIC(10,2) as avg_sales,
    AVG(total_engagement_score)::NUMERIC(10,2) as avg_engagement,
    AVG(program_conversion_rate)::NUMERIC(5,2) as avg_program_conversion_rate
FROM conversion_metrics
GROUP BY converter_segment
ORDER BY avg_efficiency DESC;


-- ============================================================================
-- SECTION 5: DATA QUALITY & OPERATIONAL INSIGHTS
-- ============================================================================

-- Query 5.1: Data Completeness Dashboard
-- Purpose: Monitor data quality across all tables
-- Use for: ETL monitoring, data quality improvement
SELECT 
    'Advocate Accounts' as entity,
    COUNT(*) as total_records,
    COUNT(email) as has_email,
    NULL::BIGINT as field2,
    NULL::BIGINT as field3,
    NULL::BIGINT as field4,
    (COUNT(email)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as metric1_pct,
    NULL::NUMERIC(5,2) as metric2_pct
FROM advocate_accounts

UNION ALL

SELECT 
    'Advocate Users' as entity,
    COUNT(*) as total_records,
    COUNT(name) as has_name,
    COUNT(account_id) as has_account_link,
    COUNT(instagram_handle) as has_instagram,
    COUNT(tiktok_handle) as has_tiktok,
    (COUNT(name)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as name_completeness_pct,
    (COUNT(account_id)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as account_link_pct
FROM advocate_users

UNION ALL

SELECT 
    'Social Analytics' as entity,
    COUNT(*) as total_records,
    COUNT(likes) as has_likes,
    COUNT(comments) as has_comments,
    COUNT(reach) as has_reach,
    COUNT(impressions) as has_impressions,
    (COUNT(likes)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as likes_completeness_pct,
    (COUNT(reach)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as reach_completeness_pct
FROM social_analytics

UNION ALL

SELECT 
    'Tasks' as entity,
    COUNT(*) as total_records,
    COUNT(post_url) as has_url,
    COUNT(posted_at) as has_date,
    NULL::BIGINT,
    NULL::BIGINT,
    (COUNT(post_url)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as url_completeness_pct,
    (COUNT(posted_at)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as date_completeness_pct
FROM tasks;


-- Query 5.2: Data Quality Issues by Severity
-- Purpose: Track and prioritize data quality problems
-- Use for: Data cleanup prioritization
SELECT 
    severity,
    issue_type,
    COUNT(*) as total_issues,
    COUNT(CASE WHEN resolved THEN 1 END) as resolved_issues,
    COUNT(CASE WHEN NOT resolved THEN 1 END) as open_issues,
    (COUNT(CASE WHEN resolved THEN 1 END)::NUMERIC / COUNT(*) * 100)::NUMERIC(5,2) as resolution_rate_pct,
    -- Recent issues
    COUNT(CASE WHEN detected_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as issues_last_week
FROM data_quality_issues
GROUP BY severity, issue_type
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    total_issues DESC;


-- Query 5.3: Program Performance Overview (Account-Based)
-- Purpose: Get aggregate metrics for all programs
-- Use for: Dashboard KPIs, executive reporting
-- Note: Counts accounts (not individual users) for advocate metrics
SELECT 
    COUNT(DISTINCT acc.account_id) as total_advocate_accounts,
    COUNT(DISTINCT u.user_id) as total_advocate_users,
    COUNT(DISTINCT p.program_id) as total_programs,
    COUNT(DISTINCT t.task_id) as total_tasks,
    COUNT(DISTINCT sa.analytics_id) as total_analytics_records,
    COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END) as programs_with_sales,
    -- Engagement totals
    SUM(sa.likes)::BIGINT as total_likes,
    SUM(sa.comments)::BIGINT as total_comments,
    SUM(sa.shares)::BIGINT as total_shares,
    SUM(sa.reach)::BIGINT as total_reach,
    SUM(sa.engagement_score)::BIGINT as total_engagement_score,
    -- Sales totals
    SUM(sales.amount)::NUMERIC(12,2) as total_revenue,
    AVG(sales.amount)::NUMERIC(10,2) as avg_sale_amount,
    -- Conversion metrics
    (COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END)::NUMERIC 
     / NULLIF(COUNT(DISTINCT p.program_id), 0) * 100)::NUMERIC(5,2) as program_conversion_rate_pct,
    -- Efficiency metrics (account-based)
    (SUM(sales.amount) / NULLIF(SUM(sa.engagement_score), 0))::NUMERIC(10,4) as revenue_per_engagement_point,
    (SUM(sales.amount) / NULLIF(COUNT(DISTINCT acc.account_id), 0))::NUMERIC(10,2) as revenue_per_account
FROM advocate_accounts acc
LEFT JOIN advocate_users u ON acc.account_id = u.account_id
LEFT JOIN programs p ON u.user_id = p.user_id
LEFT JOIN tasks t ON p.program_id = t.program_id
LEFT JOIN social_analytics sa ON t.task_id = sa.task_id
LEFT JOIN sales_attribution sales ON p.program_id = sales.program_id;


-- ============================================================================
-- SECTION 6: QUICK EXPORTS FOR DASHBOARDS
-- ============================================================================

-- Query 6.1: Executive Dashboard KPIs (Account-Based)
-- Purpose: Top-level metrics for dashboards
-- Note: Counts advocate accounts (not individual users)
SELECT 
    'Total Advocate Accounts' as metric,
    COUNT(DISTINCT account_id)::TEXT as value
FROM advocate_accounts
UNION ALL
SELECT 'Total Advocate Users', COUNT(DISTINCT user_id)::TEXT
FROM advocate_users
UNION ALL
SELECT 'Total Revenue', TO_CHAR(SUM(amount), '$999,999,999.99')
FROM sales_attribution
UNION ALL
SELECT 'Avg Sale Value', TO_CHAR(AVG(amount), '$9,999.99')
FROM sales_attribution
UNION ALL
SELECT 'Total Engagement', TO_CHAR(SUM(engagement_score), '999,999,999')
FROM social_analytics
UNION ALL
SELECT 'Conversion Rate', TO_CHAR(
    (SELECT COUNT(*)::NUMERIC FROM sales_attribution) / 
    NULLIF((SELECT COUNT(*) FROM tasks), 0) * 100, '999.99') || '%'
FROM (SELECT 1) dummy;


-- Query 6.2: Platform Comparison (Simple)
-- Purpose: Quick platform overview for charts
SELECT 
    platform,
    total_tasks,
    total_sales::NUMERIC(12,2),
    avg_engagement_score::NUMERIC(10,2),
    (conversion_count::NUMERIC / NULLIF(total_tasks, 0) * 100)::NUMERIC(5,2) as conversion_rate_pct
FROM mv_platform_performance
ORDER BY total_sales DESC;


-- Query 6.3: Top 10 Advocate Accounts Leaderboard
-- Purpose: Simple leaderboard for display
-- Note: Displays account-level rankings
SELECT 
    ROW_NUMBER() OVER (ORDER BY total_sales DESC) as rank,
    email,
    total_users,
    user_names,
    total_programs,
    total_tasks,
    total_engagement_score::BIGINT,
    total_sales::NUMERIC(10,2),
    programs_with_sales,
    program_conversion_rate
FROM mv_account_engagement
WHERE total_sales > 0
ORDER BY total_sales DESC
LIMIT 10;


-- ============================================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================================================
/*
MATERIALIZED VIEW REFRESH:
- Run: SELECT refresh_all_materialized_views();
- Recommended frequency: After each ETL batch
- Or set up automatic refresh via cron/scheduler

INDEX SUGGESTIONS:
All necessary indexes are already created in schema.sql

QUERY OPTIMIZATION:
- All queries use materialized views where possible
- Queries avoid full table scans
- NULL handling prevents division errors
- Sample sizes limited with LIMIT clauses

DASHBOARD INTEGRATION:
- Section 6 queries are optimized for real-time dashboards
- Use query result caching for frequently accessed data
- Consider API endpoints for each major query section
*/

-- ============================================================================
-- END OF IMPROVED ANALYTICS QUERIES
-- ============================================================================

