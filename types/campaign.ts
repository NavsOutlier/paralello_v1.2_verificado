// ==========================================
// Campaign Insights Types
// ==========================================

export interface MetaCampaignInsight {
    id: string;
    organization_id: string;
    client_id: string;
    campaign_id: string;
    campaign_name: string;
    objective?: string;
    status?: string;
    date: string;
    impressions: number;
    reach: number;
    clicks: number;
    link_clicks: number;
    spend: number;
    leads: number;
    conversions: number;
    revenue: number;
    frequency: number;
    actions?: any[];
    extra_metrics?: Record<string, any>;
    source: 'api' | 'manual';
    created_at: string;
    updated_at: string;
}

export interface MetaAdsetInsight {
    id: string;
    organization_id: string;
    client_id: string;
    campaign_id: string;
    campaign_name?: string;
    adset_id: string;
    adset_name: string;
    status?: string;
    date: string;
    impressions: number;
    reach: number;
    clicks: number;
    link_clicks: number;
    spend: number;
    leads: number;
    conversions: number;
    revenue: number;
    frequency: number;
    actions?: any[];
    extra_metrics?: Record<string, any>;
    source: 'api' | 'manual';
    created_at: string;
    updated_at: string;
}

export interface MetaAdInsight {
    id: string;
    organization_id: string;
    client_id: string;
    campaign_id: string;
    campaign_name?: string;
    adset_id: string;
    adset_name?: string;
    ad_id: string;
    ad_name: string;
    status?: string;
    date: string;
    impressions: number;
    reach: number;
    clicks: number;
    link_clicks: number;
    spend: number;
    leads: number;
    conversions: number;
    revenue: number;
    frequency: number;
    ad_creative_id?: string;
    thumbnail_url?: string;
    actions?: any[];
    extra_metrics?: Record<string, any>;
    source: 'api' | 'manual';
    created_at: string;
    updated_at: string;
}

export interface GoogleCampaignInsight {
    id: string;
    organization_id: string;
    client_id: string;
    campaign_id: string;
    campaign_name: string;
    campaign_type?: string;
    status?: string;
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    revenue: number;
    extra_metrics?: Record<string, any>;
    source: 'api' | 'manual';
    created_at: string;
    updated_at: string;
}

// ==========================================
// Metric Configuration Types
// ==========================================

export type EntityType = 'general' | 'campaign' | 'adset' | 'ad';

export interface MetricDisplayConfig {
    id: string;
    organization_id: string;
    client_id: string;
    entity_type: EntityType;
    entity_id: string;
    visible_metrics: string[];
    created_at: string;
    updated_at: string;
}

// ==========================================
// Metric Definitions
// ==========================================

export interface MetricDefinition {
    key: string;
    label: string;
    shortLabel: string;
    type: 'number' | 'currency' | 'percent';
    computed?: boolean;
    compute?: (row: AggregatedInsight) => number;
    icon?: string;
    color?: string;
}

export const AVAILABLE_METRICS: MetricDefinition[] = [
    { key: 'impressions', label: 'Impressões', shortLabel: 'Impr.', type: 'number', color: 'text-blue-400' },
    { key: 'reach', label: 'Alcance', shortLabel: 'Alc.', type: 'number', color: 'text-sky-400' },
    { key: 'clicks', label: 'Cliques', shortLabel: 'Cliq.', type: 'number', color: 'text-amber-400' },
    { key: 'link_clicks', label: 'Cliques no Link', shortLabel: 'Link', type: 'number', color: 'text-orange-400' },
    { key: 'spend', label: 'Gasto', shortLabel: 'Gasto', type: 'currency', color: 'text-red-400' },
    { key: 'leads', label: 'Leads', shortLabel: 'Leads', type: 'number', color: 'text-indigo-400' },
    { key: 'conversions', label: 'Conversões', shortLabel: 'Conv.', type: 'number', color: 'text-emerald-400' },
    { key: 'revenue', label: 'Receita', shortLabel: 'Rec.', type: 'currency', color: 'text-green-400' },
    { key: 'frequency', label: 'Frequência', shortLabel: 'Freq.', type: 'number', color: 'text-slate-400' },
    {
        key: 'cpl', label: 'CPL', shortLabel: 'CPL', type: 'currency', computed: true,
        compute: (r) => r.leads > 0 ? r.spend / r.leads : 0, color: 'text-cyan-400'
    },
    {
        key: 'cpc', label: 'CPC', shortLabel: 'CPC', type: 'currency', computed: true,
        compute: (r) => r.clicks > 0 ? r.spend / r.clicks : 0, color: 'text-teal-400'
    },
    {
        key: 'ctr', label: 'CTR', shortLabel: 'CTR', type: 'percent', computed: true,
        compute: (r) => r.impressions > 0 ? r.clicks / r.impressions : 0, color: 'text-yellow-400'
    },
    {
        key: 'conversion_rate', label: 'Taxa de Conversão', shortLabel: 'Tx Conv.', type: 'percent', computed: true,
        compute: (r) => r.leads > 0 ? r.conversions / r.leads : 0, color: 'text-emerald-400'
    },
];

export const DEFAULT_VISIBLE_METRICS = ['impressions', 'clicks', 'spend', 'leads', 'conversions', 'revenue', 'cpl', 'ctr'];

// ==========================================
// Aggregated Types (for display)
// ==========================================

export interface AggregatedInsight {
    id: string;
    name: string;
    objective?: string;
    status?: string;
    impressions: number;
    reach: number;
    clicks: number;
    link_clicks: number;
    spend: number;
    leads: number;
    conversions: number;
    revenue: number;
    frequency: number;
    [key: string]: any;
}

export type DrillLevel = 'campaigns' | 'adsets' | 'ads';

export interface BreadcrumbItem {
    level: DrillLevel;
    label: string;
    id?: string;
}
