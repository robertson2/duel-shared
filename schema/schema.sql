-- ============================================================================
-- ADVOCACY PLATFORM DATABASE SCHEMA
-- Hybrid Relational + JSONB Approach with Advocate Accounts
-- ============================================================================
-- 
-- This schema supports multiple advocate users sharing the same email address
-- through a parent advocate_accounts table.
--
-- To apply this schema:
--   psql -U postgres -d advocacy_platform -f schema/schema.sql
--
-- To drop existing schema first:
--   psql -U postgres -d advocacy_platform -f schema/drop_schema.sql
--   psql -U postgres -d advocacy_platform -f schema/schema.sql
-- ============================================================================

-- Drop existing schema (UNCOMMENT to enable automatic drop)
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Advocate Accounts table (one per unique email address)
CREATE TABLE advocate_accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional metadata (flexible JSONB)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

-- Advocate Users table (multiple users can share the same account/email)
CREATE TABLE advocate_users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES advocate_accounts(account_id) ON DELETE CASCADE,
    name TEXT,
    instagram_handle TEXT,
    tiktok_handle TEXT,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional metadata (flexible JSONB)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT instagram_format CHECK (
        instagram_handle IS NULL OR 
        instagram_handle ~* '^@?[A-Za-z0-9._]+$'
    ),
    CONSTRAINT tiktok_format CHECK (
        tiktok_handle IS NULL OR 
        tiktok_handle ~* '^@?[A-Za-z0-9._]+$'
    )
);

-- Programs table
CREATE TABLE programs (
    program_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES advocate_users(user_id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    program_name TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Program-specific data (flexible JSONB)
    program_data JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (
        completed_at IS NULL OR 
        started_at IS NULL OR 
        completed_at >= started_at
    )
);

-- Tasks table
CREATE TABLE tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('TikTok', 'Instagram', 'Facebook', 'YouTube', 'Twitter', 'Unknown')),
    post_url TEXT,
    posted_at TIMESTAMPTZ,
    task_status TEXT DEFAULT 'pending' CHECK (task_status IN ('pending', 'posted', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Platform-specific data (flexible JSONB)
    platform_data JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_url CHECK (
        post_url IS NULL OR 
        post_url ~* '^https?://'
    )
);

-- Social Analytics table
CREATE TABLE social_analytics (
    analytics_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    
    -- Core metrics
    likes INT CHECK (likes IS NULL OR likes >= 0),
    comments INT CHECK (comments IS NULL OR comments >= 0),
    shares INT CHECK (shares IS NULL OR shares >= 0),
    reach INT CHECK (reach IS NULL OR reach >= 0),
    impressions INT CHECK (impressions IS NULL OR impressions >= 0),
    
    -- Metadata
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional platform-specific metrics (flexible JSONB)
    additional_metrics JSONB DEFAULT '{}'::jsonb,
    
    -- Calculated engagement score (auto-updated via trigger)
    -- Measures: Quality of interactions (likes, comments, shares)
    engagement_score INT GENERATED ALWAYS AS (
        COALESCE(likes, 0) + 
        COALESCE(comments, 0) * 2 + 
        COALESCE(shares, 0) * 3
    ) STORED,
    
    -- Calculated impact score (engagement + reach bonus)
    -- Measures: Total campaign impact (quality × distribution)
    impact_score NUMERIC(10,2) GENERATED ALWAYS AS (
        (COALESCE(likes, 0) + 
         COALESCE(comments, 0) * 2 + 
         COALESCE(shares, 0) * 3) * 0.7 +
        COALESCE(reach, 0) * 0.0003
    ) STORED,
    
    -- Calculated engagement rate (percentage)
    -- Measures: Efficiency of converting views to engagements
    engagement_rate NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN reach IS NULL OR reach = 0 THEN NULL
            ELSE ROUND(
                ((COALESCE(likes, 0) + COALESCE(comments, 0) + COALESCE(shares, 0))::NUMERIC / reach::NUMERIC) * 100,
                2
            )
        END
    ) STORED,
    
    -- Unique constraint: one analytics record per task per measurement time
    CONSTRAINT unique_task_measurement UNIQUE (task_id, measured_at)
);

