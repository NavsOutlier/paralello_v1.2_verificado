-- Audit Pro Migration: Add analytical columns to conversations
ALTER TABLE workers_ia_conversations 
ADD COLUMN IF NOT EXISTS loss_reason TEXT,
ADD COLUMN IF NOT EXISTS closing_notes TEXT,
ADD COLUMN IF NOT EXISTS sentiment_history JSONB DEFAULT '[]'::jsonb;

-- Comment on columns for clarity
COMMENT ON COLUMN workers_ia_conversations.loss_reason IS 'Reason why the lead was lost or disqualified';
COMMENT ON COLUMN workers_ia_conversations.closing_notes IS 'Internal supervisor notes about the conversation';
COMMENT ON COLUMN workers_ia_conversations.sentiment_history IS 'Chronological history of sentiment scores in the session';
