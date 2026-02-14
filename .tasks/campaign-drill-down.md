# Campaign Drill-Down — MetricFlow

## Objetivo
Adicionar visualização hierárquica no MetricFlow:
**Canal → Campanha → Conjunto de Anúncio → Anúncio**

Com suporte a Dashboard + Tabela em cada nível, métricas personalizáveis por cliente/campanha/conjunto.

---

## Fases

### Phase 1: Database Schema ✅
- [x] `meta_campaign_insights` — Dados de campanha Meta
- [x] `meta_adset_insights` — Dados de conjunto Meta
- [x] `meta_ad_insights` — Dados de anúncio Meta
- [x] `google_campaign_insights` — Dados de campanha Google
- [x] `metric_display_config` — Config de métricas salvas por entidade/cliente
- [x] RLS policies
- [x] Indexes para performance

### Phase 2: TypeScript Types & Hooks ✅
- [x] Types para todas as novas tabelas (`types/campaign.ts`)
- [x] `useCampaignInsights` hook — Fetch de dados por nível
- [x] `useMetricConfig` hook — CRUD de configuração de métricas

### Phase 3: Componentes Frontend ✅
- [x] `CampaignExplorer.tsx` — Componente principal com breadcrumb + navegação + dash + tabela (unificado)
- [x] `MetricSelector.tsx` — Modal para personalizar métricas visíveis

### Phase 4: Integração com MarketingDashboard ✅
- [x] Adicionar view mode "Campanhas" no toggle (Dash | Tabela | Campanhas)
- [x] Integrar CampaignExplorer dentro do MarketingDashboard

---

## Arquitetura de Dados

```
n8n → Supabase Node → meta_campaign_insights (UPSERT por client_id + campaign_id + date)
                    → meta_adset_insights (UPSERT por client_id + adset_id + date)
                    → meta_ad_insights (UPSERT por client_id + ad_id + date)
```

### Métricas Disponíveis
| Métrica | Key | Tipo |
|---------|-----|------|
| Impressões | impressions | integer |
| Alcance | reach | integer |
| Cliques | clicks | integer |
| Cliques no Link | link_clicks | integer |
| Gasto | spend | numeric |
| Leads | leads | integer |
| Conversões | conversions | integer |
| Receita | revenue | numeric |
| Frequência | frequency | numeric |
| CPL | cpl | computed |
| CPC | cpc | computed |
| CTR | ctr | computed |
| Taxa de Conversão | conversion_rate | computed |

### Métricas Customizáveis
Cada cliente pode ter config diferente de quais métricas exibir por nível.
Config salva em `metric_display_config` por (organization_id, client_id, entity_type, entity_id).

---

## Estrutura de Arquivos

```
components/
  marketing/
    CampaignExplorer.tsx       # Navegação + breadcrumb
    CampaignDashView.tsx       # Dashboard por nível
    CampaignTableView.tsx      # Tabela por nível
    MetricSelector.tsx         # Configurador de métricas
types/
  campaign.ts                  # Types
hooks/
  useCampaignInsights.ts       # Data fetching
  useMetricConfig.ts           # Metric config CRUD
```
