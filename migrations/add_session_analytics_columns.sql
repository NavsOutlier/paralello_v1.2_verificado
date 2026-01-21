
-- Migration: Add session-level analytics to ai_conversations
-- Framework Lesson 2: Individual conversation monitoring

ALTER TABLE ai_conversations 
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
ADD COLUMN IF NOT EXISTS sentiment_score FLOAT, -- 0 to 1
ADD COLUMN IF NOT EXISTS session_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS resolution_reason TEXT;

-- Index for analytics performance
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment ON ai_conversations(sentiment);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_date ON ai_conversations(agent_id, last_interaction_at);
