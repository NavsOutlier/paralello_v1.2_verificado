import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    ChevronRight, ChevronDown, LayoutDashboard, Table, Settings2,
    Target, Layers, FileImage, TrendingUp,
    BarChart3, Search, Loader2, AlertCircle, Filter, CalendarCheck
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '../../lib/supabase'; // Direct import for batch fetching
import { useCampaignInsights } from '../../hooks/useCampaignInsights';
import { MetricSelector } from './MetricSelector';
import {
    DrillLevel, BreadcrumbItem, AggregatedInsight,
    AVAILABLE_METRICS, MetricDefinition, EntityType,
    DEFAULT_VISIBLE_METRICS
} from '../../types/campaign';

type Granularity = 'day' | 'week' | 'month';

interface CampaignExplorerProps {
    organizationId: string | null;
    clientId: string;
    startDate: string;
    endDate: string;
    granularity: Granularity;
}

const LEVEL_CONFIG: Record<DrillLevel, { label: string; icon: React.ElementType; entityType: EntityType }> = {
    campaigns: { label: 'Campanhas', icon: Target, entityType: 'campaign' },
    adsets: { label: 'Conjuntos', icon: Layers, entityType: 'adset' },
    ads: { label: 'Anúncios', icon: FileImage, entityType: 'ad' },
};

const CHART_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#f97316'];

const TABLE_METRICS: { key: string; label: string; type: 'number' | 'currency' | 'percent'; compute?: (row: any) => number }[] = [
    { key: 'impressions', label: 'Impressões', type: 'number' },
    { key: 'clicks', label: 'Cliques', type: 'number' },
    { key: 'spend', label: 'Gasto', type: 'currency' },
    { key: 'leads', label: 'Leads', type: 'number' },
    { key: 'cpl', label: 'CPL', type: 'currency', compute: (r) => r.leads > 0 ? r.spend / r.leads : 0 },
    { key: 'conversions', label: 'Conversões', type: 'number' },
    { key: 'revenue', label: 'Receita', type: 'currency' },
    { key: 'ctr', label: 'CTR', type: 'percent', compute: (r) => r.impressions > 0 ? r.clicks / r.impressions : 0 },
];

