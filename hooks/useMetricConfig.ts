import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MetricDisplayConfig, EntityType, DEFAULT_VISIBLE_METRICS } from '../types/campaign';

interface UseMetricConfigParams {
    organizationId: string | null;
    clientId: string;
    entityType: EntityType;
    entityId?: string;
}

interface UseMetricConfigResult {
    visibleMetrics: string[];
    loading: boolean;
    saveConfig: (metrics: string[]) => Promise<void>;
}

export function useMetricConfig({
    organizationId,
    clientId,
    entityType,
    entityId,
}: UseMetricConfigParams): UseMetricConfigResult {
    const [visibleMetrics, setVisibleMetrics] = useState<string[]>(DEFAULT_VISIBLE_METRICS);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!organizationId || !clientId) return;

        const fetchConfig = async () => {
            setLoading(true);
            const resolvedEntityId = entityId || '__default__';

            const { data, error } = await supabase
                .from('metric_display_config')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('client_id', clientId)
                .eq('entity_type', entityType)
                .eq('entity_id', resolvedEntityId)
                .maybeSingle();

            if (data?.visible_metrics) {
                setVisibleMetrics(data.visible_metrics);
            } else {
                setVisibleMetrics(DEFAULT_VISIBLE_METRICS);
            }
            setLoading(false);
        };

        fetchConfig();
    }, [organizationId, clientId, entityType, entityId]);

    const saveConfig = useCallback(async (metrics: string[]) => {
        if (!organizationId || !clientId) return;

        const resolvedEntityId = entityId || '__default__';

        const { error } = await supabase
            .from('metric_display_config')
            .upsert({
                organization_id: organizationId,
                client_id: clientId,
                entity_type: entityType,
                entity_id: resolvedEntityId,
                visible_metrics: metrics,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'organization_id,client_id,entity_type,entity_id',
            });

        if (error) {
            console.error('Error saving metric config:', error);
            throw error;
        }

        setVisibleMetrics(metrics);
    }, [organizationId, clientId, entityType, entityId]);

    return { visibleMetrics, loading, saveConfig };
}
