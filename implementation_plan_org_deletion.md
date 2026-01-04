# Plano de Implementação: Exclusão Segura de Organização com Instâncias

Este plano detalha as alterações necessárias para garantir que, ao excluir uma organização no Super Admin, todas as instâncias do WhatsApp associadas também sejam encerradas e excluídas no UAZAPI.

## 1. Configuração de Segredos (Secrets)
Devemos garantir que as seguintes chaves estejam configuradas no Supabase (Edge Functions):
- `UAZAPI_GLOBAL_KEY`: Chave mestre do UAZAPI para exclusão global.
- `ENV_N8N_MANAGER_URL`: URL do webhook do n8n que processa ações de gerenciamento.

## 2. Atualização da Edge Function `whatsapp-proxy-v2`
Modificar a função para:
- Permitir a ação `delete_organization_instances`.
- Validar se o usuário é um **Super Admin** (através da tabela `profiles.is_super_admin`).
- Se for Super Admin, permitir a ação mesmo que ele não seja membro da organização.
- Encaminhar a `UAZAPI_GLOBAL_KEY` no payload para o n8n.

## 3. Atualização do Backend (`lib/supabase-admin.ts`)
- Implementar a função `cleanupOrganizationInstances(orgId)` que invoca o proxy.
- Chamar essa limpeza dentro da função de exclusão de organização.

## 4. Atualização do Frontend (`SuperAdminDashboard.tsx`)
- Nenhuma alteração visual necessária, mas o processo passará a ser mais robusto.