export const CampaignExplorer: React.FC<CampaignExplorerProps> = ({
    organizationId,
    clientId,
    startDate,
    endDate,
    granularity,
}) => {
    // ========== Navigation State ==========
    const [level, setLevel] = useState<DrillLevel>('campaigns');
    const [viewMode, setViewMode] = useState<'dashboard' | 'table'>('table');
    const [searchQuery, setSearchQuery] = useState('');

    // Accordion state: which items have metrics expanded
    const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());

    // ========== Metrics Configuration State ==========
    const [metricConfigs, setMetricConfigs] = useState<Record<string, string[]>>({});
    const [loadingConfigs, setLoadingConfigs] = useState(false);
    const [configuringEntityId, setConfiguringEntityId] = useState<string | null>(null); // ID of entity being configured (null = global)
    const [isMetricSelectorOpen, setIsMetricSelectorOpen] = useState(false);

    // ========== Multi-Level Selection State ==========
    const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
    const [selectedAdsetIds, setSelectedAdsetIds] = useState<Set<string>>(new Set());
    const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());

    // Helper to get current selection set based on level
    const currentSelection = level === 'campaigns' ? selectedCampaignIds
        : level === 'adsets' ? selectedAdsetIds
            : selectedAdIds;

    const setCurrentSelection = (newSet: Set<string>) => {
        if (level === 'campaigns') setSelectedCampaignIds(newSet);
        else if (level === 'adsets') setSelectedAdsetIds(newSet);
        else setSelectedAdIds(newSet);
    };

    // ========== Data Fetching ==========
    const parentCampaignIds = useMemo(() => Array.from(selectedCampaignIds), [selectedCampaignIds]);
    const parentAdsetIds = useMemo(() => Array.from(selectedAdsetIds), [selectedAdsetIds]);

    const { data, rawData, loading, error } = useCampaignInsights({
        organizationId,
        clientId,
        startDate,
        endDate,
        level,
        parentCampaignIds: level !== 'campaigns' ? parentCampaignIds : undefined,
        parentAdsetIds: level === 'ads' ? parentAdsetIds : undefined,
    });

    // ========== Batch Metric Config Loading ==========
    useEffect(() => {
        if (!organizationId || !clientId) return;

        const loadConfigs = async () => {
            setLoadingConfigs(true);
            const { data: configs, error } = await supabase
                .from('metric_display_config')
                .select('entity_id, visible_metrics')
                .eq('organization_id', organizationId)
                .eq('client_id', clientId)
                .eq('entity_type', LEVEL_CONFIG[level].entityType);

            if (configs) {
                const map: Record<string, string[]> = {};
                configs.forEach(c => {
                    if (c.entity_id) map[c.entity_id] = c.visible_metrics;
                });
                setMetricConfigs(map);
            }
            setLoadingConfigs(false);
        };

        loadConfigs();
    }, [organizationId, clientId, level]);

    // ========== Metric Config Handlers ==========
    const handleOpenConfig = (entityId: string | null = null) => {
        setConfiguringEntityId(entityId);
        setIsMetricSelectorOpen(true);
    };

    const handleSaveConfig = async (metrics: string[]) => {
        const entityId = configuringEntityId || '__default__';

        // Optimistic Update
        setMetricConfigs(prev => ({ ...prev, [entityId]: metrics }));

        await supabase
            .from('metric_display_config')
            .upsert({
                organization_id: organizationId,
                client_id: clientId,
                entity_type: LEVEL_CONFIG[level].entityType,
                entity_id: entityId,
                visible_metrics: metrics,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'organization_id,client_id,entity_type,entity_id',
            });

        setIsMetricSelectorOpen(false);
    };

    // Helper to get active metrics for a specific entity (or default)
    const getActiveMetricsFor = (entityId: string) => {
        const keys = metricConfigs[entityId] || metricConfigs['__default__'] || DEFAULT_VISIBLE_METRICS;
        return keys.map(key => AVAILABLE_METRICS.find(m => m.key === key)).filter(Boolean) as MetricDefinition[];
    };

    // Default metrics for dashboard view
    const defaultMetrics = getActiveMetricsFor('__default__');

    // ========== Filtering ==========
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data;
        const q = searchQuery.toLowerCase();
        return data.filter(item => item.name.toLowerCase().includes(q));
    }, [data, searchQuery]);

    // ========== Handlers ==========
    const toggleSelection = (id: string) => {
        setCurrentSelection(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllSelection = () => {
        if (currentSelection.size === filteredData.length) {
            setCurrentSelection(new Set());
        } else {
            setCurrentSelection(new Set(filteredData.map(d => d.id)));
        }
    };

    const handleTabChange = (newLevel: DrillLevel) => {
        setLevel(newLevel);
        setSearchQuery('');
        setExpandedMetrics(new Set());
    };

    const handleDrillDown = (item: AggregatedInsight) => {
        if (level === 'campaigns') {
            setSelectedCampaignIds(new Set([item.id]));
            setLevel('adsets');
            setSelectedAdsetIds(new Set());
        } else if (level === 'adsets') {
            setSelectedAdsetIds(new Set([item.id]));
            setLevel('ads');
            setSelectedAdIds(new Set());
        }
    };

    // ========== Period Logic (Same as before) ==========
    const periods = useMemo(() => {
        const start = new Date(startDate + 'T12:00:00');
        const end = new Date(endDate + 'T12:00:00');
        const result: { label: string; key: string; endKey?: string }[] = [];
        let current = new Date(start);
        let loops = 0;
        const getKey = (d: Date) => d.toISOString().split('T')[0];

        while (current <= end && loops < 100) {
            let label = '';
            const key = getKey(current);
            const nextDate = new Date(current);

            if (granularity === 'day') {
                label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                nextDate.setDate(current.getDate() + 1);
            } else if (granularity === 'week') {
                const weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const actualEnd = weekEnd > end ? end : weekEnd;
                label = `${current.getDate()}/${current.getMonth() + 1} - ${actualEnd.getDate()}/${actualEnd.getMonth() + 1}`;
                nextDate.setDate(current.getDate() + 7);
            } else {
                label = current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                nextDate.setMonth(current.getMonth() + 1);
                nextDate.setDate(1);
            }
            const endKeyDate = new Date(nextDate);
            endKeyDate.setDate(endKeyDate.getDate() - 1);
            result.push({ label, key, endKey: getKey(endKeyDate) });
            current = nextDate;
            loops++;
        }
        return result;
    }, [startDate, endDate, granularity]);

    const entityIdKey = level === 'campaigns' ? 'campaign_id' : level === 'adsets' ? 'adset_id' : 'ad_id';

    const periodData = useMemo(() => {
        const map: Record<string, Record<string, { impressions: number; clicks: number; spend: number; leads: number; conversions: number; revenue: number }>> = {};
        for (const row of rawData) {
            const eId = row[entityIdKey];
            if (!map[eId]) map[eId] = {};
            for (const p of periods) {
                const rowDate = row.date;
                let matches = false;
                if (granularity === 'day') matches = rowDate === p.key;
                else if (granularity === 'month') matches = rowDate.startsWith(p.key.slice(0, 7));
                else matches = rowDate >= p.key && (p.endKey ? rowDate <= p.endKey : true);
                if (matches) {
                    if (!map[eId][p.key]) map[eId][p.key] = { impressions: 0, clicks: 0, spend: 0, leads: 0, conversions: 0, revenue: 0 };
                    map[eId][p.key].impressions += row.impressions || 0;
                    map[eId][p.key].clicks += row.clicks || 0;
                    map[eId][p.key].spend += parseFloat(row.spend) || 0;
                    map[eId][p.key].leads += row.leads || 0;
                    map[eId][p.key].conversions += row.conversions || 0;
                    map[eId][p.key].revenue += parseFloat(row.revenue) || 0;
                }
            }
        }
        return map;
    }, [rawData, periods, granularity, entityIdKey]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatPercent = (val: number) => (val * 100).toFixed(2) + '%';
    const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(Math.round(val));

    const formatMetricVal = (val: number, type: string) => {
        if (type === 'currency') return formatCurrency(val);
        if (type === 'percent') return formatPercent(val);
        return formatNumber(val);
    };

    const getMetricValue = (item: AggregatedInsight, metric: MetricDefinition): number => {
        if (metric.computed && metric.compute) return metric.compute(item);
        return (item as any)[metric.key] || 0;
    };

    const formatCompact = (value: number): string => {
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
        return value.toFixed(0);
    };

    const toggleMetrics = (id: string) => {
        setExpandedMetrics(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const LevelIcon = LEVEL_CONFIG[level].icon;

    const totals = useMemo<AggregatedInsight>(() => {
        const base: AggregatedInsight = {
            id: 'total', name: 'Total',
            impressions: 0, reach: 0, clicks: 0, link_clicks: 0,
            spend: 0, leads: 0, conversions: 0, revenue: 0, frequency: 0,
        };
        for (const row of data) {
            base.impressions += row.impressions;
            base.reach += row.reach;
            base.clicks += row.clicks;
            base.link_clicks += row.link_clicks;
            base.spend += row.spend;
            base.leads += row.leads;
            base.conversions += row.conversions;
            base.revenue += row.revenue;
        }
        if (data.length > 0) base.frequency = base.impressions > 0 ? base.impressions / base.reach : 0;
        return base;
    }, [data]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Sub-header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-6 md:px-8 py-4 bg-white/[0.01] border-b border-white/5">
                {viewMode === 'table' ? (
                    <div className="flex items-center gap-1 bg-slate-950/50 p-1.5 rounded-xl border border-white/5">
                        {(Object.keys(LEVEL_CONFIG) as DrillLevel[]).map((tabLevel) => {
                            const TabIcon = LEVEL_CONFIG[tabLevel].icon;
                            const isActive = level === tabLevel;
                            return (
                                <button
                                    key={tabLevel}
                                    onClick={() => handleTabChange(tabLevel)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${isActive
                                        ? 'bg-slate-700 text-white shadow-lg border border-white/10'
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : ''}`} />
                                    {LEVEL_CONFIG[tabLevel].label}
                                    {isActive && (
                                        <span className="bg-slate-900/50 text-slate-300 px-1.5 py-0.5 rounded text-[9px] min-w-[20px] text-center">
                                            {filteredData.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : <div />}

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar..."
                            className="pl-8 pr-3 py-2 text-xs bg-slate-950/50 border border-white/5 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30 w-full md:w-48 transition-all"
                        />
                    </div>
                    <div className="bg-slate-950/50 p-1 rounded-lg border border-white/5 flex items-center">
                        <button
                            onClick={() => setViewMode('dashboard')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'dashboard'
                                ? 'bg-slate-700 text-white shadow-sm border border-white/10'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <LayoutDashboard className="w-3 h-3" />
                            Dash
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'table'
                                ? 'bg-slate-700 text-white shadow-sm border border-white/10'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <Table className="w-3 h-3" />
                            Tabela
                        </button>
                    </div>
                    {/* Global Config Button (Default) */}
                    <button
                        onClick={() => handleOpenConfig(null)}
                        className="p-2 bg-slate-950/50 border border-white/5 rounded-lg hover:bg-white/5 hover:border-cyan-500/20 transition-all text-slate-500 hover:text-cyan-400"
                        title="Configurar métricas padrão"
                    >
                        <Settings2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            {viewMode === 'table' && ((selectedCampaignIds.size > 0 && level !== 'campaigns') || (selectedAdsetIds.size > 0 && level === 'ads')) ? (
                <div className="px-6 md:px-8 py-2 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                    <Filter className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">
                        Filtrando por:
                        {selectedCampaignIds.size > 0 && level !== 'campaigns' && <span className="text-white ml-1">{selectedCampaignIds.size} campanhas</span>}
                        {selectedAdsetIds.size > 0 && level === 'ads' && <span className="text-white ml-1"> + {selectedAdsetIds.size} conjuntos</span>}
                    </span>
                    <div className="flex-1" />
                    <button
                        onClick={() => {
                            setSelectedCampaignIds(new Set());
                            setSelectedAdsetIds(new Set());
                            setSelectedAdIds(new Set());
                            setLevel('campaigns');
                        }}
                        className="text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest flex items-center gap-1"
                    >
                        Limpar Filtros <XAxis className="w-3 h-3" />
                    </button>
                </div>
            ) : null}

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-sm font-black text-slate-400">Sem dados encontrados.</p>
                    </div>
                ) : viewMode === 'dashboard' ? (
                    /* ======== DASHBOARD VIEW ======== */
                    <div className="space-y-6 p-4 md:p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            {defaultMetrics.slice(0, 8).map(metric => {
                                const value = getMetricValue(totals, metric);
                                return (
                                    <div key={metric.key} className="relative bg-slate-900/40 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/5 shadow-xl">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{metric.label}</p>
                                        <h3 className={`text-lg md:text-xl font-black ${metric.color}`}>{formatMetricVal(value, metric.type)}</h3>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-3 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">Listagem</h4>
                                <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                                    {filteredData.map(item => {
                                        const itemMetrics = getActiveMetricsFor(item.id);
                                        return (
                                            <button key={item.id} onClick={() => handleDrillDown(item)} className="w-full text-left bg-slate-900/60 border border-white/5 rounded-xl p-4 transition-all hover:bg-slate-900/80">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-sm font-bold text-white truncate">{item.name}</span>
                                                    {level !== 'ads' && <ChevronRight className="w-4 h-4 text-slate-600" />}
                                                </div>
                                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                    {itemMetrics.slice(0, 6).map(metric => (
                                                        <div key={metric.key}>
                                                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{metric.shortLabel}</p>
                                                            <p className={`text-xs font-black ${metric.color}`}>{formatMetricVal(getMetricValue(item, metric), metric.type)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ======== TABLE VIEW ======== */
                    <div className="p-4 md:p-6">
                        <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 shadow-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse select-none" style={{ minWidth: '100%' }}>
                                    <thead>
                                        <tr className="bg-[#0b101b] border-b border-white/5">
                                            <th className="sticky left-0 z-20 bg-[#0b101b] py-5 px-5 text-left min-w-[30px] border-r border-white/5">
                                                <input type="checkbox" onChange={toggleAllSelection} checked={filteredData.length > 0 && currentSelection.size === filteredData.length} className="rounded border-slate-600 bg-slate-800 text-cyan-500" />
                                            </th>
                                            <th className="sticky left-[45px] z-20 bg-[#0b101b] py-5 px-5 text-left font-black text-[9px] uppercase tracking-[0.3em] text-cyan-500/80 min-w-[260px] border-r border-white/5">
                                                {LEVEL_CONFIG[level].label}
                                            </th>
                                            {periods.map(p => (
                                                <th key={p.key} className="py-5 px-5 text-center font-black text-[9px] text-slate-400 uppercase tracking-[0.2em] min-w-[140px] border-l border-white/5">{p.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map(item => {
                                            const itemMetrics = getActiveMetricsFor(item.id);
                                            return (
                                                <React.Fragment key={item.id}>
                                                    <tr className={`border-b border-white/5 transition-colors ${currentSelection.has(item.id) ? 'bg-cyan-900/10' : 'bg-white/[0.02]'}`}>
                                                        <td className="sticky left-0 z-10 bg-[#0b101b] py-3.5 px-5 border-r border-white/5">
                                                            <input type="checkbox" checked={currentSelection.has(item.id)} onChange={() => toggleSelection(item.id)} className="rounded border-slate-600 bg-slate-800 text-cyan-500" />
                                                        </td>
                                                        <td className="sticky left-[45px] z-10 bg-[#0b101b] py-3.5 px-5 border-r border-white/5">
                                                            <div className="flex items-center gap-2.5">
                                                                <button onClick={() => toggleMetrics(item.id)} className="p-0.5 hover:bg-white/5 rounded transition-colors flex-shrink-0">
                                                                    {expandedMetrics.has(item.id) ? <ChevronDown className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                                                                </button>

                                                                {/* Edit Metrics Button - ADDED */}
                                                                <button
                                                                    onClick={() => handleOpenConfig(item.id)}
                                                                    className="p-1 hover:bg-white/10 rounded transition-colors text-slate-600 hover:text-cyan-400"
                                                                    title={`Personalizar métricas para: ${item.name}`}
                                                                >
                                                                    <Settings2 className="w-3 h-3" />
                                                                </button>

                                                                <LevelIcon className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status === 'ACTIVE' ? 'bg-emerald-400' : item.status === 'PAUSED' ? 'bg-amber-400' : 'bg-slate-600'}`} />

                                                                {level !== 'ads' ? (
                                                                    <button onClick={() => handleDrillDown(item)} className="text-xs font-bold text-white hover:text-cyan-300 truncate max-w-[180px] text-left transition-colors" title={item.name}>
                                                                        {item.name}
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-white truncate max-w-[180px]" title={item.name}>{item.name}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {periods.map(p => {
                                                            const pd = periodData[item.id]?.[p.key];
                                                            return <td key={p.key} className="py-3.5 px-4 text-center text-xs font-bold text-slate-300 whitespace-nowrap border-l border-white/5">{pd ? formatCurrency(pd.spend) : '—'}</td>;
                                                        })}
                                                    </tr>
                                                    {expandedMetrics.has(item.id) && itemMetrics.map(metric => (
                                                        <tr key={`${item.id}_${metric.key}`} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                                            <td className="sticky left-0 bg-[#0b101b] z-10 border-r border-white/5"></td>
                                                            <td className="sticky left-[45px] bg-[#0b101b] z-10 py-2.5 px-5 border-r border-white/5">
                                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] pl-8">{metric.label}</span>
                                                            </td>
                                                            {periods.map(p => {
                                                                const pd = periodData[item.id]?.[p.key];
                                                                let val = 0;
                                                                if (pd) {
                                                                    if (metric.compute) val = metric.compute(pd);
                                                                    else val = (pd as any)[metric.key] || 0;
                                                                }
                                                                return (
                                                                    <td key={p.key} className="py-2.5 px-4 text-center text-xs font-medium text-slate-400 whitespace-nowrap border-l border-white/[0.03]">
                                                                        {val === 0 ? <span className="text-slate-700">—</span> : formatMetricVal(val, metric.type)}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <MetricSelector
                isOpen={isMetricSelectorOpen}
                onClose={() => setIsMetricSelectorOpen(false)}
                visibleMetrics={metricConfigs[configuringEntityId || '__default__'] || metricConfigs['__default__'] || DEFAULT_VISIBLE_METRICS}
                onSave={handleSaveConfig}
                entityLabel={configuringEntityId ? 'Item Específico' : LEVEL_CONFIG[level].label}
            />
        </div>
    );
};
