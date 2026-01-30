import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Table, Calendar, Download, RefreshCw, ChevronLeft, ChevronRight,
    TrendingUp, DollarSign, Users, Activity
} from 'lucide-react';
import { format, subDays, addDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkerMetricsTableProps {
    agentId: string;
}

export const WorkerMetricsTable: React.FC<WorkerMetricsTableProps> = ({ agentId }) => {
    const [loading, setLoading] = useState(true);
    const [rawMetrics, setRawMetrics] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState({
        start: subDays(new Date(), 6), // Last 7 days including today
        end: new Date()
    });

    useEffect(() => {
        if (!agentId) return;

        fetchMetrics();

        const channel = supabase
            .channel(`worker-pivot-metrics-${agentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'workers_ia_daily_metrics',
                    filter: `agent_id=eq.${agentId}`
                },
                () => {
                    fetchMetrics();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [agentId, dateRange]);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('workers_ia_daily_metrics')
                .select('*')
                .eq('agent_id', agentId)
                .gte('metric_date', dateRange.start.toISOString().split('T')[0])
                .lte('metric_date', dateRange.end.toISOString().split('T')[0])
                .order('metric_date', { ascending: true });

            if (data) {
                setRawMetrics(data);
            }
            if (error) {
                console.error('Error fetching metrics table:', error);
            }
        } catch (error) {
            console.error('Error fetching metrics table:', error);
        }
        setLoading(false);
    };

    // Pivot Data Construction
    const pivotData = useMemo(() => {
        // Generate array of dates for columns
        const dates: Date[] = [];
        let curr = new Date(dateRange.start);
        while (curr <= dateRange.end) {
            dates.push(new Date(curr));
            curr = addDays(curr, 1);
        }

        // Map metrics by date string for easy lookup
        const metricsByDate = new Map<string, any>();
        rawMetrics.forEach(m => {
            const d = m.metric_date.split('T')[0]; // Ensure YYYY-MM-DD
            metricsByDate.set(d, m);
        });

        return { dates, metricsByDate };
    }, [rawMetrics, dateRange]);

    const getValue = (date: Date, key: string, formatter?: (v: number) => string) => {
        const dateKey = date.toISOString().split('T')[0];
        const dayData = pivotData.metricsByDate.get(dateKey);
        const val = dayData ? dayData[key] : 0;
        return formatter ? formatter(val) : val;
    };

    const formatCurrency = (val: number) => `R$ ${val.toFixed(2)}`;
    const formatNumber = (val: number) => val.toLocaleString('pt-BR');
    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    // Helper to calculate calculated fields like CPL or Conv Rate safely
    const getCalculated = (date: Date, calcFn: (data: any) => number, formatter?: (v: number) => string) => {
        const dateKey = date.toISOString().split('T')[0];
        const dayData = pivotData.metricsByDate.get(dateKey);
        if (!dayData) return formatter ? formatter(0) : 0;
        const val = calcFn(dayData);
        return formatter ? formatter(val) : val;
    };

    const structure = [
        {
            category: 'VOLUME DE ATENDIMENTO',
            icon: Activity,
            color: 'text-violet-400',
            rows: [
                { label: 'Conversas Ativas', key: 'total_conversations', format: formatNumber },
                { label: 'Mensagens Trocadas', key: 'total_messages', format: formatNumber },
                { label: 'Estouros de SLA', key: 'total_sla_breaches', format: formatNumber },
                { label: 'Tokens Processados', getter: (d: any) => (d.tokens_input + d.tokens_output), format: (v: number) => `${(v / 1000).toFixed(1)}k` },
            ]
        },
        {
            category: 'PERFORMANCE FINANCEIRA',
            icon: DollarSign,
            color: 'text-green-400',
            rows: [
                { label: 'Custo Total', key: 'estimated_cost', format: formatCurrency },
                { label: 'Custo por Lead', getter: (d: any) => d.total_conversations > 0 ? (Number(d.estimated_cost) / d.total_conversations) : 0, format: formatCurrency },
                { label: 'Custo por Agendamento', getter: (d: any) => d.leads_scheduled > 0 ? (Number(d.estimated_cost) / d.leads_scheduled) : 0, format: formatCurrency },
            ]
        },
        {
            category: 'FUNIL DE VENDAS',
            icon: Users,
            color: 'text-cyan-400',
            rows: [
                { label: 'Leads Processados', key: 'leads_processed', format: formatNumber },
                { label: 'Interessados', key: 'leads_interested', format: formatNumber },
                { label: 'Qualificados', key: 'leads_qualified', format: formatNumber },
                { label: 'Agendados', key: 'leads_scheduled', format: formatNumber },
                { label: 'Taxa de Conversão', getter: (d: any) => d.leads_processed > 0 ? (d.leads_scheduled / d.leads_processed) * 100 : 0, format: formatPercent },
            ]
        }
    ];

    const changeDateRange = (days: number) => {
        const newStart = addDays(dateRange.start, days);
        const newEnd = addDays(dateRange.end, days);
        // Don't go into future too much? Allow it for navigation ease
        setDateRange({ start: newStart, end: newEnd });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Table className="w-5 h-5 text-violet-400" />
                        Visão Detalhada (Pivot)
                    </h3>
                    <p className="text-slate-400 text-sm">Análise diária lado a lado</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700">
                    <button
                        onClick={() => changeDateRange(-7)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 px-2 text-sm font-medium text-slate-200">
                        <Calendar className="w-4 h-4 text-violet-400" />
                        <span>{format(dateRange.start, "dd/MM", { locale: ptBR })}</span>
                        <span className="text-slate-500">-</span>
                        <span>{format(dateRange.end, "dd/MM", { locale: ptBR })}</span>
                    </div>
                    <button
                        onClick={() => changeDateRange(7)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-700 mx-1" />
                    <button
                        onClick={fetchMetrics}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Pivot Table */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-20 bg-[#0f172a] p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 min-w-[200px]">
                                    Métrica / Período
                                </th>
                                {pivotData.dates.map((date, i) => (
                                    <th key={i} className="p-4 text-center text-xs font-bold text-slate-300 border-b border-slate-800 border-l border-slate-800/50 min-w-[120px]">
                                        {format(date, "dd/MM", { locale: ptBR })}
                                        <div className="text-[10px] font-normal text-slate-500 mt-1 capitalize">
                                            {format(date, "EEEE", { locale: ptBR })}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {structure.map((section, catIdx) => (
                                <React.Fragment key={catIdx}>
                                    {/* Section Header */}
                                    <tr className="bg-slate-900/80">
                                        <td className="sticky left-0 z-10 bg-slate-900/90 p-3 pl-4 border-b border-slate-800 border-t border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <section.icon className={`w-4 h-4 ${section.color}`} />
                                                <span className={`text-xs font-bold ${section.color} uppercase tracking-wider`}>
                                                    {section.category}
                                                </span>
                                            </div>
                                        </td>
                                        {pivotData.dates.map((_, i) => (
                                            <td key={i} className="bg-slate-900/50 border-b border-slate-800 border-t border-slate-800 border-l border-slate-800/50" />
                                        ))}
                                    </tr>

                                    {/* Metrics Rows */}
                                    {section.rows.map((row, rowIdx) => (
                                        <tr key={rowIdx} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="sticky left-0 z-10 bg-[#0f172a] group-hover:bg-[#162032] p-3 pl-8 text-slate-400 font-medium text-xs border-r border-slate-800 transition-colors">
                                                {row.label}
                                            </td>
                                            {pivotData.dates.map((date, colIdx) => {
                                                const rawVal = row.key
                                                    ? getValue(date, row.key)
                                                    : getCalculated(date, row.getter!, undefined); // raw number

                                                const displayVal = row.key
                                                    ? getValue(date, row.key, row.format)
                                                    : getCalculated(date, row.getter!, row.format);

                                                return (
                                                    <td key={colIdx} className="p-3 text-center border-l border-slate-800/50 text-slate-300 font-mono text-xs whitespace-nowrap">
                                                        {displayVal}
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

            <div className="flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-medium border border-slate-700">
                    <Download className="w-4 h-4" />
                    Exportar Relatório Completo (.csv)
                </button>
            </div>
        </div>
    );
};