-- Sales Attribution table
CREATE TABLE sales_attribution (
    attribution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(program_id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP')),
    attributed_at TIMESTAMPTZ DEFAULT NOW(),
    order_id TEXT,
    customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional attribution data (flexible JSONB)
    attribution_data JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- AUDIT & RAW DATA TABLES
-- ============================================================================

-- Raw imports for audit trail
CREATE TABLE raw_imports (
    import_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    records_count INT,
    processing_status TEXT DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'processing', 'completed', 'failed')
    ),
    error_message TEXT,
    
    -- Store original JSON
    original_data JSONB NOT NULL,
    
    -- Processing metadata
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processed_by TEXT
);

-- Data quality issues log
CREATE TABLE data_quality_issues (
    issue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id UUID REFERENCES raw_imports(import_id) ON DELETE CASCADE,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    issue_type TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    affected_record_id TEXT,
    affected_field TEXT,
    
    -- Store the problematic data
    problematic_value JSONB,
    
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Advocate Accounts indexes
CREATE INDEX idx_advocate_accounts_email ON advocate_accounts(email);
CREATE INDEX idx_advocate_accounts_metadata ON advocate_accounts USING GIN (metadata);

-- Advocate Users indexes
CREATE INDEX idx_advocate_users_account_id ON advocate_users(account_id);
CREATE INDEX idx_advocate_users_instagram ON advocate_users(instagram_handle) WHERE instagram_handle IS NOT NULL;
CREATE INDEX idx_advocate_users_tiktok ON advocate_users(tiktok_handle) WHERE tiktok_handle IS NOT NULL;
CREATE INDEX idx_advocate_users_joined_at ON advocate_users(joined_at) WHERE joined_at IS NOT NULL;
CREATE INDEX idx_advocate_users_metadata ON advocate_users USING GIN (metadata);
CREATE INDEX idx_advocate_users_name_trgm ON advocate_users USING GIN (name gin_trgm_ops); -- Fuzzy search

-- Programs indexes
CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_programs_brand ON programs(brand);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_started_at ON programs(started_at);
CREATE INDEX idx_programs_data ON programs USING GIN (program_data);

-- Tasks indexes
CREATE INDEX idx_tasks_program_id ON tasks(program_id);
CREATE INDEX idx_tasks_platform ON tasks(platform);
CREATE INDEX idx_tasks_posted_at ON tasks(posted_at);
CREATE INDEX idx_tasks_status ON tasks(task_status);
CREATE INDEX idx_tasks_platform_data ON tasks USING GIN (platform_data);

-- Analytics indexes
CREATE INDEX idx_analytics_task_id ON social_analytics(task_id);
CREATE INDEX idx_analytics_engagement_score ON social_analytics(engagement_score DESC NULLS LAST);
CREATE INDEX idx_analytics_likes ON social_analytics(likes DESC NULLS LAST);
CREATE INDEX idx_analytics_reach ON social_analytics(reach DESC NULLS LAST);
CREATE INDEX idx_analytics_measured_at ON social_analytics(measured_at);
CREATE INDEX idx_analytics_metrics ON social_analytics USING GIN (additional_metrics);

-- Sales indexes
CREATE INDEX idx_sales_program_id ON sales_attribution(program_id);
CREATE INDEX idx_sales_amount ON sales_attribution(amount DESC);
CREATE INDEX idx_sales_attributed_at ON sales_attribution(attributed_at);
CREATE INDEX idx_sales_order_id ON sales_attribution(order_id) WHERE order_id IS NOT NULL;

-- Import tracking indexes
CREATE INDEX idx_imports_status ON raw_imports(processing_status);
CREATE INDEX idx_imports_imported_at ON raw_imports(imported_at);

-- Data quality indexes
CREATE INDEX idx_dq_import_id ON data_quality_issues(import_id);
CREATE INDEX idx_dq_severity ON data_quality_issues(severity);
CREATE INDEX idx_dq_resolved ON data_quality_issues(resolved) WHERE NOT resolved;

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Account engagement summary (PRIMARY VIEW FOR ALL ANALYTICS)
-- Groups data by advocate account, combining all users under same account
CREATE MATERIALIZED VIEW mv_account_engagement AS
SELECT 
    acc.account_id,
    acc.email,
    COUNT(DISTINCT u.user_id) as total_users,
    STRING_AGG(DISTINCT u.name, ', ') as user_names,
    STRING_AGG(DISTINCT u.instagram_handle, ', ') FILTER (WHERE u.instagram_handle IS NOT NULL) as instagram_handles,
    STRING_AGG(DISTINCT u.tiktok_handle, ', ') FILTER (WHERE u.tiktok_handle IS NOT NULL) as tiktok_handles,
    COUNT(DISTINCT p.program_id) as total_programs,
    COUNT(DISTINCT t.task_id) as total_tasks,
    SUM(sa.likes) as total_likes,
    SUM(sa.comments) as total_comments,
    SUM(sa.shares) as total_shares,
    SUM(sa.reach) as total_reach,
    SUM(sa.engagement_score) as total_engagement_score,
    AVG(sa.engagement_score) as avg_engagement_score,
    MAX(sa.engagement_score) as max_engagement_score,
    SUM(sa.impact_score) as total_impact_score,
    AVG(sa.impact_score) as avg_impact_score,
    MAX(sa.impact_score) as max_impact_score,
    AVG(sa.engagement_rate) as avg_engagement_rate,
    COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END) as programs_with_sales,
    (COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END)::NUMERIC 
     / NULLIF(COUNT(DISTINCT p.program_id), 0) * 100)::NUMERIC(5,2) as program_conversion_rate,
    COALESCE(SUM(sales.amount), 0) as total_sales,
    COALESCE(AVG(sales.amount), 0) as avg_sale_amount,
    MAX(t.posted_at) as last_post_date
