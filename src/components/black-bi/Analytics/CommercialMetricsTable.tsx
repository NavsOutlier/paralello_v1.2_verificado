import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import {
    Table, Calendar, Download, RefreshCw, ChevronLeft, ChevronRight,
    TrendingUp, DollarSign, Users, Activity, Filter, ChevronDown, MessageSquare, Bot, AlertTriangle, Zap
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

// Helper to get local date string YYYY-MM-DD
const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const CommercialMetricsTable: React.FC<CommercialMetricsTableProps> = ({ clientId }) => {
    const [loading, setLoading] = useState(true);
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
            // Simulated data fetching and aggregation based on Image 1 metrics
            const days = eachDayOfInterval({
                start: parseISO(startDate),
                end: parseISO(endDate)
            });

            const aggregated: any[] = days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                // Mocking values for demonstration
                return {
                    date: day,
                    // VOLUME DE ATENDIMENTO
                    active_conversations: Math.floor(Math.random() * 50) + 10,
                    messages_exchanged: Math.floor(Math.random() * 500) + 100,
                    sla_breaches: Math.floor(Math.random() * 5),
                    tokens_processed: Math.floor(Math.random() * 50000) + 10000,

                    // PERFORMANCE FINANCEIRA
                    total_cost: Math.random() * 200 + 50,
                    cost_per_lead: Math.random() * 10 + 2,
                    cost_per_appointment: Math.random() * 50 + 20,

                    // FUNIL DE VENDAS
                    leads_processed: Math.floor(Math.random() * 30) + 5,
                    interested: Math.floor(Math.random() * 20) + 5,
                    qualified: Math.floor(Math.random() * 15) + 3,
                    appointments: Math.floor(Math.random() * 10) + 2,
                    conversion_rate: Math.random() * 15 + 5
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
                isWithinInterval(m.date, { start: startOfDay(interval.start), end: endOfDay(interval.end) })
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
            {/* Header Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2 italic uppercase tracking-tighter">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        Fluxo de <span className="text-cyan-400">Inteligência</span> Comercial
                    </h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Análise de ROI e Performance Operacional</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Granularity Switcher */}
                    <div className="flex p-1 bg-slate-900/80 rounded-xl border border-white/5 shadow-inner">
                        {(['day', 'week', 'month'] as const).map((g) => (
                            <button
                                key={g}
                                onClick={() => setGranularity(g)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${granularity === g
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {g === 'day' ? 'Dia' : g === 'week' ? 'Semana' : 'Mês'}
                            </button>
                        ))}
                    </div>

                    {/* Sophisticated Date Picker (Image 2 Style) */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl hover:bg-slate-800 transition-all text-xs text-slate-300 font-bold uppercase tracking-wider shadow-lg group"
                        >
                            <Calendar className="w-4 h-4 text-cyan-400" />
                            <span>{selectedPresetLabel}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showPresetDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showPresetDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 py-2">
                                <div className="px-3 py-1 bg-slate-900/40 border-b border-white/5 mb-2">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Atalhos do Sistema</span>
                                </div>
                                {datePresets.map((preset) => (
                                    <button
                                        key={preset.key}
                                        onClick={() => handlePresetChange(preset.key)}
                                        className={`w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-l-2 ${selectedPreset === preset.key
                                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500'
                                                : 'text-slate-400 hover:bg-white/5 border-transparent hover:text-slate-200'
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}

                                <div className="mt-2 border-t border-white/5 pt-3 px-4 pb-3">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Período Personalizado</span>
                                    <div className="space-y-2">
                                        <div className="flex flex-col gap-1">
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => { setStartDate(e.target.value); setSelectedPreset('custom'); }}
                                                className="bg-slate-900 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-cyan-500/50"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => { setEndDate(e.target.value); setSelectedPreset('custom'); }}
                                                className="bg-slate-900 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-cyan-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={fetchMetrics}
                        className="p-2.5 bg-slate-900/80 border border-white/5 rounded-xl text-slate-500 hover:text-cyan-400 transition-all hover:bg-slate-800"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Pivot Table */}
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
                                            <div className="text-[8px] font-bold text-slate-600 mt-1 italic group-hover:text-slate-400 transition-colors">
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
                                            <td className={`sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900 p-4 pl-12 text-slate-400 font-bold text-[10px] border-r border-white/5 transition-all uppercase tracking-widest ${row.isWarning ? 'group-hover:text-amber-400' : 'group-hover:text-slate-200'}`}>
                                                {row.label}
                                            </td>
                                            {pivotData.map((item, colIdx) => {
                                                const val = (item.data as any)[row.key];
                                                return (
                                                    <td key={colIdx} className={`p-4 text-center border-l border-white/5 text-slate-300 font-mono text-[11px] group-hover:text-white transition-colors ${row.isWarning && val > 0 ? 'text-amber-400/80' : ''}`}>
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

            <div className="flex justify-end gap-3">
                <button className="flex items-center gap-2 px-5 py-3 bg-slate-900/80 text-slate-400 hover:text-cyan-400 rounded-2xl transition-all text-[9px] font-black uppercase tracking-widest border border-white/5 hover:border-cyan-500/30 shadow-xl">
                    <Download className="w-3.5 h-3.5" />
                    Extrair Inteligência (.csv)
                </button>
            </div>
        </div>
    );
};
