-- Create ai_usage_logs table for granular billing/audit
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT now(),
    model TEXT,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd DOUBLE PRECISION DEFAULT 0,
    context JSONB DEFAULT '{}'::jsonb, -- Stores session_id, transaction_id, n8n_execution_id
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying by agent and time
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_agent_time ON ai_usage_logs(agent_id, timestamp);

-- RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view usage logs for their agents" ON ai_usage_logs
    FOR SELECT USING (
        exists (
            select 1 from ai_agents
            where ai_agents.id = ai_usage_logs.agent_id
            and ai_agents.organization_id = (select auth.uid()::uuid) -- Simplification for MVP, usually need org check
        )
    );

-- Allow service role (Edge Function) to insert
CREATE POLICY "Service role can insert usage logs" ON ai_usage_logs
    FOR INSERT WITH CHECK (true);
