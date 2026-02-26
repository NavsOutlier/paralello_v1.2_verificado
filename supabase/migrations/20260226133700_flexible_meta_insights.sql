-- Migration: Make insights table more flexible for account/campaign level data
-- Created at: 2026-02-26

-- 1. Make campaign_id, adset_id, and ad_id nullable
ALTER TABLE public.meta_insights 
    ALTER COLUMN campaign_id DROP NOT NULL,
    ALTER COLUMN adset_id DROP NOT NULL,
    ALTER COLUMN ad_id DROP NOT NULL;

-- 2. Drop the existing Primary Key (ad_id, date)
ALTER TABLE public.meta_insights DROP CONSTRAINT IF EXISTS meta_insights_pkey;

-- 3. Add a new surrogate Primary Key
ALTER TABLE public.meta_insights ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- 4. Create a unique constraint that handles NULLs correctly for UPSERT operations
-- We use a unique index on COALESCE values so PostgreSQL can enforce uniqueness even when ad_id is NULL.
-- For standard ON CONFLICT (id) or ON CONFLICT (unique_index) to work seamlessly with Supabase Upsert, 
-- we will create a true UNIQUE constraint by upgrading the table definition. 
-- However, PostgreSQL UNIQUE constraints don't natively support COALESCE directly in the CONSTRAINT definition.
-- So we use a Unique Index.

CREATE UNIQUE INDEX IF NOT EXISTS meta_insights_granularity_date_idx ON public.meta_insights 
(
  COALESCE(ad_id, ''), 
  COALESCE(adset_id, ''), 
  COALESCE(campaign_id, ''), 
  date
);

-- Note: When doing an upsert (ON CONFLICT) from n8n or Supabase Client, 
-- you will need to specify the conflict target if you want to update on this specific index,
-- OR simply delete the old rows for the date and insert new ones.
-- The RPC `sync_meta_connection_data` doesn't handle meta_insights directly, so standard UPSERTs 
-- from n8n will need to handle this.

