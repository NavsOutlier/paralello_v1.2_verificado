-- SQL Migration: MetricFlow Views (Otimização Pull Granular)
-- Arquitetura: v_meta_campaign_insights, v_meta_adset_insights, v_meta_ad_insights

-- Drop existing views if they exist to allow recreation
DROP VIEW IF EXISTS public.v_meta_ad_insights CASCADE;
DROP VIEW IF EXISTS public.v_meta_adset_insights CASCADE;
DROP VIEW IF EXISTS public.v_meta_campaign_insights CASCADE;

-- 1. View: v_meta_ad_insights
-- A view base (Nível do Anúncio). Aqui cruzamos métricas diárias com dados ricos das tabelas pai.
CREATE VIEW public.v_meta_ad_insights AS
SELECT
    mi.ad_id,
    mi.date,
    a.name AS ad_name,
    a.status AS ad_status,
    a.creative AS ad_creative,
    
    -- Subida nível Conjunto
    a.adset_id,
    ads.name AS adset_name,
    ads.status AS adset_status,
    
    -- Subida Nível Campanha
    ads.campaign_id,
    c.name AS campaign_name,
    c.objective AS objective,
    c.status AS campaign_status,
    
    -- Subida Nível Conta/Cliente
    c.account_id,
    acc.organization_id,
    (SELECT client_id FROM public.tintim_config LIMIT 1) as client_id, -- Simplificação para herdar de integrações ou conta

    -- Métricas (Direto da meta_insights)
    COALESCE(mi.spend, 0) AS spend,
    COALESCE(mi.impressions, 0) AS impressions,
    COALESCE(mi.clicks, 0) AS clicks,
    COALESCE(mi.reach, 0) AS reach,
    0 AS link_clicks, -- Meta insight JSON parse se aplicavel no actions
    0 AS leads, -- Tratativa de JSON actions se necessário
    0 AS conversions,
    0 AS revenue,
    (CASE WHEN COALESCE(mi.reach, 0) > 0 THEN COALESCE(mi.impressions, 0) / mi.reach ELSE 1 END) as frequency
    
FROM public.meta_insights mi
LEFT JOIN public.meta_ads a ON mi.ad_id = a.ad_id
LEFT JOIN public.meta_ad_sets ads ON a.adset_id = ads.adset_id
LEFT JOIN public.meta_campaigns c ON ads.campaign_id = c.campaign_id
LEFT JOIN public.meta_ad_accounts acc ON c.account_id = acc.account_id;


-- 2. View: v_meta_adset_insights
-- Agregação diária por Conjunto de Anúncios
CREATE VIEW public.v_meta_adset_insights AS
SELECT
    v.adset_id,
    v.date,
    v.adset_name,
    v.adset_status as status,
    v.campaign_id,
    v.campaign_name,
    v.objective,
    v.account_id,
    v.organization_id,
    v.client_id,
    
    SUM(v.spend) AS spend,
    SUM(v.impressions) AS impressions,
    SUM(v.clicks) AS clicks,
    SUM(v.reach) AS reach,
    SUM(v.link_clicks) AS link_clicks,
    SUM(v.leads) AS leads,
    SUM(v.conversions) AS conversions,
    SUM(v.revenue) AS revenue,
    (CASE WHEN SUM(v.reach) > 0 THEN SUM(v.impressions) / SUM(v.reach) ELSE 1 END) as frequency
FROM public.v_meta_ad_insights v
GROUP BY 
    v.adset_id, v.date, v.adset_name, v.adset_status, v.campaign_id, 
    v.campaign_name, v.objective, v.account_id, v.organization_id, v.client_id;


-- 3. View: v_meta_campaign_insights
-- Agregação diária por Campanha (O painel default do Dashboard)
CREATE VIEW public.v_meta_campaign_insights AS
SELECT
    v.campaign_id,
    v.date,
    v.campaign_name,
    v.campaign_status as status,
    v.objective,
    v.account_id,
    v.organization_id,
    v.client_id,
    
    SUM(v.spend) AS spend,
    SUM(v.impressions) AS impressions,
    SUM(v.clicks) AS clicks,
    SUM(v.reach) AS reach,
    SUM(v.link_clicks) AS link_clicks,
    SUM(v.leads) AS leads,
    SUM(v.conversions) AS conversions,
    SUM(v.revenue) AS revenue,
    (CASE WHEN SUM(v.reach) > 0 THEN SUM(v.impressions) / SUM(v.reach) ELSE 1 END) as frequency
FROM public.v_meta_ad_insights v
GROUP BY 
    v.campaign_id, v.date, v.campaign_name, v.campaign_status, v.objective, 
    v.account_id, v.organization_id, v.client_id;

-- Permissões RLS de Leitura (Herdadas da tabela base pelas policies de DB_OWNER)
GRANT SELECT ON public.v_meta_ad_insights TO authenticated;
GRANT SELECT ON public.v_meta_adset_insights TO authenticated;
GRANT SELECT ON public.v_meta_campaign_insights TO authenticated;
