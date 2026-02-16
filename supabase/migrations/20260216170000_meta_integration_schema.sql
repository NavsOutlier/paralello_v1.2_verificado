-- Migration: Meta Integration Schema
-- Created at: 2026-02-16

-- 1. Meta Connections (User Level)
CREATE TABLE IF NOT EXISTS public.meta_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    meta_user_id TEXT NOT NULL,
    meta_user_name TEXT,
    email TEXT,
    picture_url TEXT,
    access_token TEXT, -- Encrypted or plain? Assuming plain for now, as Supabase logic/n8n handles it.
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Constraint: One active connection per meta_user_id per organization?
    UNIQUE(organization_id, meta_user_id)
);

-- RLS for meta_connections
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view connections in their organization" ON public.meta_connections
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert/update connections in their organization" ON public.meta_connections
    FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- 2. Meta Business Managers
CREATE TABLE IF NOT EXISTS public.meta_business_managers (
    id TEXT PRIMARY KEY, -- Meta BM ID
    name TEXT NOT NULL,
    connection_id UUID REFERENCES public.meta_connections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for meta_business_managers
ALTER TABLE public.meta_business_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view BMs in their organization" ON public.meta_business_managers
    FOR SELECT USING (
        connection_id IN (
            SELECT id FROM public.meta_connections 
            WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );
    
CREATE POLICY "Users can manage BMs in their organization" ON public.meta_business_managers
    FOR ALL USING (
        connection_id IN (
            SELECT id FROM public.meta_connections 
            WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        )
    );


-- 3. Meta Ad Accounts
CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
    account_id TEXT PRIMARY KEY, -- Meta Ad Account ID (e.g. act_123)
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- Denormalized for easier RLS
    name TEXT NOT NULL,
    currency TEXT,
    timezone TEXT,
    connection_id UUID REFERENCES public.meta_connections(id) ON DELETE CASCADE,
    business_manager_id TEXT REFERENCES public.meta_business_managers(id),
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for meta_ad_accounts
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view Ad Accounts in their organization" ON public.meta_ad_accounts
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage Ad Accounts in their organization" ON public.meta_ad_accounts
    FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- 4. RPC Function to Sync Data
-- This function takes the JSON payload from n8n (via frontend) and updates all tables atomically.
CREATE OR REPLACE FUNCTION sync_meta_connection_data(
    p_organization_id UUID,
    p_meta_user_id TEXT,
    p_meta_user_name TEXT,
    p_access_token TEXT,
    p_token_expires_in INT, -- seconds
    p_bms JSONB, -- Array of {id, name}
    p_ad_accounts JSONB -- Array of {id, name, currency, timezone, bm_id, status}
) RETURNS JSONB AS $$
DECLARE
    v_connection_id UUID;
    v_bm RECORD;
    v_account RECORD;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Calculate Expiry
    IF p_token_expires_in IS NOT NULL THEN
        v_expires_at := now() + (p_token_expires_in || ' seconds')::INTERVAL;
    ELSE
        v_expires_at := NULL;
    END IF;

    -- 2. Upsert Connection
    INSERT INTO public.meta_connections (
        organization_id, meta_user_id, meta_user_name, access_token, token_expires_at, updated_at
    ) VALUES (
        p_organization_id, p_meta_user_id, p_meta_user_name, p_access_token, v_expires_at, now()
    )
    ON CONFLICT (organization_id, meta_user_id) DO UPDATE SET
        meta_user_name = EXCLUDED.meta_user_name,
        access_token = EXCLUDED.access_token,
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = now()
    RETURNING id INTO v_connection_id;

    -- 3. Upsert BMs
    IF p_bms IS NOT NULL AND jsonb_array_length(p_bms) > 0 THEN
        FOR v_bm IN SELECT * FROM jsonb_to_recordset(p_bms) AS x(id text, name text)
        LOOP
            INSERT INTO public.meta_business_managers (id, name, connection_id, updated_at)
            VALUES (v_bm.id, v_bm.name, v_connection_id, now())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                connection_id = EXCLUDED.connection_id, -- Update connection owner if changed
                updated_at = now();
        END LOOP;
    END IF;

    -- 4. Upsert Ad Accounts
    IF p_ad_accounts IS NOT NULL AND jsonb_array_length(p_ad_accounts) > 0 THEN
        FOR v_account IN SELECT * FROM jsonb_to_recordset(p_ad_accounts) 
                         AS x(id text, name text, currency text, timezone text, bm_id text, status text)
        LOOP
            INSERT INTO public.meta_ad_accounts (
                account_id, organization_id, name, currency, timezone, connection_id, business_manager_id, status, updated_at
            )
            VALUES (
                v_account.id, p_organization_id, v_account.name, v_account.currency, v_account.timezone, v_connection_id, v_account.bm_id, v_account.status, now()
            )
            ON CONFLICT (account_id) DO UPDATE SET
                name = EXCLUDED.name,
                currency = EXCLUDED.currency,
                timezone = EXCLUDED.timezone,
                connection_id = EXCLUDED.connection_id,
                business_manager_id = EXCLUDED.business_manager_id,
                status = EXCLUDED.status,
                updated_at = now();
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'connection_id', v_connection_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
