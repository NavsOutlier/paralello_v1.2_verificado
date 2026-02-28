-- Add data_retention_days column to plan_configurations
ALTER TABLE public.plan_configurations
ADD COLUMN IF NOT EXISTS data_retention_days integer NOT NULL DEFAULT 90;

-- Update existing plans with recommended values
UPDATE public.plan_configurations SET data_retention_days = 90 WHERE id = 'tintim';
UPDATE public.plan_configurations SET data_retention_days = 365 WHERE id = 'enterprise';

COMMENT ON COLUMN public.plan_configurations.data_retention_days IS 'Number of days to retain high-volume data (messages, IA conversations, meta insights, etc). 0 = unlimited.';

-- Function to clean up expired data based on plan retention settings
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org RECORD;
    retention_days integer;
    cutoff_date timestamptz;
    total_deleted jsonb := '{}'::jsonb;
    deleted_count integer;
BEGIN
    FOR org IN
        SELECT
            o.id AS org_id,
            o.plan AS plan_id,
            o.updated_at AS org_updated_at,
            COALESCE(pc.data_retention_days, 90) AS retention_days
        FROM public.organizations o
        LEFT JOIN public.plan_configurations pc ON pc.id = o.plan
        WHERE o.status IS DISTINCT FROM 'deleted'
    LOOP
        IF org.retention_days = 0 THEN
            CONTINUE;
        END IF;

        retention_days := org.retention_days;
        cutoff_date := NOW() - (retention_days || ' days')::interval;

        -- 1. messages
        DELETE FROM public.messages
        WHERE organization_id = org.org_id AND timestamp < cutoff_date;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            total_deleted := total_deleted || jsonb_build_object('messages_' || org.org_id::text, deleted_count);
        END IF;

        -- 2. workers_ia_memory_messages
        DELETE FROM public.workers_ia_memory_messages
        WHERE conversation_id IN (
            SELECT wc.id FROM public.workers_ia_conversations wc
            JOIN public.workers_ia_agents wa ON wa.id = wc.agent_id
            WHERE wa.organization_id = org.org_id
        ) AND created_at < cutoff_date;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            total_deleted := total_deleted || jsonb_build_object('ia_memory_' || org.org_id::text, deleted_count);
        END IF;

        -- 3. workers_ia_conversations (only completed/lost/abandoned)
        DELETE FROM public.workers_ia_conversations
        WHERE agent_id IN (
            SELECT wa.id FROM public.workers_ia_agents wa
            WHERE wa.organization_id = org.org_id
        ) AND created_at < cutoff_date
          AND status IN ('completed', 'lost', 'abandoned');
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            total_deleted := total_deleted || jsonb_build_object('ia_conversations_' || org.org_id::text, deleted_count);
        END IF;

        -- 4. meta_insights
        DELETE FROM public.meta_insights
        WHERE account_id IN (
            SELECT ma.account_id FROM public.meta_ad_accounts ma
            WHERE ma.organization_id = org.org_id
        ) AND date < cutoff_date::date;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            total_deleted := total_deleted || jsonb_build_object('meta_insights_' || org.org_id::text, deleted_count);
        END IF;

        -- 5. notifications (only read ones)
        DELETE FROM public.notifications
        WHERE organization_id = org.org_id AND created_at < cutoff_date AND read = true;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            total_deleted := total_deleted || jsonb_build_object('notifications_' || org.org_id::text, deleted_count);
        END IF;

        -- 6. task_status_reports
        DELETE FROM public.task_status_reports
        WHERE task_id IN (
            SELECT t.id FROM public.tasks t WHERE t.organization_id = org.org_id
        ) AND created_at < cutoff_date;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            total_deleted := total_deleted || jsonb_build_object('task_reports_' || org.org_id::text, deleted_count);
        END IF;

        -- 7. marketing_leads
        DELETE FROM public.marketing_leads
        WHERE organization_id = org.org_id AND created_at < cutoff_date;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            total_deleted := total_deleted || jsonb_build_object('marketing_leads_' || org.org_id::text, deleted_count);
        END IF;

        -- 8. ai_usage_logs
        DELETE FROM public.ai_usage_logs
        WHERE agent_id IN (
            SELECT wa.id FROM public.workers_ia_agents wa
            WHERE wa.organization_id = org.org_id
        ) AND created_at < cutoff_date;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        IF deleted_count > 0 THEN
            total_deleted := total_deleted || jsonb_build_object('ai_logs_' || org.org_id::text, deleted_count);
        END IF;
    END LOOP;

    RETURN total_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_data() IS 'Cleans up expired data based on plan_configurations.data_retention_days. Runs weekly via pg_cron.';

-- NOTE: pg_cron must be enabled and scheduled separately via:
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
-- SELECT cron.schedule('weekly-data-retention-cleanup', '0 3 * * 0', $$SELECT public.cleanup_expired_data();$$);
