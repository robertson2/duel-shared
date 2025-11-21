-- ============================================================================
-- DROP SCHEMA SCRIPT
-- ============================================================================
-- This script drops all existing tables and data
-- To run: psql -U postgres -d advocacy_platform -f schema/drop_schema.sql
-- ============================================================================

-- Dropping all tables and data...

-- Drop existing schema and recreate empty
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Schema dropped successfully!
-- All tables, views, functions, and data have been removed.
--
-- To create new schema, run:
--   psql -U postgres -d advocacy_platform -f schema/schema.sql





