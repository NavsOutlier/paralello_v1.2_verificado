-- RESTORE SECURITY & TRIGGERS
-- Created at: 2026-02-16 21:00:00
-- Description: Re-applies RLS policies and Triggers lost during database reset.

-- 1. Enable Extension for Automatic Updated At
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- 2. Create Trigger Function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply Trigger to ALL Tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name != 'schema_migrations'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS handle_updated_at ON %I', t);
        EXECUTE format('CREATE TRIGGER handle_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE handle_updated_at()', t);
    END LOOP;
END;
$$;

-- 4. BASE TABLES RLS (Standard SaaS Pattern)
-- ==========================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid()) 
        OR owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );

-- Team Members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view members of their organization" ON team_members
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );

-- Clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view clients in their organization" ON clients
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );
CREATE POLICY "Users can manage clients in their organization" ON clients
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );

-- Tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tasks in their organization" ON tasks
    FOR SELECT USING (
        client_id IN (
            SELECT id FROM clients WHERE organization_id IN (
                SELECT organization_id FROM team_members WHERE profile_id = auth.uid()
            )
        )
    );
CREATE POLICY "Users can manage tasks in their organization" ON tasks
    FOR ALL USING (
        client_id IN (
            SELECT id FROM clients WHERE organization_id IN (
                SELECT organization_id FROM team_members WHERE profile_id = auth.uid()
            )
        )
    );

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in their organization" ON messages
    FOR SELECT USING (
        client_id IN (
            SELECT id FROM clients WHERE organization_id IN (
                SELECT organization_id FROM team_members WHERE profile_id = auth.uid()
            )
        )
    );
CREATE POLICY "Users can send messages in their organization" ON messages
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT id FROM clients WHERE organization_id IN (
                SELECT organization_id FROM team_members WHERE profile_id = auth.uid()
            )
        )
    );

-- 5. MODULES RLS (Restored from Backups)
-- ======================================

-- AI Usage Logs (From backup)
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
-- (Policies were dependent on ai_agents table which was renamed to workers_ia_agents, skipping strictly for now to avoid errors if table missing)

-- Automation Tables (From create_automation_tables.sql backup)
-- Scheduled Messages
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_messages_org_access" ON scheduled_messages
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );

-- Scheduled Reports
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_reports_org_access" ON scheduled_reports
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );

-- Active Automations
ALTER TABLE active_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active_automations_org_access" ON active_automations
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );

-- Active Suggestions
ALTER TABLE active_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active_suggestions_via_automation" ON active_suggestions
    FOR ALL USING (
        automation_id IN (
            SELECT id FROM active_automations WHERE organization_id IN (
                SELECT organization_id FROM team_members WHERE profile_id = auth.uid()
            )
        )
    );

-- Workers/AI Agents (From normalization_migration.sql)
ALTER TABLE workers_ia_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view agents in their organization" ON workers_ia_agents
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );
CREATE POLICY "Users can manage agents in their organization" ON workers_ia_agents
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );

-- Subscriptions & Billing (New Base RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view subscriptions in their organization" ON subscriptions
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view invoices in their organization" ON invoices
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM team_members WHERE profile_id = auth.uid())
    );

-- 6. Seed Essential Data (Optional - Uncomment if needed)
-- INSERT INTO system_settings (key, value) VALUES ('app_version', '"1.2.0"');
