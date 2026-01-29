import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Activity, Clock, DollarSign, MessageSquare,
    Zap, Users, TrendingUp, BarChart3, Filter
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkerAnalyticsProps {
    agentId: string;
}

export const WorkerAnalytics: React.FC<WorkerAnalyticsProps> = ({ agentId }) => {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(7); // Default 7 days
    const [rawMetrics, setRawMetrics] = useState<any[]>([]);

    useEffect(() => {
        if (agentId) {
            fetchMetrics();
        }
    }, [agentId, period]);

    const fetchMetrics = async () => {
        setLoading(true);
        const startDate = subDays(new Date(), period);

        try {
            const { data, error } = await supabase
                .from('workers_ia_daily_metrics')
                .select('*')
                .eq('agent_id', agentId)
                .gte('metric_date', startDate.toISOString().split('T')[0])
                .order('metric_date', { ascending: true });

            if (error) throw error;
            setRawMetrics(data || []);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
        setLoading(false);
    };

    // Aggregate daily metrics into totals and chart data
    const analytics = useMemo(() => {
        if (!rawMetrics.length) return null;

        const totals = {
            conversations: 0,
            messages: 0,
            tokens: 0,
            cost: 0,
            leads: {
                total: 0,
                interested: 0,
                qualified: 0,
                scheduled: 0,
                disqualified: 0
            },
            avgResponseTime: 0
        };

        // For chart data, we might have multiple rows per day if we had hourly (but schema is unique per day/client/agent)
        // Since we query by agent_id, if this agent serves multiple clients, we might have multiple rows per day.
        // We should group by date.

        const dailyMap = new Map<string, any>();

        let responseTimeSum = 0;
        let responseTimeCount = 0;

        rawMetrics.forEach(row => {
            totals.conversations += row.total_conversations || 0;
            totals.messages += row.total_messages || 0;
            const rowTokens = (row.tokens_input || 0) + (row.tokens_output || 0);
            totals.tokens += rowTokens;
            totals.cost += Number(row.estimated_cost || 0);

            // Funnel
            totals.leads.total += row.leads_processed || 0;
            totals.leads.interested += row.leads_interested || 0;
            totals.leads.qualified += row.leads_qualified || 0;
            totals.leads.scheduled += row.leads_scheduled || 0;
            totals.leads.disqualified += row.leads_disqualified || 0;

            // SLA Weighted Average
            if (row.avg_response_time) {
                responseTimeSum += (Number(row.avg_response_time) * (row.total_messages || 1));
                responseTimeCount += (row.total_messages || 1);
            }

            // Group for charts
            const date = format(new Date(row.metric_date), 'dd/MM', { locale: ptBR });
            if (!dailyMap.has(date)) {
                dailyMap.set(date, {
                    date,
                    conversations: 0,
                    tokens: 0,
                    cost: 0,
                    response_time: 0,
                    leads_qualified: 0,
                    leads_scheduled: 0
                });
            }
            const d = dailyMap.get(date);
            d.conversations += row.total_conversations || 0;
            d.tokens += rowTokens;
            d.cost += Number(row.estimated_cost || 0);
            d.leads_qualified += row.leads_qualified || 0;
            d.leads_scheduled += row.leads_scheduled || 0;
            // For chart avg response time, we'll just take the max or avg of the day loosely for trends
            d.response_time = Math.max(d.response_time, Number(row.avg_response_time || 0));
        });

        totals.avgResponseTime = responseTimeCount > 0 ? (responseTimeSum / responseTimeCount) : 0;

        const chartData = Array.from(dailyMap.values());

        // Conversion Rates
        const conversionRate = totals.leads.total > 0
            ? ((totals.leads.scheduled / totals.leads.total) * 100)
            : 0;

        return { totals, chartData, conversionRate };
    }, [rawMetrics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">Sem dados de métricas para este período.</p>
                <p className="text-xs text-slate-600 mt-2">Comece a processar conversas para gerar insights.</p>
            </div>
        );
    }

    const { totals, chartData, conversionRate } = analytics;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-violet-400" />
                        Performance do Agente
                    </h3>
                    <p className="text-slate-400 text-sm">Acompanhamento de engajamento, custos e conversão</p>
                </div>
                <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700 shadow-lg">
                    {[7, 14, 30, 90].map((days) => (
                        <button
                            key={days}
                            onClick={() => setPeriod(days)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === days
                                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            {days} dias
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50 group hover:border-violet-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-violet-500/10 rounded-xl">
                            <MessageSquare className="w-5 h-5 text-violet-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500">VOLUME</span>
                    </div>
                    <h4 className="text-3xl font-bold text-white mb-1">{totals.conversations}</h4>
                    <p className="text-xs text-slate-400">Conversas iniciadas</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50 group hover:border-green-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-green-500/10 rounded-xl">
                            <DollarSign className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500">CUSTO</span>
                    </div>
                    <h4 className="text-3xl font-bold text-white mb-1">R$ {totals.cost.toFixed(2)}</h4>
                    <p className="text-xs text-slate-400">{((totals.tokens / 1000).toFixed(1))}k tokens processados</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50 group hover:border-cyan-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-cyan-500/10 rounded-xl">
                            <Clock className="w-5 h-5 text-cyan-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500">SLA MÉDIO</span>
                    </div>
                    <h4 className="text-3xl font-bold text-white mb-1">{totals.avgResponseTime.toFixed(1)}s</h4>
                    <p className="text-xs text-slate-400">Tempo de resposta da IA</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50 group hover:border-yellow-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-yellow-500/10 rounded-xl">
                            <Zap className="w-5 h-5 text-yellow-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500">CONVERSÃO</span>
                    </div>
                    <h4 className="text-3xl font-bold text-white mb-1">{conversionRate.toFixed(1)}%</h4>
                    <p className="text-xs text-slate-400">{totals.leads.scheduled} agendamentos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Activity Chart */}
                <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                    <h4 className="font-bold text-white mb-6 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-violet-400" />
                        Atividade e Agendamentos
                    </h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="conversations" name="Conversas" stroke="#8b5cf6" fill="url(#colorConv)" strokeWidth={2} />
                                <Area type="monotone" dataKey="leads_scheduled" name="Agendamentos" stroke="#22c55e" fill="none" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Funnel Visualization */}
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                    <h4 className="font-bold text-white mb-6 flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        Funil de Vendas (SDR)
                    </h4>

                    <div className="space-y-6 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-500/20 via-violet-500/20 to-green-500/20" />

                        <div className="relative group">
                            <div className="flex items-center gap-4">
                                <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                                    <span className="text-xs font-bold text-slate-400">ALL</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-300">Leads Processados</span>
                                        <span className="text-white font-bold">{totals.leads.total}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="flex items-center gap-4">
                                <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center group-hover:border-violet-500 transition-colors">
                                    <span className="text-xs font-bold text-slate-400">INT</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-300">Interessados</span>
                                        <span className="text-white font-bold">{totals.leads.interested}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-violet-500 h-full transition-all duration-1000"
                                            style={{ width: `${totals.leads.total ? (totals.leads.interested / totals.leads.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500 text-right block mt-1">
                                        {totals.leads.total ? Math.round((totals.leads.interested / totals.leads.total) * 100) : 0}% conv.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="flex items-center gap-4">
                                <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center group-hover:border-cyan-500 transition-colors">
                                    <span className="text-xs font-bold text-slate-400">QLF</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-300">Qualificados</span>
                                        <span className="text-white font-bold">{totals.leads.qualified}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-cyan-500 h-full transition-all duration-1000"
                                            style={{ width: `${totals.leads.total ? (totals.leads.qualified / totals.leads.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="flex items-center gap-4">
                                <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center group-hover:border-green-500 transition-colors effect-shine">
                                    <Zap className="w-4 h-4 text-green-400 fill-current" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-green-400 font-bold">Agendados</span>
                                        <span className="text-white font-bold">{totals.leads.scheduled}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-green-500 h-full transition-all duration-1000"
                                            style={{ width: `${totals.leads.total ? (totals.leads.scheduled / totals.leads.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-green-500/60 text-right block mt-1">
                                        Taxa Final: {conversionRate.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