FROM advocate_accounts acc
LEFT JOIN advocate_users u ON acc.account_id = u.account_id
LEFT JOIN programs p ON u.user_id = p.user_id
LEFT JOIN tasks t ON p.program_id = t.program_id
LEFT JOIN social_analytics sa ON t.task_id = sa.task_id
LEFT JOIN sales_attribution sales ON p.program_id = sales.program_id
GROUP BY acc.account_id, acc.email;

-- Create indexes on account engagement materialized view
CREATE UNIQUE INDEX idx_mv_account_engagement_account_id ON mv_account_engagement(account_id);
CREATE INDEX idx_mv_account_engagement_score ON mv_account_engagement(total_engagement_score DESC NULLS LAST);
CREATE INDEX idx_mv_account_engagement_sales ON mv_account_engagement(total_sales DESC);
CREATE INDEX idx_mv_account_engagement_email ON mv_account_engagement(email);

-- Platform performance summary (account-based)
CREATE MATERIALIZED VIEW mv_platform_performance AS
SELECT 
    t.platform,
    COUNT(DISTINCT t.task_id) as total_tasks,
    COUNT(DISTINCT p.program_id) as total_programs,
    COUNT(DISTINCT u.account_id) as total_accounts,
    COUNT(DISTINCT p.user_id) as total_users,
    AVG(sa.likes) as avg_likes,
    AVG(sa.comments) as avg_comments,
    AVG(sa.shares) as avg_shares,
    AVG(sa.reach) as avg_reach,
    AVG(sa.engagement_score) as avg_engagement_score,
    SUM(sa.engagement_score) as total_engagement_score,
    AVG(sa.impact_score) as avg_impact_score,
    SUM(sa.impact_score) as total_impact_score,
    AVG(sa.engagement_rate) as avg_engagement_rate,
    COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END) as programs_with_sales,
    COALESCE(SUM(sales.amount), 0) as total_sales,
    COALESCE(AVG(sales.amount), 0) as avg_sale_amount
FROM tasks t
LEFT JOIN programs p ON t.program_id = p.program_id
LEFT JOIN advocate_users u ON p.user_id = u.user_id
LEFT JOIN social_analytics sa ON t.task_id = sa.task_id
LEFT JOIN sales_attribution sales ON p.program_id = sales.program_id
GROUP BY t.platform;

-- Create indexes on platform performance materialized view
CREATE UNIQUE INDEX idx_mv_platform_performance_platform ON mv_platform_performance(platform);
CREATE INDEX idx_mv_platform_sales ON mv_platform_performance(total_sales DESC);

-- Brand performance summary (account-based)
CREATE MATERIALIZED VIEW mv_brand_performance AS
SELECT 
    p.brand,
    COUNT(DISTINCT p.program_id) as total_programs,
    COUNT(DISTINCT u.account_id) as total_accounts,
    COUNT(DISTINCT p.user_id) as total_advocates,
    COUNT(DISTINCT t.task_id) as total_tasks,
    SUM(sa.engagement_score) as total_engagement_score,
    AVG(sa.engagement_score) as avg_engagement_score,
    SUM(sa.impact_score) as total_impact_score,
    AVG(sa.impact_score) as avg_impact_score,
    AVG(sa.engagement_rate) as avg_engagement_rate,
    COUNT(DISTINCT CASE WHEN sales.amount IS NOT NULL THEN p.program_id END) as programs_with_sales,
    COALESCE(SUM(sales.amount), 0) as total_sales,
    COALESCE(AVG(sales.amount), 0) as avg_sale_amount,
    COALESCE(SUM(sales.amount), 0) / NULLIF(COUNT(DISTINCT u.account_id), 0) as sales_per_account,
    COALESCE(SUM(sales.amount), 0) / NULLIF(COUNT(DISTINCT p.user_id), 0) as sales_per_advocate
