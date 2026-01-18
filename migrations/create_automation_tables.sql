-- =====================================================
-- MIGRATION: Criar tabelas de Automação
-- Execute este script no Supabase SQL Editor
-- https://supabase.com/dashboard/project/hnyhltxqcsmpwopjfeke/sql
-- =====================================================

-- 1. SCHEDULED_MESSAGES (Disparos Pontuais)
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL,
    category TEXT CHECK (category IN ('holiday', 'meeting', 'payment', 'reminder', 'other')) DEFAULT 'other',
    status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_org ON scheduled_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_client ON scheduled_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_at ON scheduled_messages(scheduled_at);

ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_messages_org_access" ON scheduled_messages
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE profile_id = auth.uid() AND status = 'active'
        )
    );

-- 2. SCHEDULED_REPORTS (Relatórios Automáticos)
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    frequency TEXT CHECK (frequency IN ('weekly', 'monthly', 'custom')) DEFAULT 'weekly',
    weekday INT, -- 0-6 (domingo-sábado)
    day_of_month INT, -- 1-31
    time_of_day TEXT DEFAULT '09:00',
    metrics JSONB DEFAULT '[]',
    template TEXT,
    is_active BOOLEAN DEFAULT true,
    next_run TIMESTAMPTZ,
    last_run TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org ON scheduled_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_client ON scheduled_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run);

ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_reports_org_access" ON scheduled_reports
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE profile_id = auth.uid() AND status = 'active'
        )
    );

-- 3. REPORT_EXECUTIONS (Histórico de execuções)
-- =====================================================
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    executed_at TIMESTAMPTZ DEFAULT now(),
    message_sent TEXT,
    status TEXT CHECK (status IN ('success', 'failed')) DEFAULT 'success',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_executions_report ON report_executions(report_id);

ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_executions_via_report" ON report_executions
    FOR ALL USING (
        report_id IN (
            SELECT id FROM scheduled_reports WHERE organization_id IN (
                SELECT organization_id FROM team_members 
                WHERE profile_id = auth.uid() AND status = 'active'
            )
        )
    );

-- 4. ACTIVE_AUTOMATIONS (Automações com IA)
-- =====================================================
CREATE TABLE IF NOT EXISTS active_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weekdays INT[] DEFAULT '{1,3,5}', -- Array de dias da semana
    time_of_day TEXT DEFAULT '09:00',
    context_days INT DEFAULT 7,
    assigned_approver UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_automations_org ON active_automations(organization_id);
CREATE INDEX IF NOT EXISTS idx_active_automations_client ON active_automations(client_id);
CREATE INDEX IF NOT EXISTS idx_active_automations_active ON active_automations(is_active);

ALTER TABLE active_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_automations_org_access" ON active_automations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM team_members 
            WHERE profile_id = auth.uid() AND status = 'active'
        )
    );

-- 5. ACTIVE_SUGGESTIONS (Sugestões da IA)
-- =====================================================
CREATE TABLE IF NOT EXISTS active_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID REFERENCES active_automations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    suggested_message TEXT NOT NULL,
    context_summary TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'sent')) DEFAULT 'pending',
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_suggestions_automation ON active_suggestions(automation_id);
CREATE INDEX IF NOT EXISTS idx_active_suggestions_client ON active_suggestions(client_id);
CREATE INDEX IF NOT EXISTS idx_active_suggestions_status ON active_suggestions(status);

ALTER TABLE active_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active_suggestions_via_automation" ON active_suggestions
    FOR ALL USING (
        automation_id IN (
            SELECT id FROM active_automations WHERE organization_id IN (
                SELECT organization_id FROM team_members 
                WHERE profile_id = auth.uid() AND status = 'active'
            )
        )
    );

-- 6. TASK_STATUS_REPORTS (Relatórios de mudança de status)
-- =====================================================
CREATE TABLE IF NOT EXISTS task_status_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    completed_items JSONB DEFAULT '[]',
    next_step TEXT,
    ai_message TEXT,
    sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_status_reports_task ON task_status_reports(task_id);

ALTER TABLE task_status_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_status_reports_via_task" ON task_status_reports
    FOR ALL USING (
        task_id IN (
            SELECT id FROM tasks WHERE client_id IN (
                SELECT id FROM clients WHERE organization_id IN (
                    SELECT organization_id FROM team_members 
                    WHERE profile_id = auth.uid() AND status = 'active'
                )
            )
        )
    );

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
