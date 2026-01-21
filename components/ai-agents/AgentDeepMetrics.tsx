
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

interface AgentDeepMetricsProps {
    agentId: string;
}

export const AgentDeepMetrics: React.FC<AgentDeepMetricsProps> = ({ agentId }) => {
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<number>(7);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - period);

            const { data, error } = await supabase
                .from('ai_agent_metrics')
                .select('metric_date, system_metrics, evaluator_metrics')
                .eq('agent_id', agentId)
                .gte('metric_date', startDate.toISOString().split('T')[0])
                .order('metric_date', { ascending: true });

            if (error) {
                console.error('Error fetching deep metrics:', error);
                setLoading(false);
                return;
            }

            setRawRows(data || []);
            setLoading(false);
        };

        fetchMetrics();
    }, [agentId, period]);

    // Derived Analytics Framework (Lesson 2)
    const analytics = useMemo(() => {
        if (!rawRows.length) return null;

        const timeSeriesData: any[] = [];
        const distribution: any = {
            tokens: { values: [], min: 0, max: 0, median: 0, avg: 0 },
            sla: { values: [], min: 0, max: 0, median: 0, avg: 0 }
        };

        const totals: any = {
            tokens_in: 0,
            tokens_out: 0,
            tokens_cache: 0,
            messages: { user: 0, ai: 0, system: 0, tool: 0 },
            sentiment: { positive: 0, neutral: 0, negative: 0 },
            resolution: { resolved: 0, unresolved: 0 }
        };

        rawRows.forEach(row => {
            const s = row.system_metrics || {};
            const e = row.evaluator_metrics || {};
            const dateStr = format(parseISO(row.metric_date), 'dd/MM', { locale: ptBR });

            // Totals
            totals.tokens_in += s.tokens_input_total || 0;
            totals.tokens_out += s.tokens_output || 0;
            totals.tokens_cache += s.tokens_input_cache || 0;
            totals.messages.user += s.msg_count_user || 0;
            totals.messages.ai += s.msg_count_ai || 0;
            totals.messages.system += s.msg_count_system || 0;
            totals.messages.tool += s.msg_count_tool || 0;
            totals.sentiment.positive += e.sentiment_positive || 0;
            totals.sentiment.neutral += e.sentiment_neutral || 0;
            totals.sentiment.negative += e.sentiment_negative || 0;
            totals.resolution.resolved += e.resolution_resolved || 0;
            totals.resolution.unresolved += e.resolution_unresolved || 0;

            // Distribution samples
            if (s.tokens_input_total) distribution.tokens.values.push(s.tokens_input_total);
            if (s.sla_avg_response_sec) distribution.sla.values.push(s.sla_avg_response_sec);

            // Time series grouping
            const totalSent = (e.sentiment_positive || 0) + (e.sentiment_neutral || 0) + (e.sentiment_negative || 0);
            const totalRes = (e.resolution_resolved || 0) + (e.resolution_unresolved || 0);

            timeSeriesData.push({
                date: dateStr,
                tokens: s.tokens_input_total || 0,
                sla: s.sla_avg_response_sec || 0,
                sent_pos: totalSent ? Math.round((e.sentiment_positive / totalSent) * 100) : 0,
                sent_neu: totalSent ? Math.round((e.sentiment_neutral / totalSent) * 100) : 0,
                sent_neg: totalSent ? Math.round((e.sentiment_negative / totalSent) * 100) : 0,
                res_ok: totalRes ? Math.round((e.resolution_resolved / totalRes) * 100) : 0,
                res_fail: totalRes ? Math.round((e.resolution_unresolved / totalRes) * 100) : 0,
            });
        });

        // Calc Distribution Stats
        const calcStats = (obj: any) => {
            if (!obj.values.length) return;
            const vals = [...obj.values].sort((a, b) => a - b);
            obj.min = vals[0];
            obj.max = vals[vals.length - 1];
            obj.avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            obj.median = vals[Math.floor(vals.length / 2)];
        };
        calcStats(distribution.tokens);
        calcStats(distribution.sla);

        return { timeSeriesData, distribution, totals };
    }, [rawRows]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-slate-400 animate-pulse">Processando analytics avançado...</p>
        </div>
    );

    if (!analytics) return (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800">
            <Info className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">Sem dados para o período selecionado.</p>
        </div>
    );

    const { timeSeriesData, distribution, totals } = analytics;

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

            {/* Distribution Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                        <Zap className="w-12 h-12 text-violet-400" />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Consumo Tokens (Média)</p>
                    <p className="text-3xl font-black text-white mb-4">{Math.round(distribution.tokens.avg).toLocaleString()}</p>
                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-700/50">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase">Mín</p>
                            <p className="text-xs text-slate-300 font-mono">{distribution.tokens.min.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase">Mediana</p>
                            <p className="text-xs text-white font-mono font-bold">{distribution.tokens.median.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase">Máx</p>
                            <p className="text-xs text-slate-300 font-mono">{distribution.tokens.max.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                        <Clock className="w-12 h-12 text-emerald-400" />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">SLA Médio Geral</p>
                    <p className="text-3xl font-black text-white mb-4">{distribution.sla.avg.toFixed(1)}s</p>
                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-700/50">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase">Mín</p>
                            <p className="text-xs text-slate-300 font-mono">{distribution.sla.min.toFixed(1)}s</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase">Mediana</p>
                            <p className="text-xs text-white font-mono font-bold">{distribution.sla.median.toFixed(1)}s</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase">Máx</p>
                            <p className="text-xs text-slate-300 font-mono">{distribution.sla.max.toFixed(1)}s</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700/50">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Cache Hit Rate</p>
                    <div className="flex items-center gap-4">
                        <div className="text-3xl font-black text-emerald-400">
                            {totals.tokens_in ? Math.round((totals.tokens_cache / totals.tokens_in) * 100) : 0}%
                        </div>
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                                style={{ width: `${totals.tokens_in ? (totals.tokens_cache / totals.tokens_in) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 uppercase">Economia direta em processamento</p>
                </div>

                <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700/50">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Resolução IA</p>
                    <div className="flex items-center gap-4">
                        <div className="text-3xl font-black text-blue-400">
                            {(totals.resolution.resolved + totals.resolution.unresolved) > 0
                                ? Math.round((totals.resolution.resolved / (totals.resolution.resolved + totals.resolution.unresolved)) * 100)
                                : 0}%
                        </div>
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400"
                                style={{ width: `${(totals.resolution.resolved + totals.resolution.unresolved) > 0 ? (totals.resolution.resolved / (totals.resolution.resolved + totals.resolution.unresolved)) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 uppercase">Conversas resolvidas sem escalar</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SLA Trend */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            Tendência de SLA (Resposta)
                        </h4>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeriesData}>
                                <defs>
                                    <linearGradient id="colorSla" x1="0" y1="0" x2="0" y2="1">
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
                                <Area type="monotone" dataKey="sla" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSla)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sentiment Distribution Over Time (100% Stacked) */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-white flex items-center gap-2">
                            <PieIcon className="w-4 h-4 text-violet-400" />
                            Mix de Sentimento (Tendência)
                        </h4>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={timeSeriesData} stackOffset="expand">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    formatter={(value: any) => `${value}%`}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <Bar dataKey="sent_pos" name="Positivo" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="sent_neu" name="Neutro" stackId="a" fill="#3b82f6" />
                                <Bar dataKey="sent_neg" name="Negativo" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tokens vs Messages Comparison */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-white flex items-center gap-2">
                            <BarChart className="w-4 h-4 text-blue-400" />
                            Relação Tokens & Volume de Conversas
                        </h4>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="tokens" name="Tokens Input" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="res_ok" name="% Resolução" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Simple Word Cloud / Categories placeholder */}
            <div className="bg-slate-800/40 p-8 rounded-3xl border border-slate-700/50">
                <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs opacity-60">Categorização Automática (AI)</h4>
                <div className="flex flex-wrap gap-3">
                    {/* In a real scenario we'd aggregate words or use tags */}
                    {rawRows.length > 0 && Array.from(new Set(rawRows.flatMap(r => Object.keys(r.evaluator_metrics?.categories || {})))).map((tag: any) => {
                        const count = rawRows.reduce((a, b) => a + (b.evaluator_metrics?.categories?.[tag] || 0), 0);
                        const weight = Math.min(24, 12 + count);
                        return (
                            <span
                                key={tag}
                                className="px-4 py-2 bg-slate-900/80 rounded-2xl border border-slate-700 text-slate-300 hover:border-violet-500/50 hover:text-white transition-all cursor-default"
                                style={{ fontSize: `${weight}px` }}
                            >
                                {tag} <span className="text-[10px] opacity-40 ml-1">{count}</span>
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
