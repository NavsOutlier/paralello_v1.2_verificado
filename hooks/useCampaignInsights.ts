import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    AggregatedInsight,
    DrillLevel
} from '../types/campaign';

interface UseCampaignInsightsParams {
    organizationId: string | null;
    clientId: string;
    startDate: string;
    endDate: string;
    level: DrillLevel;
    parentCampaignId?: string; // Mantido para compatibilidade, mas deve ser evitado em novos usos
    parentAdsetId?: string;    // Mantido para compatibilidade
    parentCampaignIds?: string[]; // Novo suporte a array
    parentAdsetIds?: string[];    // Novo suporte a array
}

interface UseCampaignInsightsResult {
    data: AggregatedInsight[];
    rawData: any[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

// ⚠️ MOCK: Set to false when real data is available
const USE_MOCK_DATA = false;

function generateMockData(level: DrillLevel, startDate: string, endDate: string, parentCampaignIds?: string[], parentAdsetIds?: string[]): any[] {
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    const days: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(d.toISOString().split('T')[0]);
    }

    const campaigns = [
        { id: 'camp_001', name: 'Captação Leads - Imóveis SP', objective: 'LEAD_GENERATION', status: 'ACTIVE' },
        { id: 'camp_002', name: 'Remarketing - Visitantes Site', objective: 'CONVERSIONS', status: 'ACTIVE' },
        { id: 'camp_003', name: 'Branding - Lançamento Verão', objective: 'REACH', status: 'ACTIVE' },
        { id: 'camp_004', name: 'Tráfego - Blog Posts', objective: 'LINK_CLICKS', status: 'PAUSED' },
        { id: 'camp_005', name: 'Vendas - Black Friday 2026', objective: 'CONVERSIONS', status: 'ACTIVE' },
        { id: 'camp_006', name: 'Lookalike - Compradores', objective: 'LEAD_GENERATION', status: 'ACTIVE' },
        { id: 'camp_007', name: 'Stories - Promoção Flash', objective: 'REACH', status: 'PAUSED' },
    ];

    const adsetsByCampaign: Record<string, any[]> = {
        camp_001: [
            { id: 'as_001a', name: 'São Paulo Centro 25-45', campaign_id: 'camp_001', campaign_name: 'Captação Leads - Imóveis SP', status: 'ACTIVE' },
            { id: 'as_001b', name: 'Guarulhos 30-55', campaign_id: 'camp_001', campaign_name: 'Captação Leads - Imóveis SP', status: 'ACTIVE' },
            { id: 'as_001c', name: 'ABC Paulista 28-50', campaign_id: 'camp_001', campaign_name: 'Captação Leads - Imóveis SP', status: 'PAUSED' },
        ],
        camp_002: [
            { id: 'as_002a', name: 'Visitantes 7 dias', campaign_id: 'camp_002', campaign_name: 'Remarketing - Visitantes Site', status: 'ACTIVE' },
            { id: 'as_002b', name: 'Carrinho Abandonado', campaign_id: 'camp_002', campaign_name: 'Remarketing - Visitantes Site', status: 'ACTIVE' },
        ],
        camp_003: [
            { id: 'as_003a', name: 'Mulheres 18-35 Brasil', campaign_id: 'camp_003', campaign_name: 'Branding - Lançamento Verão', status: 'ACTIVE' },
            { id: 'as_003b', name: 'Homens 25-45 Sudeste', campaign_id: 'camp_003', campaign_name: 'Branding - Lançamento Verão', status: 'ACTIVE' },
        ],
        camp_004: [
            { id: 'as_004a', name: 'Interesse: Marketing Digital', campaign_id: 'camp_004', campaign_name: 'Tráfego - Blog Posts', status: 'PAUSED' },
        ],
        camp_005: [
            { id: 'as_005a', name: 'Compradores Top 10%', campaign_id: 'camp_005', campaign_name: 'Vendas - Black Friday 2026', status: 'ACTIVE' },
            { id: 'as_005b', name: 'Engajados Redes Sociais', campaign_id: 'camp_005', campaign_name: 'Vendas - Black Friday 2026', status: 'ACTIVE' },
            { id: 'as_005c', name: 'Newsletter Abridores', campaign_id: 'camp_005', campaign_name: 'Vendas - Black Friday 2026', status: 'ACTIVE' },
        ],
        camp_006: [
            { id: 'as_006a', name: 'Lookalike 1% Compradores', campaign_id: 'camp_006', campaign_name: 'Lookalike - Compradores', status: 'ACTIVE' },
            { id: 'as_006b', name: 'Lookalike 3% Leads', campaign_id: 'camp_006', campaign_name: 'Lookalike - Compradores', status: 'ACTIVE' },
        ],
        camp_007: [
            { id: 'as_007a', name: 'Stories Feed 18-30', campaign_id: 'camp_007', campaign_name: 'Stories - Promoção Flash', status: 'PAUSED' },
        ],
    };

    const adsByAdset: Record<string, any[]> = {
        as_001a: [
            { id: 'ad_001a1', name: 'Carrossel Apartamentos Luxo', adset_id: 'as_001a', adset_name: 'São Paulo Centro 25-45', campaign_id: 'camp_001', campaign_name: 'Captação Leads - Imóveis SP', status: 'ACTIVE' },
            { id: 'ad_001a2', name: 'Vídeo Tour Virtual 360°', adset_id: 'as_001a', adset_name: 'São Paulo Centro 25-45', campaign_id: 'camp_001', campaign_name: 'Captação Leads - Imóveis SP', status: 'ACTIVE' },
            { id: 'ad_001a3', name: 'Imagem Planta Baixa Premium', adset_id: 'as_001a', adset_name: 'São Paulo Centro 25-45', campaign_id: 'camp_001', campaign_name: 'Captação Leads - Imóveis SP', status: 'PAUSED' },
        ],
        as_001b: [
            { id: 'ad_001b1', name: 'Single Image - Casa Térrea', adset_id: 'as_001b', adset_name: 'Guarulhos 30-55', campaign_id: 'camp_001', campaign_name: 'Captação Leads - Imóveis SP', status: 'ACTIVE' },
            { id: 'ad_001b2', name: 'Vídeo Depoimento Cliente', adset_id: 'as_001b', adset_name: 'Guarulhos 30-55', campaign_id: 'camp_001', campaign_name: 'Captação Leads - Imóveis SP', status: 'ACTIVE' },
        ],
        as_001c: [
            { id: 'ad_001c1', name: 'Foto Fachada Noturna', adset_id: 'as_001c', adset_name: 'ABC Paulista 28-50', campaign_id: 'camp_001', campaign_name: 'Captação Leads - Imóveis SP', status: 'PAUSED' }
        ],
        as_002a: [
            { id: 'ad_002a1', name: 'DPA - Produtos Visitados', adset_id: 'as_002a', adset_name: 'Visitantes 7 dias', campaign_id: 'camp_002', campaign_name: 'Remarketing - Visitantes Site', status: 'ACTIVE' },
            { id: 'ad_002a2', name: 'Cupom 15% OFF Retorno', adset_id: 'as_002a', adset_name: 'Visitantes 7 dias', campaign_id: 'camp_002', campaign_name: 'Remarketing - Visitantes Site', status: 'ACTIVE' },
        ],
        as_002b: [
            { id: 'ad_002b1', name: 'Urgência - Últimas Unidades', adset_id: 'as_002b', adset_name: 'Carrinho Abandonado', campaign_id: 'camp_002', campaign_name: 'Remarketing - Visitantes Site', status: 'ACTIVE' },
        ],
        as_003a: [
            { id: 'ad_003a1', name: 'Vídeo Lifestyle Verão v1', adset_id: 'as_003a', adset_name: 'Mulheres 18-35 Brasil', campaign_id: 'camp_003', campaign_name: 'Branding - Lançamento Verão', status: 'ACTIVE' },
            { id: 'ad_003a2', name: 'Vídeo Lifestyle Verão v2', adset_id: 'as_003a', adset_name: 'Mulheres 18-35 Brasil', campaign_id: 'camp_003', campaign_name: 'Branding - Lançamento Verão', status: 'ACTIVE' },
        ],
        as_003b: [
            { id: 'ad_003b1', name: 'Foto Produto Hero', adset_id: 'as_003b', adset_name: 'Homens 25-45 Sudeste', campaign_id: 'camp_003', campaign_name: 'Branding - Lançamento Verão', status: 'ACTIVE' },
        ],
        as_004a: [
            { id: 'ad_004a1', name: 'Post Blog: 5 Dicas', adset_id: 'as_004a', adset_name: 'Interesse: Marketing Digital', campaign_id: 'camp_004', campaign_name: 'Tráfego - Blog Posts', status: 'PAUSED' },
            { id: 'ad_004a2', name: 'Post Blog: Tendências 2026', adset_id: 'as_004a', adset_name: 'Interesse: Marketing Digital', campaign_id: 'camp_004', campaign_name: 'Tráfego - Blog Posts', status: 'PAUSED' },
        ],
        as_005a: [
            { id: 'ad_005a1', name: 'Black Friday - 50% OFF', adset_id: 'as_005a', adset_name: 'Compradores Top 10%', campaign_id: 'camp_005', campaign_name: 'Vendas - Black Friday 2026', status: 'ACTIVE' },
            { id: 'ad_005a2', name: 'Countdown Timer BF', adset_id: 'as_005a', adset_name: 'Compradores Top 10%', campaign_id: 'camp_005', campaign_name: 'Vendas - Black Friday 2026', status: 'ACTIVE' },
        ],
        as_005b: [
            { id: 'ad_005b1', name: 'Carrossel Produtos BF', adset_id: 'as_005b', adset_name: 'Engajados Redes Sociais', campaign_id: 'camp_005', campaign_name: 'Vendas - Black Friday 2026', status: 'ACTIVE' },
        ],
        as_005c: [
            { id: 'ad_005c1', name: 'Email MKT - Oferta Exclusiva', adset_id: 'as_005c', adset_name: 'Newsletter Abridores', campaign_id: 'camp_005', campaign_name: 'Vendas - Black Friday 2026', status: 'ACTIVE' },
        ],
        as_006a: [
            { id: 'ad_006a1', name: 'Imagem Estilo de Vida', adset_id: 'as_006a', adset_name: 'Lookalike 1% Compradores', campaign_id: 'camp_006', campaign_name: 'Lookalike - Compradores', status: 'ACTIVE' },
        ],
        as_006b: [
            { id: 'ad_006b1', name: 'Vídeo Depoimento Curto', adset_id: 'as_006b', adset_name: 'Lookalike 3% Leads', campaign_id: 'camp_006', campaign_name: 'Lookalike - Compradores', status: 'ACTIVE' },
        ],
        as_007a: [
            { id: 'ad_007a1', name: 'Story Enquete', adset_id: 'as_007a', adset_name: 'Stories Feed 18-30', campaign_id: 'camp_007', campaign_name: 'Stories - Promoção Flash', status: 'PAUSED' },
            { id: 'ad_007a2', name: 'Story Link Sticker', adset_id: 'as_007a', adset_name: 'Stories Feed 18-30', campaign_id: 'camp_007', campaign_name: 'Stories - Promoção Flash', status: 'PAUSED' },
        ],
    };

    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randFloat = (min: number, max: number) => +(Math.random() * (max - min) + min).toFixed(2);

    if (level === 'campaigns') {
        const rows: any[] = [];
        for (const camp of campaigns) {
            const spendBase = camp.status === 'ACTIVE' ? rand(80, 350) : rand(0, 20);
            for (const date of days) {
                const impressions = rand(1000, 25000);
                const reach = Math.floor(impressions * randFloat(0.6, 0.85));
                const clicks = rand(30, Math.floor(impressions * 0.05));
                const link_clicks = Math.floor(clicks * randFloat(0.5, 0.8));
                const spend = randFloat(spendBase * 0.7, spendBase * 1.3);
                const leads = rand(0, Math.floor(clicks * 0.15));
                const conversions = rand(0, Math.max(1, Math.floor(leads * 0.4)));
                const revenue = conversions * randFloat(150, 800);
                rows.push({
                    campaign_id: camp.id, campaign_name: camp.name, objective: camp.objective, status: camp.status,
                    date, impressions, reach, clicks, link_clicks, spend, leads, conversions, revenue,
                    frequency: randFloat(1.1, 3.5),
                });
            }
        }
        return rows;
    }

    if (level === 'adsets') {
        const rows: any[] = [];
        let targetAdsets: any[] = [];

        // Check if filtering by campaign IDs
        if (parentCampaignIds && parentCampaignIds.length > 0) {
            targetAdsets = parentCampaignIds.flatMap(cid => adsetsByCampaign[cid] || []);
        } else {
            // No filter = show all
            targetAdsets = Object.values(adsetsByCampaign).flat();
        }

        for (const adset of targetAdsets) {
            for (const date of days) {
                const impressions = rand(400, 8000);
                const reach = Math.floor(impressions * randFloat(0.6, 0.85));
                const clicks = rand(10, Math.floor(impressions * 0.04));
                const link_clicks = Math.floor(clicks * randFloat(0.5, 0.8));
                const spend = randFloat(20, 120);
                const leads = rand(0, Math.floor(clicks * 0.12));
                const conversions = rand(0, Math.max(1, Math.floor(leads * 0.3)));
                const revenue = conversions * randFloat(150, 600);
                rows.push({
                    adset_id: adset.id, adset_name: adset.name,
                    campaign_id: adset.campaign_id, campaign_name: adset.campaign_name,
                    status: adset.status, date, impressions, reach, clicks, link_clicks,
                    spend, leads, conversions, revenue, frequency: randFloat(1.1, 2.8),
                });
            }
        }
        return rows;
    }

    if (level === 'ads') {
        const rows: any[] = [];
        let targetAds: any[] = [];

        if (parentAdsetIds && parentAdsetIds.length > 0) {
            // Filter by specific Adsets
            targetAds = parentAdsetIds.flatMap(aid => adsByAdset[aid] || []);
        } else if (parentCampaignIds && parentCampaignIds.length > 0) {
            // Filter by selected Campaigns -> get their Adsets -> get Ads
            const adsets = parentCampaignIds.flatMap(cid => adsetsByCampaign[cid] || []);
            targetAds = adsets.flatMap(as => adsByAdset[as.id] || []);
        } else {
            // No filter = show all
            targetAds = Object.values(adsByAdset).flat();
        }

        // Mock Fallback: if user selected something but mock has no ads for it, generate dummy
        if (targetAds.length === 0 && (parentCampaignIds?.length || parentAdsetIds?.length)) {
            // Optional: Create dynamic mock ads so the table isn't empty on drill-down of mock items
            // For now, leaving empty to simulate "no ads found"
        }

        for (const ad of targetAds) {
            for (const date of days) {
                const impressions = rand(200, 4000);
                const reach = Math.floor(impressions * randFloat(0.65, 0.9));
                const clicks = rand(5, Math.floor(impressions * 0.035));
                const link_clicks = Math.floor(clicks * randFloat(0.5, 0.75));
                const spend = randFloat(8, 60);
                const leads = rand(0, Math.floor(clicks * 0.1));
                const conversions = rand(0, Math.max(1, Math.floor(leads * 0.25)));
                const revenue = conversions * randFloat(100, 500);
                rows.push({
                    ad_id: ad.id, ad_name: ad.name,
                    adset_id: ad.adset_id, adset_name: ad.adset_name,
                    campaign_id: ad.campaign_id, campaign_name: ad.campaign_name,
                    status: ad.status, date, impressions, reach, clicks, link_clicks,
                    spend, leads, conversions, revenue, frequency: randFloat(1.0, 2.2),
                });
            }
        }
        return rows;
    }

    return [];
}

export function useCampaignInsights({
    organizationId,
    clientId,
    startDate,
    endDate,
    level,
    parentCampaignId,
    parentAdsetId,
    parentCampaignIds,
    parentAdsetIds,
}: UseCampaignInsightsParams): UseCampaignInsightsResult {
    const [rawData, setRawData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refresh = useCallback(() => setRefreshTrigger(p => p + 1), []);

    // Resolve effective IDs (combine single legacy prop with new array prop)
    const effectiveCampaignIds = useMemo(() => {
        const ids = new Set<string>();
        if (parentCampaignId) ids.add(parentCampaignId);
        if (parentCampaignIds) parentCampaignIds.forEach(id => ids.add(id));
        return Array.from(ids);
    }, [parentCampaignId, parentCampaignIds]);

    const effectiveAdsetIds = useMemo(() => {
        const ids = new Set<string>();
        if (parentAdsetId) ids.add(parentAdsetId);
        if (parentAdsetIds) parentAdsetIds.forEach(id => ids.add(id));
        return Array.from(ids);
    }, [parentAdsetId, parentAdsetIds]);

    useEffect(() => {
        if (!organizationId || !clientId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // REAL SUPABASE DATA integration
                // 1. Get Ad Account ID for the client
                const { data: integrations, error: intError } = await supabase
                    .from('client_integrations')
                    .select('customer_code, config')
                    .eq('client_id', clientId)
                    .eq('provider', 'meta')
                    .eq('is_active', true)
                    .maybeSingle();

                if (intError) throw intError;
                if (!integrations) {
                    setRawData([]);
                    setLoading(false);
                    return;
                }

                const adAccountId = integrations.customer_code;
                if (!adAccountId) {
                    setRawData([]);
                    setLoading(false);
                    return;
                }

                // 2. Query meta_insights with structural joins
                // We always query with the same join structure to ensure we have all metadata
                // regardless of the level we are viewing.
                let query = supabase
                    .from('meta_insights')
                    .select(`
                        *,
                        meta_ads (
                            name,
                            status,
                            meta_ad_sets (
                                name,
                                status,
                                meta_campaigns (
                                    name,
                                    status,
                                    objective
                                )
                            )
                        )
                    `)
                    .eq('account_id', adAccountId)
                    .gte('date', startDate)
                    .lte('date', endDate);

                // Apply drill-down filters if present
                if (level === 'adsets' && effectiveCampaignIds.length > 0) {
                    query = query.in('campaign_id', effectiveCampaignIds);
                } else if (level === 'ads') {
                    if (effectiveAdsetIds.length > 0) {
                        query = query.in('adset_id', effectiveAdsetIds);
                    } else if (effectiveCampaignIds.length > 0) {
                        query = query.in('campaign_id', effectiveCampaignIds);
                    }
                }

                const { data: insights, error: fetchErr } = await query.order('date', { ascending: true });
                if (fetchErr) throw fetchErr;

                // 3. Flatten the joined data to maintain compatibility with the UI's expected format
                const flattenedData = (insights || []).map(row => {
                    const ad = row.meta_ads as any;
                    const adset = ad?.meta_ad_sets as any;
                    const campaign = adset?.meta_campaigns as any;

                    // Support extraction from actions JSONB (leads, conversions, etc.)
                    const actions = Array.isArray(row.actions) ? row.actions : [];
                    const actionValues = Array.isArray(row.action_values) ? row.action_values : [];

                    const leads = actions.find((a: any) => a.action_type === 'lead')?.value || 0;
                    const purchaseConversions = actions.find((a: any) =>
                        ['purchase', 'offsite_conversion.fb_pixel_purchase'].includes(a.action_type)
                    )?.value || 0;

                    const revenue = actionValues.find((a: any) =>
                        ['purchase', 'offsite_conversion.fb_pixel_purchase'].includes(a.action_type)
                    )?.value || 0;

                    return {
                        ...row,
                        leads: Number(leads),
                        conversions: Number(purchaseConversions),
                        revenue: Number(revenue),
                        ad_name: ad?.name || 'Anúncio sem nome',
                        ad_status: ad?.status,
                        adset_name: adset?.name || 'Conjunto sem nome',
                        adset_status: adset?.status,
                        campaign_name: campaign?.name || 'Campanha sem nome',
                        campaign_status: campaign?.status,
                        objective: campaign?.objective,
                        frequency: row.impressions > 0 && row.reach > 0 ? Number(row.impressions) / Number(row.reach) : 0,
                        // Ensure status is mapped to the current level for the generic UI
                        status: level === 'campaigns' ? campaign?.status
                            : level === 'adsets' ? adset?.status
                                : ad?.status
                    };
                });

                setRawData(flattenedData);
            } catch (err: any) {
                console.error('Error fetching campaign insights:', err);
                setError(err.message || 'Erro ao buscar dados');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [organizationId, clientId, startDate, endDate, level, effectiveCampaignIds, effectiveAdsetIds, refreshTrigger]);

    const data = useMemo<AggregatedInsight[]>(() => {
        if (!rawData.length) return [];

        const groupKey = level === 'campaigns' ? 'campaign_id'
            : level === 'adsets' ? 'adset_id'
                : 'ad_id';

        const nameKey = level === 'campaigns' ? 'campaign_name'
            : level === 'adsets' ? 'adset_name'
                : 'ad_name';

        const grouped: Record<string, any[]> = rawData.reduce((acc: Record<string, any[]>, row: any) => {
            const key = row[groupKey];
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {} as Record<string, any[]>);

        return Object.entries(grouped).map(([id, rows]: [string, any[]]) => {
            const first = rows[0];
            return {
                id,
                name: first[nameKey] || id,
                objective: first.objective,
                status: first.status,
                campaign_id: first.campaign_id,
                campaign_name: first.campaign_name,
                adset_id: first.adset_id,
                adset_name: first.adset_name,
                impressions: rows.reduce((s: number, r: any) => s + (r.impressions || 0), 0),
                reach: rows.reduce((s: number, r: any) => s + (r.reach || 0), 0),
                clicks: rows.reduce((s: number, r: any) => s + (r.clicks || 0), 0),
                link_clicks: rows.reduce((s: number, r: any) => s + (r.link_clicks || 0), 0),
                spend: rows.reduce((s: number, r: any) => s + (parseFloat(r.spend) || 0), 0),
                leads: rows.reduce((s: number, r: any) => s + (r.leads || 0), 0),
                conversions: rows.reduce((s: number, r: any) => s + (r.conversions || 0), 0),
                revenue: rows.reduce((s: number, r: any) => s + (parseFloat(r.revenue) || 0), 0),
                frequency: rows.reduce((s: number, r: any) => s + (parseFloat(r.frequency) || 0), 0) / rows.length,
            };
        }).sort((a, b) => b.spend - a.spend);
    }, [rawData, level]);

    return { data, rawData, loading, error, refresh };
}
