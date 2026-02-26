-- Migration: Fix Meta Integration Constraints
-- Fixes ON CONFLICT issues in the sync_meta_connection_data function

-- 1. Ensure unique constraints exist for the ON CONFLICT clauses used in the RPC
ALTER TABLE public.meta_connections DROP CONSTRAINT IF EXISTS meta_connections_organization_id_meta_user_id_key;
ALTER TABLE public.meta_connections ADD CONSTRAINT meta_connections_organization_id_meta_user_id_key UNIQUE (organization_id, meta_user_id);

-- Primary keys on TEXT columns (like id for BMs and account_id for Ad Accounts) act as unique constraints,
-- but sometimes PostgreSQL needs them explicitly defined if the ON CONFLICT uses specific columns instead of the PK name.
-- Let's make sure the RPC is using the correct constraint targets.

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
    ON CONFLICT ON CONSTRAINT meta_connections_organization_id_meta_user_id_key DO UPDATE SET
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
