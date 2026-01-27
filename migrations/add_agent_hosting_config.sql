-- Add hosting configuration columns to ai_agents
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o',
ADD COLUMN IF NOT EXISTS temperature FLOAT DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS api_key TEXT; -- Encrypted or plain? For MVP plain/text, recommended vault for prod

-- Add comment explaining usage
COMMENT ON COLUMN ai_agents.model IS 'Model ID (e.g., gpt-4o, claude-3-5-sonnet)';
COMMENT ON COLUMN ai_agents.api_key IS 'API Key for the provider. Should be stored securely.';
