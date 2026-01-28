-- Add Token and Performance tracking to Messages
ALTER TABLE workers_ia_messages 
ADD COLUMN IF NOT EXISTS token_input INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS token_output INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS token_total INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS response_time_ms INT;

-- Add Funnel and Health tracking to Conversations (Kanban Support)
ALTER TABLE workers_ia_conversations
ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'new_lead', -- For Kanban Columns
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active', -- active, archived, etc.
ADD COLUMN IF NOT EXISTS outcome TEXT, -- scheduled, sold, lost
ADD COLUMN IF NOT EXISTS sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add SLA configuration to Agents
ALTER TABLE workers_ia_agents
ADD COLUMN IF NOT EXISTS sla_threshold_seconds INT DEFAULT 60;
