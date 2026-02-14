import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    MetaCampaignInsight,
    MetaAdsetInsight,
    MetaAdInsight,
    AggregatedInsight,
    DrillLevel
} from '../types/campaign';

interface UseCampaignInsightsParams {
    organizationId: string | null;
    clientId: string;
    startDate: string;
    endDate: string;
    level: DrillLevel;
    parentCampaignId?: string;
    parentAdsetId?: string;
}

interface UseCampaignInsightsResult {
    data: AggregatedInsight[];
    rawData: any[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useCampaignInsights({
    organizationId,
    clientId,
    startDate,
    endDate,
    level,
    parentCampaignId,
    parentAdsetId,
}: UseCampaignInsightsParams): UseCampaignInsightsResult {
    const [rawData, setRawData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refresh = useCallback(() => setRefreshTrigger(p => p + 1), []);

    useEffect(() => {
        if (!organizationId || !clientId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                if (level === 'campaigns') {
                    const { data, error: err } = await supabase
                        .from('meta_campaign_insights')
                        .select('*')
                        .eq('organization_id', organizationId)
                        .eq('client_id', clientId)
                        .gte('date', startDate)
                        .lte('date', endDate)
                        .order('date', { ascending: true });

                    if (err) throw err;
                    setRawData(data || []);
                } else if (level === 'adsets') {
                    let query = supabase
                        .from('meta_adset_insights')
                        .select('*')
                        .eq('organization_id', organizationId)
                        .eq('client_id', clientId)
                        .gte('date', startDate)
                        .lte('date', endDate);

                    if (parentCampaignId) {
                        query = query.eq('campaign_id', parentCampaignId);
                    }

                    const { data, error: err } = await query.order('date', { ascending: true });
                    if (err) throw err;
                    setRawData(data || []);
                } else if (level === 'ads') {
                    let query = supabase
                        .from('meta_ad_insights')
                        .select('*')
                        .eq('organization_id', organizationId)
                        .eq('client_id', clientId)
                        .gte('date', startDate)
                        .lte('date', endDate);

                    if (parentAdsetId) {
                        query = query.eq('adset_id', parentAdsetId);
                    } else if (parentCampaignId) {
                        query = query.eq('campaign_id', parentCampaignId);
                    }

                    const { data, error: err } = await query.order('date', { ascending: true });
                    if (err) throw err;
                    setRawData(data || []);
                }
            } catch (err: any) {
                console.error('Error fetching campaign insights:', err);
                setError(err.message || 'Erro ao buscar dados');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [organizationId, clientId, startDate, endDate, level, parentCampaignId, parentAdsetId, refreshTrigger]);

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