FROM programs p
LEFT JOIN advocate_users u ON p.user_id = u.user_id
LEFT JOIN tasks t ON p.program_id = t.program_id
LEFT JOIN social_analytics sa ON t.task_id = sa.task_id
LEFT JOIN sales_attribution sales ON p.program_id = sales.program_id
WHERE p.brand IS NOT NULL
GROUP BY p.brand;

-- Create indexes on brand performance materialized view
CREATE UNIQUE INDEX idx_mv_brand_performance_brand ON mv_brand_performance(brand);
CREATE INDEX idx_mv_brand_sales ON mv_brand_performance(total_sales DESC);
CREATE INDEX idx_mv_brand_sales_per_account ON mv_brand_performance(sales_per_account DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_advocate_accounts_updated_at BEFORE UPDATE ON advocate_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advocate_users_updated_at BEFORE UPDATE ON advocate_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON social_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_account_engagement;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_platform_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_brand_performance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USEFUL QUERIES (stored as comments for reference)
-- ============================================================================

-- Top 10 advocate accounts by engagement
-- SELECT * FROM mv_account_engagement ORDER BY total_engagement_score DESC LIMIT 10;

-- Top 10 advocate accounts by sales
-- SELECT * FROM mv_account_engagement ORDER BY total_sales DESC LIMIT 10;

-- Platform comparison
-- SELECT * FROM mv_platform_performance ORDER BY total_sales DESC;

-- Brand ROI analysis (account-based)
-- SELECT * FROM mv_brand_performance ORDER BY sales_per_account DESC;

-- Advocate users with invalid data
-- SELECT u.user_id, u.name, acc.email FROM advocate_users u 
-- JOIN advocate_accounts acc ON u.account_id = acc.account_id
-- WHERE u.name = '???';

-- Advocate accounts with multiple users (shared emails)
-- SELECT acc.email, COUNT(u.user_id) as user_count
-- FROM advocate_accounts acc
-- JOIN advocate_users u ON acc.account_id = u.account_id
-- GROUP BY acc.email
-- HAVING COUNT(u.user_id) > 1;

-- Recent data quality issues
-- SELECT * FROM data_quality_issues WHERE NOT resolved ORDER BY detected_at DESC LIMIT 20;

-- ============================================================================
-- GRANTS (adjust based on your access control needs)
-- ============================================================================

-- Create roles
-- CREATE ROLE advocacy_readonly;
-- CREATE ROLE advocacy_readwrite;
-- CREATE ROLE advocacy_admin;

-- Grant read-only access
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO advocacy_readonly;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO advocacy_readonly;

-- Grant read-write access
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO advocacy_readwrite;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO advocacy_readwrite;

-- Admin has full access
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO advocacy_admin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO advocacy_admin;

-- ============================================================================
-- SCHEMA CHANGE SUMMARY
-- ============================================================================
--
-- MAJOR CHANGES FROM PREVIOUS VERSION:
--
-- 1. NEW TABLE: advocate_accounts
--    - Stores unique email addresses
--    - One account can have multiple advocate users
--
-- 2. RENAMED: users → advocate_users
--    - Removed 'email' field (moved to advocate_accounts)
--    - Added 'account_id' foreign key to advocate_accounts
--
-- 3. UPDATED: All foreign key references
--    - programs.user_id now references advocate_users(user_id)
--
-- 4. UPDATED: Materialized views
--    - mv_user_engagement now joins advocate_accounts for email
--    - All views reference advocate_users instead of users
--
-- 5. UPDATED: Indexes and triggers
--    - New indexes for advocate_accounts
--    - Renamed indexes for advocate_users
--    - Triggers added for advocate_accounts
--
-- BENEFITS:
-- - Multiple users can share the same email address
-- - Email stored once (no duplication)
-- - Better data normalization
-- - Foundation for account-level features
--
-- ============================================================================
