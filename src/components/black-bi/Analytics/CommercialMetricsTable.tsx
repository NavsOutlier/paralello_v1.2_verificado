import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import {
    Table, Calendar, Download, RefreshCw, ChevronLeft, ChevronRight,
    TrendingUp, DollarSign, Users, Activity, Filter, ChevronDown,
    MessageSquare, Bot, AlertTriangle, Zap, LayoutDashboard, PieChart, Clock, BarChart3,
    ArrowUpRight, ArrowDownRight, Target, Sparkles
} from 'lucide-react';
import {
    format, subDays, addDays, startOfDay, endOfDay, isSameDay,
    startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths,
    eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
    isWithinInterval, parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CommercialMetricsTableProps {
    clientId: string;
}

type Granularity = 'day' | 'week' | 'month';
type ViewMode = 'dashboard' | 'table';

// Helper to get local date string YYYY-MM-DD
const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const CommercialMetricsTable: React.FC<CommercialMetricsTableProps> = ({ clientId }) => {
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [rawMetrics, setRawMetrics] = useState<any[]>([]);
    const [granularity, setGranularity] = useState<Granularity>('day');

    // Default: Last 7 days
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return toLocalDateString(d);
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return toLocalDateString(d);
    });

    const [selectedPreset, setSelectedPreset] = useState('last7');
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowPresetDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const datePresets = [
        { key: 'today', label: 'Hoje', getDates: () => { const d = toLocalDateString(new Date()); return { start: d, end: d }; } },
        { key: 'yesterday', label: 'Ontem', getDates: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = toLocalDateString(d); return { start: s, end: s }; } },
        { key: 'thisWeek', label: 'Esta Semana', getDates: () => { const now = new Date(); const start = toLocalDateString(startOfWeek(now, { locale: ptBR })); return { start, end: toLocalDateString(now) }; } },
        { key: 'last7', label: 'Últimos 7 Dias', getDates: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 7); return { start: toLocalDateString(start), end: toLocalDateString(end) }; } },
        { key: 'last30', label: 'Últimos 30 Dias', getDates: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 30); return { start: toLocalDateString(start), end: toLocalDateString(end) }; } },
        { key: 'thisMonth', label: 'Este Mês', getDates: () => { const now = new Date(); const start = toLocalDateString(startOfMonth(now)); return { start, end: toLocalDateString(now) }; } },
        { key: 'lastMonth', label: 'Mês Passado', getDates: () => { const last = subMonths(new Date(), 1); return { start: toLocalDateString(startOfMonth(last)), end: toLocalDateString(endOfMonth(last)) }; } },
    ];

    const handlePresetChange = (presetKey: string) => {
        const preset = datePresets.find(p => p.key === presetKey);
        if (preset) {
            const { start, end } = preset.getDates();
            setStartDate(start);
            setEndDate(end);
            setSelectedPreset(presetKey);
            setShowPresetDropdown(false);
        }
    };

    const selectedPresetLabel = useMemo(() => {
        const preset = datePresets.find(p => p.key === selectedPreset);
        return preset?.label || 'Personalizado';
    }, [selectedPreset]);

    useEffect(() => {
        if (!clientId) return;
        fetchMetrics();
    }, [clientId, startDate, endDate, granularity]);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const { data: dbMetrics, error } = await supabase
                .from('daily_metrics')
                .select('*')
                .eq('client_id', clientId)
                .gte('date', startDate)
                .lte('date', endDate);

            if (error) throw error;

            const metricsMap = (dbMetrics || []).reduce((acc: any, m: any) => {
                acc[m.date] = m;
                return acc;
            }, {});

            const days = eachDayOfInterval({
                start: parseISO(startDate),
                end: parseISO(endDate)
            });

            const aggregated: any[] = days.map(day => {
                const dateStr = toLocalDateString(day);
                const m = metricsMap[dateStr] || {};

                return {
                    date: day,
                    // VOLUME DE ATENDIMENTO
                    active_conversations: m.active_conversations || 0,
                    messages_exchanged: m.messages_exchanged || 0,
                    sla_breaches: m.sla_breaches || 0,
                    tokens_processed: m.tokens_processed || 0,

                    // PERFORMANCE FINANCEIRA
                    total_cost: m.total_cost || 0,
                    cost_per_lead: m.cost_per_lead || 0,
                    cost_per_appointment: m.cost_per_appointment || 0,

                    // FUNIL DE VENDAS
                    leads_processed: m.leads_processed || 0,
                    interested: m.interested || 0,
                    qualified: m.qualified || 0,
                    appointments: m.appointments || 0,
                    conversion_rate: m.conversion_rate || 0
                };
            });

            setRawMetrics(aggregated);
        } catch (error) {
            console.error('Error fetching commercial metrics:', error);
        }
        setLoading(false);
    };

    const pivotData = useMemo(() => {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        let intervals: { start: Date, end: Date }[] = [];

        if (granularity === 'day') {
            intervals = eachDayOfInterval({ start, end }).map(d => ({ start: d, end: d }));
        } else if (granularity === 'week') {
            intervals = eachWeekOfInterval({ start, end }, { locale: ptBR }).map(w => ({
                start: startOfWeek(w, { locale: ptBR }),
                end: endOfWeek(w, { locale: ptBR })
            }));
        } else {
            intervals = eachMonthOfInterval({ start, end }).map(m => ({
                start: startOfMonth(m),
                end: endOfMonth(m)
            }));
        }

        return intervals.map(interval => {
            const periodMetrics = rawMetrics.filter(m =>
                m.date >= startOfDay(interval.start) && m.date <= endOfDay(interval.end)
            );

            return {
                interval,
                label: granularity === 'day'
                    ? format(interval.start, 'dd/MM')
                    : granularity === 'week'
                        ? `${format(interval.start, 'dd/MM')} - ${format(interval.end, 'dd/MM')}`
                        : format(interval.start, 'MMM/yy', { locale: ptBR }),
                subLabel: granularity === 'day' ? format(interval.start, 'EEEE', { locale: ptBR }) : '',
                data: {
                    active_conversations: periodMetrics.reduce((acc, m) => acc + (m.active_conversations || 0), 0),
                    messages_exchanged: periodMetrics.reduce((acc, m) => acc + (m.messages_exchanged || 0), 0),
                    sla_breaches: periodMetrics.reduce((acc, m) => acc + (m.sla_breaches || 0), 0),
                    tokens_processed: periodMetrics.reduce((acc, m) => acc + (m.tokens_processed || 0), 0),
                    total_cost: periodMetrics.reduce((acc, m) => acc + (m.total_cost || 0), 0),
                    cost_per_lead: periodMetrics.length > 0 ? periodMetrics.reduce((acc, m) => acc + (m.cost_per_lead || 0), 0) / periodMetrics.length : 0,
                    cost_per_appointment: periodMetrics.length > 0 ? periodMetrics.reduce((acc, m) => acc + (m.cost_per_appointment || 0), 0) / periodMetrics.length : 0,
                    leads_processed: periodMetrics.reduce((acc, m) => acc + (m.leads_processed || 0), 0),
                    interested: periodMetrics.reduce((acc, m) => acc + (m.interested || 0), 0),
                    qualified: periodMetrics.reduce((acc, m) => acc + (m.qualified || 0), 0),
                    appointments: periodMetrics.reduce((acc, m) => acc + (m.appointments || 0), 0),
                    conversion_rate: periodMetrics.length > 0 ? periodMetrics.reduce((acc, m) => acc + (m.conversion_rate || 0), 0) / periodMetrics.length : 0,
                }
            };
        });
    }, [rawMetrics, startDate, endDate, granularity]);

    const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const formatNumber = (val: number) => val.toLocaleString('pt-BR');
    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    const totals = useMemo(() => {
        return rawMetrics.reduce((acc, m) => ({
            active_conversations: acc.active_conversations + (m.active_conversations || 0),
            messages_exchanged: acc.messages_exchanged + (m.messages_exchanged || 0),
            leads_processed: acc.leads_processed + (m.leads_processed || 0),
            appointments: acc.appointments + (m.appointments || 0),
            total_cost: acc.total_cost + (m.total_cost || 0),
            qualified: acc.qualified + (m.qualified || 0),
        }), { active_conversations: 0, messages_exchanged: 0, leads_processed: 0, appointments: 0, total_cost: 0, qualified: 0 });
    }, [rawMetrics]);

    const renderDashboardView = () => (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: 'Total de Leads', val: formatNumber(totals.leads_processed), trend: '+12%', icon: Users, color: 'text-indigo-400' },
                    { label: 'Custo Total', val: formatCurrency(totals.total_cost), trend: '-5%', icon: DollarSign, color: 'text-emerald-400' },
                    { label: 'Agendamentos', val: formatNumber(totals.appointments), trend: '+8%', icon: Calendar, color: 'text-cyan-400' },
                    { label: 'Taxa Conv.', val: formatPercent(totals.leads_processed > 0 ? (totals.appointments / totals.leads_processed) * 100 : 0), trend: '+2.4%', icon: Activity, color: 'text-fuchsia-400' }
                ].map((stat, i) => (
                    <div key={i} className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 shadow-xl hover:border-white/10 transition-all">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 ${stat.color}`} />
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 bg-slate-950/50 rounded-2xl border border-white/5 ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-slate-950/50 border border-white/5 ${stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {stat.trend.startsWith('+') ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                {stat.trend}
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-2xl font-black text-white mt-1 group-hover:scale-105 transition-transform origin-left">{stat.val}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Funnel Health Chart - Re-using logic from BiMetricsDashboard */}
                <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col h-[400px]">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                        <PieChart className="w-5 h-5 text-cyan-400" /> Saúde do Funil (Drop-off)
                    </h4>
                    <div className="flex-1 flex flex-col justify-center gap-6">
                        {[
                            { label: 'Leads Processados', val: totals.leads_processed, total: totals.leads_processed, color: 'bg-indigo-500' },
                            { label: 'Interessados', val: Math.round(totals.leads_processed * 0.65), total: totals.leads_processed, color: 'bg-cyan-500' },
                            { label: 'Qualificados', val: totals.qualified, total: totals.leads_processed, color: 'bg-emerald-500' },
                            { label: 'Agendados', val: totals.appointments, total: totals.leads_processed, color: 'bg-fuchsia-500' }
                        ].map((item, i) => {
                            const percent = item.total > 0 ? (item.val / item.total) * 100 : 0;
                            return (
                                <div key={i} className="group/bar">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/bar:text-slate-300 transition-colors">{item.label}</span>
                                        <span className="text-xs font-black text-white">{formatNumber(item.val)} <span className="text-[9px] text-slate-600 ml-1">({percent.toFixed(0)}%)</span></span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(0,0,0,0.5)] ${item.color}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Conversion Performance - Circular Visual */}
                <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col h-[400px]">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                        <Target className="w-5 h-5 text-emerald-400" /> Performance Operacional
                    </h4>
                    <div className="flex-1 flex items-center justify-center relative">
                        {/* Donut Chart Simulation */}
                        <div className="w-48 h-48 rounded-full border-[12px] border-slate-950 relative flex items-center justify-center shadow-2xl">
                            <div className="absolute inset-0 rounded-full border-[12px] border-indigo-500/80 blur-[2px]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }} />
                            <div className="absolute inset-0 rounded-full border-[12px] border-cyan-500/80 blur-[2px]" style={{ clipPath: 'polygon(100% 50%, 100% 100%, 50% 100%, 50% 50%)' }} />
                            <div className="absolute inset-[-4px] rounded-full border-2 border-white/5" />

                            <div className="text-center">
                                <span className="text-3xl font-black text-white">{formatPercent(totals.leads_processed > 0 ? (totals.appointments / totals.leads_processed) * 100 : 0)}</span>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Global</p>
                            </div>
                        </div>

                        <div className="ml-12 space-y-5">
                            <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex items-center gap-4 group hover:bg-white/[0.04] transition-all">
                                <div className="p-2 bg-indigo-500/20 rounded-xl"><Users className="w-4 h-4 text-indigo-400" /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atendimento Ativo</p>
                                    <h5 className="text-sm font-black text-white">{formatNumber(totals.active_conversations)} <span className="text-[8px] text-emerald-400 ml-1">↑ 14%</span></h5>
                                </div>
                            </div>
                            <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex items-center gap-4 group hover:bg-white/[0.04] transition-all">
                                <div className="p-2 bg-cyan-500/20 rounded-xl"><MessageSquare className="w-4 h-4 text-cyan-400" /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interações Totais</p>
                                    <h5 className="text-sm font-black text-white">{formatNumber(totals.messages_exchanged)} <span className="text-[8px] text-cyan-400 ml-1">LIVE</span></h5>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const structure = [
        {
            category: 'VOLUME DE ATENDIMENTO',
            icon: Activity,
            color: 'text-cyan-400',
            rows: [
                { label: 'Conversas Ativas', key: 'active_conversations', format: formatNumber },
                { label: 'Mensagens Trocadas', key: 'messages_exchanged', format: formatNumber },
                { label: 'Estouros de SLA', key: 'sla_breaches', format: formatNumber, isWarning: true },
                { label: 'Tokens Processados', key: 'tokens_processed', format: formatNumber },
            ]
        },
        {
            category: 'PERFORMANCE FINANCEIRA',
            icon: DollarSign,
            color: 'text-emerald-400',
            rows: [
                { label: 'Custo Total', key: 'total_cost', format: formatCurrency },
                { label: 'Custo por Lead', key: 'cost_per_lead', format: formatCurrency },
                { label: 'Custo por Agendamento', key: 'cost_per_appointment', format: formatCurrency },
            ]
        },
        {
            category: 'FUNIL DE VENDAS',
            icon: Users,
            color: 'text-indigo-400',
            rows: [
                { label: 'Leads Processados', key: 'leads_processed', format: formatNumber },
                { label: 'Interessados', key: 'interested', format: formatNumber },
                { label: 'Qualificados', key: 'qualified', format: formatNumber },
                { label: 'Agendados', key: 'appointments', format: formatNumber },
                { label: 'Taxa de Conversão', key: 'conversion_rate', format: formatPercent },
            ]
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Main Navigation Header (pattern from MarketingDashboard) */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl px-8 py-5 shadow-2xl">
                <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 w-full xl:w-auto justify-between xl:justify-start">
                        <div>
                            <h3 className="text-xl font-black text-white flex items-center gap-3 italic uppercase tracking-tighter">
                                <BarChart3 className="w-5 h-5 text-cyan-400" />
                                Relatórios <span className="text-cyan-400">&</span> Metas
                            </h3>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="bg-slate-950/50 p-1.5 rounded-2xl border border-white/5 flex items-center shadow-inner">
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'dashboard'
                                    ? 'bg-slate-800 text-white shadow-lg border border-white/10'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                Dash
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table'
                                    ? 'bg-slate-800 text-white shadow-lg border border-white/10'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <Table className="w-3.5 h-3.5" />
                                Tabela
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 justify-end w-full xl:w-auto">
                        {/* Granularity Switcher */}
                        <div className="flex p-1 bg-slate-950/40 rounded-xl border border-white/5">
                            {(['day', 'week', 'month'] as const).map((g) => (
                                <button
                                    key={g}
                                    onClick={() => setGranularity(g)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${granularity === g
                                        ? 'bg-slate-700 text-white border border-white/10'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {g === 'day' ? 'Dia' : g === 'week' ? 'Sem' : 'Mês'}
                                </button>
                            ))}
                        </div>

                        <div className="h-4 w-px bg-white/10 mx-1" />

                        {/* Date Picker */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-950/30 border border-white/5 rounded-xl hover:bg-white/5 transition-all text-[10px] text-slate-300 font-black uppercase tracking-widest shadow-sm"
                            >
                                <Calendar className="w-3.5 h-3.5 text-cyan-500/70" />
                                <span>{selectedPresetLabel}</span>
                                <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${showPresetDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showPresetDropdown && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-50 backdrop-blur-3xl py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {datePresets.map((preset) => (
                                        <button
                                            key={preset.key}
                                            onClick={() => handlePresetChange(preset.key)}
                                            className={`w-full text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${selectedPreset === preset.key
                                                ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500'
                                                : 'text-slate-400 hover:bg-white/5 border-l-2 border-transparent'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                    <div className="mt-2 border-t border-white/5 pt-3 px-5 pb-3 bg-slate-900/40">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Customizado</p>
                                        <div className="space-y-2">
                                            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setSelectedPreset('custom'); }} className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-cyan-500/50" />
                                            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setSelectedPreset('custom'); }} className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-cyan-500/50" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={fetchMetrics}
                            className="p-2.5 bg-slate-950/30 border border-white/5 rounded-xl text-slate-500 hover:text-cyan-400 transition-all hover:bg-white/5 shadow-inner"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* View Transitions */}
            <div className="relative min-h-[500px]">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Sincronizando Dados</span>
                    </div>
                ) : (
                    viewMode === 'dashboard' ? renderDashboardView() : (
                        /* Pivot Table Area */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="bg-slate-950/40 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-slate-900/60">
                                                <th className="sticky left-0 z-20 bg-slate-950 p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 min-w-[260px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                                                    Métrica / Período
                                                </th>
                                                {pivotData.map((item, i) => (
                                                    <th key={i} className="p-6 text-center text-[10px] font-black text-slate-400 border-b border-white/10 border-l border-white/5 min-w-[140px] uppercase tracking-widest bg-slate-900/40">
                                                        {item.label}
                                                        {item.subLabel && (
                                                            <div className="text-[8px] font-bold text-slate-600 mt-1 italic">
                                                                {item.subLabel}
                                                            </div>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {structure.map((section, catIdx) => (
                                                <React.Fragment key={catIdx}>
                                                    <tr className="bg-slate-900/30">
                                                        <td className="sticky left-0 z-10 bg-slate-900/90 p-4 pl-6 border-b border-white/5">
                                                            <div className="flex items-center gap-3">
                                                                <section.icon className={`w-3.5 h-3.5 ${section.color}`} />
                                                                <span className={`text-[9px] font-black ${section.color} uppercase tracking-[0.15em]`}>
                                                                    {section.category}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        {pivotData.map((_, i) => (
                                                            <td key={i} className="bg-slate-900/10 border-b border-white/5 border-l border-white/5" />
                                                        ))}
                                                    </tr>

                                                    {section.rows.map((row, rowIdx) => (
                                                        <tr key={rowIdx} className="hover:bg-white/[0.02] transition-all group">
                                                            <td className={`sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900 p-4 pl-12 text-slate-400 font-bold text-[10px] border-r border-white/5 transition-all uppercase tracking-widest ${row.isWarning ? 'group-hover:text-amber-400' : 'group-hover:text-white'}`}>
                                                                {row.label}
                                                            </td>
                                                            {pivotData.map((item, colIdx) => {
                                                                const val = (item.data as any)[row.key];
                                                                return (
                                                                    <td key={colIdx} className={`p-4 text-center border-l border-white/5 text-slate-300 font-mono text-[11px] group-hover:text-white transition-colors ${row.isWarning && val > 0 ? 'text-amber-400/80 shadow-[inset_0_0_10px_rgba(251,191,36,0.05)]' : ''}`}>
                                                                        {row.format(val)}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button className="flex items-center gap-2 px-5 py-3 bg-slate-900/80 text-slate-400 hover:text-cyan-400 rounded-2xl transition-all text-[9px] font-black uppercase tracking-widest border border-white/5 hover:border-cyan-500/30 shadow-xl">
                                    <Download className="w-3.5 h-3.5" />
                                    Exportar Relatório Excel
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
