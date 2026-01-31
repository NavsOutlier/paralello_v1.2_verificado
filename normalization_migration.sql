-- Normalization Migration: JSONB to Relational Funnel Stages

-- 1. Create the new dedicated table for funnel stages
CREATE TABLE IF NOT EXISTS workers_ia_funnel_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES workers_ia_agents(id) ON DELETE CASCADE,
    stage_key TEXT NOT NULL, -- e.g., 'new_lead'
    label TEXT NOT NULL,
    color TEXT,
    bg TEXT,
    border TEXT,
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id, stage_key)
);

-- 2. Populate the table from existing JSONB data in workers_ia_agents
-- This script extracts the array items and inserts them as rows
INSERT INTO workers_ia_funnel_stages (agent_id, stage_key, label, color, bg, border, position)
SELECT 
    id as agent_id,
    (stage->>'id') as stage_key,
    (stage->>'label') as label,
    (stage->>'color') as color,
    (stage->>'bg') as bg,
    (stage->>'border') as border,
    ordinality - 1 as position -- Use 0-based index for position
FROM workers_ia_agents,
jsonb_array_elements(funnel_config) WITH ORDINALITY AS stage
ON CONFLICT (agent_id, stage_key) DO UPDATE SET
    label = EXCLUDED.label,
    color = EXCLUDED.color,
    bg = EXCLUDED.bg,
    border = EXCLUDED.border,
    position = EXCLUDED.position;

-- 3. (Optional) You can keep the funnel_config column for backup, 
-- or drop it once you verify the migration:
-- ALTER TABLE workers_ia_agents DROP COLUMN funnel_config;

-- 4. Enable RLS for the new table
ALTER TABLE workers_ia_funnel_stages ENABLE ROW LEVEL SECURITY;

-- 5. Add policies (Adjust based on your organization_id structure)
-- Assuming we want to allow access based on organization_id in workers_ia_agents
CREATE POLICY "Users can view stages for their agents"
ON workers_ia_funnel_stages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workers_ia_agents 
        WHERE id = workers_ia_funnel_stages.agent_id
    )
);

CREATE POLICY "Users can manage stages for their agents"
ON workers_ia_funnel_stages FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM workers_ia_agents 
        WHERE id = workers_ia_funnel_stages.agent_id
    )
);
