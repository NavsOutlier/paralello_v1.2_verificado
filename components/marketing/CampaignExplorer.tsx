import React, { useState, useMemo } from 'react';
import {
    ChevronRight, LayoutDashboard, Table, Settings2, ArrowLeft,
    Target, Layers, FileImage, TrendingUp, TrendingDown, Minus,
    BarChart3, Eye, Search, Loader2, AlertCircle
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { useCampaignInsights } from '../../hooks/useCampaignInsights';
import { useMetricConfig } from '../../hooks/useMetricConfig';
import { MetricSelector } from './MetricSelector';
import {
    DrillLevel, BreadcrumbItem, AggregatedInsight,
    AVAILABLE_METRICS, MetricDefinition, EntityType
} from '../../types/campaign';

interface CampaignExplorerProps {
    organizationId: string | null;
    clientId: string;
    startDate: string;
    endDate: string;
}

const LEVEL_CONFIG: Record<DrillLevel, { label: string; icon: React.ElementType; entityType: EntityType }> = {
    campaigns: { label: 'Campanhas', icon: Target, entityType: 'campaign' },
    adsets: { label: 'Conjuntos de Anúncio', icon: Layers, entityType: 'adset' },
    ads: { label: 'Anúncios', icon: FileImage, entityType: 'ad' },
};

const CHART_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#f97316'];

export const CampaignExplorer: React.FC<CampaignExplorerProps> = ({
    organizationId,
    clientId,
    startDate,
    endDate,
}) => {
    const [level, setLevel] = useState<DrillLevel>('campaigns');
    const [viewMode, setViewMode] = useState<'dashboard' | 'table'>('dashboard');
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
        { level: 'campaigns', label: 'Campanhas' }
    ]);
    const [parentCampaignId, setParentCampaignId] = useState<string>();
    const [parentAdsetId, setParentAdsetId] = useState<string>();
    const [isMetricSelectorOpen, setIsMetricSelectorOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { data, rawData, loading, error } = useCampaignInsights({
        organizationId,
        clientId,
        startDate,
        endDate,
        level,
        parentCampaignId,
        parentAdsetId,
    });

    const entityId = level === 'campaigns' ? undefined
        : level === 'adsets' ? parentCampaignId
            : parentAdsetId;

    const { visibleMetrics, saveConfig } = useMetricConfig({
        organizationId,
        clientId,
        entityType: LEVEL_CONFIG[level].entityType,
        entityId,
    });

    const activeMetricDefs = useMemo(() =>
        visibleMetrics
            .map(key => AVAILABLE_METRICS.find(m => m.key === key))
            .filter(Boolean) as MetricDefinition[]
        , [visibleMetrics]);

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data;
        const q = searchQuery.toLowerCase();
        return data.filter(item => item.name.toLowerCase().includes(q));
    }, [data, searchQuery]);

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

    const drillInto = (item: AggregatedInsight) => {
        if (level === 'campaigns') {
            setParentCampaignId(item.id);
            setLevel('adsets');
            setBreadcrumbs(prev => [...prev, { level: 'adsets', label: item.name, id: item.id }]);
        } else if (level === 'adsets') {
            setParentAdsetId(item.id);
            setLevel('ads');
            setBreadcrumbs(prev => [...prev, { level: 'ads', label: item.name, id: item.id }]);
        }
        setSearchQuery('');
    };

    const navigateTo = (index: number) => {
        const target = breadcrumbs[index];
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        setLevel(target.level);
        setSearchQuery('');

        if (target.level === 'campaigns') {
            setParentCampaignId(undefined);
            setParentAdsetId(undefined);
        } else if (target.level === 'adsets') {
            setParentAdsetId(undefined);
        }
    };

    const getMetricValue = (item: AggregatedInsight, metric: MetricDefinition): number => {
        if (metric.computed && metric.compute) return metric.compute(item);
        return (item as any)[metric.key] || 0;
    };

    const formatMetricValue = (value: number, type: string): string => {
        if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
        if (type === 'percent') return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(value);
        return new Intl.NumberFormat('pt-BR').format(value);
    };

    const formatCompact = (value: number): string => {
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
        return value.toFixed(0);
    };

    const LevelIcon = LEVEL_CONFIG[level].icon;

    // ====== Time series for charts ======
    const timeSeries = useMemo(() => {
        if (!rawData.length) return [];
        const byDate: Record<string, any> = {};
        for (const row of rawData) {
            const d = row.date;
            if (!byDate[d]) byDate[d] = { date: d, impressions: 0, clicks: 0, spend: 0, leads: 0, conversions: 0, revenue: 0 };
            byDate[d].impressions += row.impressions || 0;
            byDate[d].clicks += row.clicks || 0;
            byDate[d].spend += parseFloat(row.spend) || 0;
            byDate[d].leads += row.leads || 0;
            byDate[d].conversions += row.conversions || 0;
            byDate[d].revenue += parseFloat(row.revenue) || 0;
        }
        return Object.values(byDate).sort((a: any, b: any) => a.date.localeCompare(b.date)).map((d: any) => ({
            ...d,
            label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        }));
    }, [rawData]);

    // ====== PIE DATA for top items by spend ======
    const pieData = useMemo(() => {
        const sorted = [...data].sort((a, b) => b.spend - a.spend);
        const top5 = sorted.slice(0, 5);
        const rest = sorted.slice(5);
        const result = top5.map((item, i) => ({
            name: item.name.length > 20 ? item.name.slice(0, 20) + '…' : item.name,
            value: item.spend,
            color: CHART_COLORS[i],
        }));
        if (rest.length > 0) {
            result.push({
                name: 'Outros',
                value: rest.reduce((s, r) => s + r.spend, 0),
                color: '#475569',
            });
        }
        return result;
    }, [data]);

    // ====== RENDER ======

    return (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Sub-header: Breadcrumb + Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-6 md:px-8 py-4 bg-white/[0.01] border-b border-white/5">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs">
                    {breadcrumbs.map((crumb, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                            <button
                                onClick={() => navigateTo(i)}
                                className={`px-2.5 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all ${i === breadcrumbs.length - 1
                                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {crumb.label}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar..."
                            className="pl-8 pr-3 py-2 text-xs bg-slate-950/50 border border-white/5 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30 w-48 transition-all"
                        />
                    </div>

                    {/* View toggle */}
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

                    {/* Metric Config */}
                    <button
                        onClick={() => setIsMetricSelectorOpen(true)}
                        className="p-2 bg-slate-950/50 border border-white/5 rounded-lg hover:bg-white/5 hover:border-cyan-500/20 transition-all text-slate-500 hover:text-cyan-400"
                        title="Configurar métricas"
                    >
                        <Settings2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Carregando dados...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                            <p className="text-sm text-red-400 font-bold">{error}</p>
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-4 text-center max-w-md">
                            <div className="p-4 bg-slate-900/40 rounded-2xl border border-white/5">
                                <LevelIcon className="w-10 h-10 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-400 mb-1">Sem dados de {LEVEL_CONFIG[level].label.toLowerCase()}</p>
                                <p className="text-xs text-slate-600">
                                    Os dados serão exibidos aqui quando importados via n8n ou inseridos manualmente.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : viewMode === 'dashboard' ? (
                    /* ======== DASHBOARD VIEW ======== */
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            {activeMetricDefs.slice(0, 8).map(metric => {
                                const value = getMetricValue(totals, metric);
                                return (
                                    <div
                                        key={metric.key}
                                        className="relative bg-slate-900/40 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/5 shadow-xl group hover:border-white/10 transition-all"
                                    >
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{metric.label}</p>
                                        <h3 className={`text-lg md:text-xl font-black ${metric.color} leading-none`}>
                                            {formatMetricValue(value, metric.type)}
                                        </h3>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Charts Grid */}
                        {timeSeries.length > 1 && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {/* Spend over time */}
                                <div className="bg-slate-900/40 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-xl">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-cyan-500" />
                                        Gasto por Dia
                                    </h4>
                                    <div className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={timeSeries}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                                <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '12px' }}
                                                    formatter={(v: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)}
                                                />
                                                <Bar dataKey="spend" name="Gasto" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Leads + Clicks over time */}
                                <div className="bg-slate-900/40 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-xl">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        Leads & Cliques
                                    </h4>
                                    <div className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={timeSeries}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                                <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '12px' }}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: '8px' }} />
                                                <Line type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#6366f1' }} />
                                                <Line type="monotone" dataKey="clicks" name="Cliques" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#f59e0b' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pie + List */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Pie Chart - Spend distribution */}
                            {pieData.length > 0 && (
                                <div className="bg-slate-900/40 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-xl">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                        Distribuição de Gasto
                                    </h4>
                                    <div className="h-[220px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} stroke="transparent" />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff', fontSize: '11px' }}
                                                    formatter={(v: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-3 space-y-1.5">
                                        {pieData.map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                                                    <span className="text-slate-400 truncate max-w-[140px]">{entry.name}</span>
                                                </div>
                                                <span className="text-white font-bold">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Card list */}
                            <div className="xl:col-span-2 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <LevelIcon className="w-4 h-4 text-cyan-500" />
                                    {LEVEL_CONFIG[level].label} ({filteredData.length})
                                </h4>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                    {filteredData.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => level !== 'ads' ? drillInto(item) : undefined}
                                            className={`w-full text-left bg-slate-900/60 border border-white/5 rounded-xl p-4 transition-all group ${level !== 'ads' ? 'hover:border-cyan-500/20 hover:bg-slate-900/80 cursor-pointer' : 'cursor-default'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-2 h-2 rounded-full ${item.status === 'ACTIVE' ? 'bg-emerald-400' : item.status === 'PAUSED' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                                    <span className="text-sm font-bold text-white truncate">{item.name}</span>
                                                    {item.objective && (
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-full">
                                                            {item.objective}
                                                        </span>
                                                    )}
                                                </div>
                                                {level !== 'ads' && (
                                                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                {activeMetricDefs.slice(0, 6).map(metric => {
                                                    const value = getMetricValue(item, metric);
                                                    return (
                                                        <div key={metric.key}>
                                                            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{metric.shortLabel}</p>
                                                            <p className={`text-xs font-black ${metric.color}`}>
                                                                {metric.type === 'currency'
                                                                    ? formatCompact(value)
                                                                    : metric.type === 'percent'
                                                                        ? (value * 100).toFixed(1) + '%'
                                                                        : formatCompact(value)}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ======== TABLE VIEW ======== */
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#0b101b] border-b border-white/5">
                                        <th className="sticky left-0 z-10 bg-[#0b101b] py-4 px-5 text-left font-black text-[9px] uppercase tracking-[0.3em] text-cyan-500/80 min-w-[220px] border-r border-white/5 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                                            {LEVEL_CONFIG[level].label}
                                        </th>
                                        {activeMetricDefs.map(metric => (
                                            <th key={metric.key} className="py-4 px-4 text-center font-black text-[9px] uppercase tracking-[0.2em] text-slate-500 min-w-[120px] border-l border-white/5">
                                                {metric.shortLabel}
                                            </th>
                                        ))}
                                        {level !== 'ads' && (
                                            <th className="py-4 px-4 text-center w-12"></th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map(item => (
                                        <tr
                                            key={item.id}
                                            onClick={() => level !== 'ads' ? drillInto(item) : undefined}
                                            className={`border-b border-white/5 transition-colors ${level !== 'ads' ? 'hover:bg-white/[0.03] cursor-pointer' : ''}`}
                                        >
                                            <td className="sticky left-0 bg-[#0b101b] z-10 py-3.5 px-5 border-r border-white/5 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status === 'ACTIVE' ? 'bg-emerald-400' : item.status === 'PAUSED' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                                    <span className="text-xs font-bold text-white truncate max-w-[180px]">{item.name}</span>
                                                </div>
                                            </td>
                                            {activeMetricDefs.map(metric => {
                                                const value = getMetricValue(item, metric);
                                                return (
                                                    <td key={metric.key} className="py-3.5 px-4 text-center text-xs font-bold text-slate-300 whitespace-nowrap border-l border-white/5">
                                                        {formatMetricValue(value, metric.type)}
                                                    </td>
                                                );
                                            })}
                                            {level !== 'ads' && (
                                                <td className="py-3.5 px-3 text-center">
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                                                </td>
                                            )}
                                        </tr>
                                    ))}

                                    {/* Total Row */}
                                    <tr className="bg-white/[0.03] border-t-2 border-cyan-500/20">
                                        <td className="sticky left-0 bg-[#0d1220] z-10 py-4 px-5 font-black text-xs text-cyan-400 uppercase tracking-widest border-r border-white/5 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                                            Total
                                        </td>
                                        {activeMetricDefs.map(metric => {
                                            const value = getMetricValue(totals, metric);
                                            return (
                                                <td key={metric.key} className="py-4 px-4 text-center text-xs font-black text-white whitespace-nowrap border-l border-white/5">
                                                    {formatMetricValue(value, metric.type)}
                                                </td>
                                            );
                                        })}
                                        {level !== 'ads' && <td></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Metric Selector Modal */}
            <MetricSelector
                isOpen={isMetricSelectorOpen}
                onClose={() => setIsMetricSelectorOpen(false)}
                visibleMetrics={visibleMetrics}
                onSave={saveConfig}
                entityLabel={`${LEVEL_CONFIG[level].label}${breadcrumbs.length > 1 ? ' — ' + breadcrumbs[breadcrumbs.length - 1].label : ''}`}
            />
        </div>
    );
};
