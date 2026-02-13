-- Restore Essential System Settings
-- If keys already exist, it will NOT overwrite values, only insert if missing.

INSERT INTO "public"."system_settings" ("key", "value", "description") 
VALUES 
    ('evolution_api_url', '', 'URL base da API do Evolution (UAZAPI)'),
    ('evolution_api_key', '', 'Chave Global (Master Key) da Evolution API'),
    ('tintim_webhook_base_url', '', 'URL base para webhooks do Tintim'),
    ('n8n_webhook_url', '', 'URL base para automações n8n (opcional)'),
    ('openai_api_key', '', 'Chave da API OpenAI para inteligência artificial')
ON CONFLICT ("key") DO NOTHING;
