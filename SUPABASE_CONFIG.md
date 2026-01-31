# Supabase Project Configuration

## Project Reference
- **Project ID:** `fhfamquilobeoibqfhwh`
- **Dashboard:** https://supabase.com/dashboard/project/fhfamquilobeoibqfhwh

## Edge Functions
- Deploy command: `npx supabase functions deploy <function-name> --project-ref fhfamquilobeoibqfhwh`

## Secrets Required
- `ENV_N8N_MANAGER_URL`: URL do webhook n8n para gerenciamento de instâncias
- `UAZAPI_GLOBAL_KEY`: Chave mestre do UAZAPI para exclusão global

## Webhooks (n8n)
- Manager: `https://webhook.med4growautomacao.com.br/webhook/v1/instance/manager`
