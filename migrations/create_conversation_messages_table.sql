
-- Migration: Create ai_conversation_messages table
-- Purpose: Store detailed chat logs for AI Agent auditing

CREATE TABLE IF NOT EXISTS ai_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast log retrieval
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ai_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON ai_conversation_messages(created_at);
