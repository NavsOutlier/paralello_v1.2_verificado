
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Clock, MessageSquare, Zap, ThumbsUp, ThumbsDown,
    CheckCircle, XCircle, Hash, Server, Activity, Calendar,
    TrendingUp, BarChart, PieChart as PieIcon, Info
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart as ReBarChart, Bar, Legend, AreaChart, Area
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkerDeepMetricsProps {
    agentId: string;
}

export const WorkerDeepMetrics: React.FC<WorkerDeepMetricsProps> = ({ agentId }) => {
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<number>(7);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - period);

            const { data, error } = await supabase
                .from('workers_ia_daily_metrics')
                .select('*')
                .eq('agent_id', agentId)
                .gte('metric_date', startDate.toISOString().split('T')[0])
                .order('metric_date', { ascending: true });

            if (error) {
                console.error('Error fetching worker deep metrics:', error);
                setLoading(false);
                return;
            }

            setRawRows(data || []);
            setLoading(false);
        };

        fetchMetrics();
    }, [agentId, period]);

    const analytics = useMemo(() => {
        if (!rawRows.length) return null;

        const timeSeriesData: any[] = [];
        const totals = {
            tokens_in: 0,
            tokens_out: 0,
            messages: 0,
            cost: 0,
            scheduled: 0
        };

        rawRows.forEach(row => {
            const dateStr = format(parseISO(row.metric_date), 'dd/MM', { locale: ptBR });

            totals.tokens_in += row.tokens_input || 0;
            totals.tokens_out += row.tokens_output || 0;
            totals.messages += row.total_messages || 0;
            totals.cost += Number(row.estimated_cost) || 0;
            totals.scheduled += row.leads_scheduled || 0;

            timeSeriesData.push({
                date: dateStr,
                tokens: row.tokens_input || 0,
                messages: row.total_messages || 0,
                cost: Number(row.estimated_cost) || 0,
                avgResponse: row.avg_response_time_sec || 0,
                scheduled: row.leads_scheduled || 0
            });
        });

        return { timeSeriesData, totals };
    }, [rawRows]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-slate-400 animate-pulse">Processando analytics avançado...</p>
        </div>
    );

    if (!analytics) return (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-cyan-500/10">
            <Info className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">Sem dados para o período selecionado.</p>
        </div>
    );

    const { timeSeriesData, totals } = analytics;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-violet-400" />
                        Framework Analytics Pro
                    </h3>
                    <p className="text-slate-400 text-sm">Visão de tendências e distribuição de performance</p>
                </div>
                <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 shadow-xl">
                    {[7, 14, 30].map((days) => (
                        <button
                            key={days}
                            onClick={() => setPeriod(days)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${period === days
                                ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                                }`}
                        >
                            {days}D
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Response Time Trend */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-cyan-500/10 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            Tempo de Resposta (Média)
                        </h4>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeriesData}>
                                <defs>
                                    <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit="s" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="avgResponse" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorResponse)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Scheduled Leads Mix */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-cyan-500/10 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                            <PieIcon className="w-4 h-4 text-violet-400" />
                            Agendamentos Confirmados
                        </h4>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={timeSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                                />
                                <Bar dataKey="scheduled" name="Agendamentos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tokens vs Cost */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-cyan-500/10 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Zap className="w-4 h-4 text-blue-400" />
                            Relação Tokens & Custo Estimado
                        </h4>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={10} tickLine={false} axisLine={false} unit="R$" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="tokens" name="Tokens Input" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="cost" name="Custo (R$)" stroke="#f43f5e" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
