-- Add JSONB columns for detailed metrics
ALTER TABLE "ai_agent_metrics" 
ADD COLUMN IF NOT EXISTS "system_metrics" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "evaluator_metrics" JSONB DEFAULT '{}'::jsonb;

-- Comment on columns for clarity
COMMENT ON COLUMN "ai_agent_metrics"."system_metrics" IS 'Armazena métricas sistêmicas detalhadas (tokens cacheados, sla de resposta, contagem de mensagens por ator, etc)';
COMMENT ON COLUMN "ai_agent_metrics"."evaluator_metrics" IS 'Armazena métricas subjetivas avaliadas por LLM (sentimento, resolução, categorização)';
