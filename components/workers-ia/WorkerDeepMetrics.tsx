
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Clock, MessageSquare, Zap, ThumbsUp, ThumbsDown,
    CheckCircle, XCircle, Hash, Server, Activity, Calendar,
    TrendingUp, BarChart, PieChart as PieIcon, Info, RotateCcw
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
            scheduled: 0,
            processed: 0,
            sentiment: 0,
            ai_scheduled: 0,
            human_scheduled: 0,
            handoffs: 0,
            followup1_sent: 0,
            followup1_success: 0,
            followup1_qualified: 0,
            followup1_converted: 0,
            followup2_sent: 0,
            followup2_success: 0,
            followup2_qualified: 0,
            followup2_converted: 0,
            followup3_sent: 0,
            followup3_success: 0,
            followup3_qualified: 0,
            followup3_converted: 0
        };

        rawRows.forEach(row => {
            const dateStr = format(parseISO(row.metric_date), 'dd/MM', { locale: ptBR });
            const processed = row.leads_processed || 0;
            const scheduled = row.leads_scheduled || 0;
            const convRate = processed > 0 ? (scheduled / processed) * 100 : 0;

            totals.tokens_in += row.tokens_input || 0;
            totals.tokens_out += row.tokens_output || 0;
            totals.messages += row.total_messages || 0;
            totals.cost += Number(row.estimated_cost) || 0;
            totals.scheduled += scheduled;
            totals.processed += processed;
            totals.sentiment += Number(row.avg_sentiment) || 0;
            totals.ai_scheduled += row.ai_scheduled_count || 0;
            totals.human_scheduled += row.human_scheduled_count || 0;
            totals.handoffs += row.handoff_to_human_count || 0;
            totals.followup1_sent += row.followup_1_sent || 0;
            totals.followup1_success += row.followup_1_success || 0;
            totals.followup1_qualified += row.followup_1_qualified || 0;
            totals.followup1_converted += row.followup_1_converted || 0;
            totals.followup2_sent += row.followup_2_sent || 0;
            totals.followup2_success += row.followup_2_success || 0;
            totals.followup2_qualified += row.followup_2_qualified || 0;
            totals.followup2_converted += row.followup_2_converted || 0;
            totals.followup3_sent += row.followup_3_sent || 0;
            totals.followup3_success += row.followup_3_success || 0;
            totals.followup3_qualified += row.followup_3_qualified || 0;
            totals.followup3_converted += row.followup_3_converted || 0;

            timeSeriesData.push({
                date: dateStr,
                tokens: row.tokens_input || 0,
                messages: row.total_messages || 0,
                cost: Number(row.estimated_cost) || 0,
                avgResponse: row.avg_response_time_sec || 0,
                aiResponse: row.ai_avg_response_time || 0,
                humanResponse: row.human_avg_response_time || 0,
                scheduled: scheduled,
                processed: processed,
                convRate: Number(convRate.toFixed(1)),
                sentiment: Number(row.avg_sentiment) || 0,
                aiWin: row.ai_scheduled_count || 0,
                humanWin: row.human_scheduled_count || 0
            });
        });

        return {
            timeSeriesData,
            totals,
            avgSentiment: totals.sentiment / rawRows.length,
            cac: totals.scheduled > 0 ? totals.cost / totals.scheduled : 0,
            overallConvRate: totals.processed > 0 ? (totals.scheduled / totals.processed) * 100 : 0,
            handoffEfficiency: totals.handoffs > 0 ? (totals.human_scheduled / totals.handoffs) * 100 : 0,
            followup1Rate: totals.followup1_sent > 0 ? (totals.followup1_success / totals.followup1_sent) * 100 : 0,
            followup2Rate: totals.followup2_sent > 0 ? (totals.followup2_success / totals.followup2_sent) * 100 : 0,
            followup3Rate: totals.followup3_sent > 0 ? (totals.followup3_success / totals.followup3_sent) * 100 : 0
        };
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

    const { timeSeriesData, totals, cac, overallConvRate, avgSentiment, handoffEfficiency, followup1Rate, followup2Rate, followup3Rate } = analytics;

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-violet-400" />
                        Estratégia & Performance Híbrida
                    </h3>
                    <p className="text-slate-400 text-sm">Monitoramento especializado por função: SDR (IA) e Closer (Humano)</p>
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

            {/* SECTION 1: Efetividade SDR (IA) */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white">Performance SDR (IA)</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Qualificação & Triagem Neuronal</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Taxa de Qualificação</p>
                        <p className="text-xl font-black text-violet-400">{((totals.handoffs + totals.ai_scheduled) / (totals.processed || 1) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Agendamento Direto</p>
                        <p className="text-xl font-black text-emerald-400">{((totals.ai_scheduled / (totals.scheduled || 1)) * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">SLA Médio SDR</p>
                        <p className="text-xl font-black text-white">{(analytics.timeSeriesData.reduce((acc, d) => acc + d.aiResponse, 0) / (analytics.timeSeriesData.length || 1)).toFixed(1)}s</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Custo/Qualificação</p>
                        <p className="text-xl font-black text-cyan-400">R$ {(totals.cost / (totals.handoffs + totals.ai_scheduled || 1)).toFixed(2)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Tendência de Qualificação Diária</h5>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeSeriesData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                    <Area type="monotone" dataKey="processed" name="Entrada" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                                    <Area type="monotone" dataKey="aiWin" name="Qualificados IA" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Agilidade de Resposta IA (SLA)</h5>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={timeSeriesData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit="s" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                    <Line type="monotone" dataKey="aiResponse" name="Tempo SDR" stroke="#a78bfa" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: Efetividade Closer (Humano) */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white">Performance Closer (Humano)</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Fechamento & Conversão Final</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Conversão de Handoff</p>
                        <p className="text-xl font-black text-cyan-400">{handoffEfficiency.toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Latência de Handoff</p>
                        <p className="text-xl font-black text-rose-400">{(analytics.timeSeriesData.reduce((acc, d) => acc + d.humanResponse, 0) / (analytics.timeSeriesData.length || 1)).toFixed(0)}m</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Volume Closer</p>
                        <p className="text-xl font-black text-white">{totals.human_scheduled}</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Leads Entregues</p>
                        <p className="text-xl font-black text-slate-400">{totals.handoffs}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Efetividade de Fechamento Pós-Handoff</h5>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ReBarChart data={timeSeriesData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                    <Bar dataKey="humanWin" name="Agendamentos" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                </ReBarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Atraso na Resposta Humana (Latência)</h5>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={timeSeriesData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit="m" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                    <Line type="monotone" dataKey="humanResponse" name="Tempo Espera" stroke="#f43f5e" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: Followup & Reatenção */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-2xl">
                        <RotateCcw className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white">Reengajamento & Followups</h4>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Taxa de Sucesso por Tentativa</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Enviados</p>
                        <p className="text-xl font-black text-white">{totals.followup1_sent + totals.followup2_sent + totals.followup3_sent}</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-cyan-500/20">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Taxa 1º Followup</p>
                        <p className="text-xl font-black text-cyan-400">{followup1Rate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-cyan-500/20">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Taxa 2º Followup</p>
                        <p className="text-xl font-black text-cyan-400">{followup2Rate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-cyan-500/20">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Taxa 3º Followup</p>
                        <p className="text-xl font-black text-cyan-400">{followup3Rate.toFixed(1)}%</p>
                    </div>
                </div>

                {/* Funnel Table */}
                <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5 overflow-x-auto">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Funil Completo por Tentativa</h5>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700/50">
                                <th className="text-left py-3 px-2 text-slate-400 font-bold">Tentativa</th>
                                <th className="text-center py-3 px-2 text-slate-400 font-bold">Enviados</th>
                                <th className="text-center py-3 px-2 text-slate-400 font-bold">Responderam</th>
                                <th className="text-center py-3 px-2 text-cyan-400 font-bold">Qualificados</th>
                                <th className="text-center py-3 px-2 text-emerald-400 font-bold">Convertidos</th>
                                <th className="text-center py-3 px-2 text-slate-400 font-bold">Taxa Conversão</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { label: '1º Followup', sent: totals.followup1_sent, success: totals.followup1_success, qualified: totals.followup1_qualified, converted: totals.followup1_converted },
                                { label: '2º Followup', sent: totals.followup2_sent, success: totals.followup2_success, qualified: totals.followup2_qualified, converted: totals.followup2_converted },
                                { label: '3º Followup', sent: totals.followup3_sent, success: totals.followup3_success, qualified: totals.followup3_qualified, converted: totals.followup3_converted }
                            ].map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                                    <td className="py-3 px-2 font-bold text-white">{row.label}</td>
                                    <td className="py-3 px-2 text-center text-slate-300">{row.sent}</td>
                                    <td className="py-3 px-2 text-center text-slate-300">{row.success}</td>
                                    <td className="py-3 px-2 text-center text-cyan-400 font-bold">{row.qualified}</td>
                                    <td className="py-3 px-2 text-center text-emerald-400 font-bold">{row.converted}</td>
                                    <td className="py-3 px-2 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.sent > 0 ? (row.converted / row.sent * 100) > 10 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-500'
                                            }`}>
                                            {row.sent > 0 ? ((row.converted / row.sent) * 100).toFixed(1) : 0}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-900/50">
                                <td className="py-3 px-2 font-black text-white">TOTAL</td>
                                <td className="py-3 px-2 text-center font-bold text-white">{totals.followup1_sent + totals.followup2_sent + totals.followup3_sent}</td>
                                <td className="py-3 px-2 text-center font-bold text-white">{totals.followup1_success + totals.followup2_success + totals.followup3_success}</td>
                                <td className="py-3 px-2 text-center font-bold text-cyan-400">{totals.followup1_qualified + totals.followup2_qualified + totals.followup3_qualified}</td>
                                <td className="py-3 px-2 text-center font-bold text-emerald-400">{totals.followup1_converted + totals.followup2_converted + totals.followup3_converted}</td>
                                <td className="py-3 px-2 text-center">
                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400">
                                        {(totals.followup1_sent + totals.followup2_sent + totals.followup3_sent) > 0
                                            ? (((totals.followup1_converted + totals.followup2_converted + totals.followup3_converted) / (totals.followup1_sent + totals.followup2_sent + totals.followup3_sent)) * 100).toFixed(1)
                                            : 0}%
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Pipeline Visual por Tentativa</h5>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={[
                                { name: '1º', enviados: totals.followup1_sent, responderam: totals.followup1_success, qualificados: totals.followup1_qualified, convertidos: totals.followup1_converted },
                                { name: '2º', enviados: totals.followup2_sent, responderam: totals.followup2_success, qualificados: totals.followup2_qualified, convertidos: totals.followup2_converted },
                                { name: '3º', enviados: totals.followup3_sent, responderam: totals.followup3_success, qualificados: totals.followup3_qualified, convertidos: totals.followup3_converted }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Bar dataKey="enviados" name="Enviados" fill="#475569" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="responderam" name="Responderam" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="qualificados" name="Qualificados" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="convertidos" name="Convertidos" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
