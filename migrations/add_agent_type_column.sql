-- Add agent_type column for Persona-Driven Analytics
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'sdr';

-- Add comment explaining options
COMMENT ON COLUMN ai_agents.agent_type IS 'Persona type: sdr, scheduler, support, custom';
