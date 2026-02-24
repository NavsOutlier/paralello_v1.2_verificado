-- SQL Migration: Limpeza das Tabelas Antigas (Substituídas pelas novas Views)
-- Como refatoramos o MetricFlow na Fase 4 (Pull Granular), essas tabelas físicas e estáticas 
-- perdem a utilidade, pois o n8n não as alimentará mais. Os cálculos passam a vir direto das Views V_META...

-- O uso do CASCADE garante que qualquer referência secundária a essas tabelas morra junto.
DROP TABLE IF EXISTS public.meta_campaign_insights CASCADE;
DROP TABLE IF EXISTS public.meta_adset_insights CASCADE;
DROP TABLE IF EXISTS public.meta_ad_insights CASCADE;
