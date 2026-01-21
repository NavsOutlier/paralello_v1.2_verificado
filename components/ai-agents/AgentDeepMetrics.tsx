
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Clock, MessageSquare, Zap, ThumbsUp, ThumbsDown,
    CheckCircle, XCircle, Hash, Server, Activity, Calendar
} from 'lucide-react';
import { AIAgentMetrics } from '../../types/ai-agents';

interface AgentDeepMetricsProps {
    agentId: string;
}

export const AgentDeepMetrics: React.FC<AgentDeepMetricsProps> = ({ agentId }) => {
    const [metrics, setMetrics] = useState<any>({ system: {}, evaluator: {} });
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<number>(7); // Default 7 days

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - period);

            const { data, error } = await supabase
                .from('ai_agent_metrics')
                .select('system_metrics, evaluator_metrics')
                .eq('agent_id', agentId)
                .gte('metric_date', startDate.toISOString().split('T')[0])
                .lte('metric_date', endDate.toISOString().split('T')[0]);

            if (error) {
                console.error('Error fetching deep metrics:', error);
                setLoading(false);
                return;
            }

            // Aggregation Logic
            const systemAgg: any = {
                tokens_input_cache: 0,
                tokens_input_total: 0,
                tokens_output: 0,
                msg_count_user: 0,
                msg_count_ai: 0,
                msg_count_system: 0,
                msg_count_tool: 0,
                sla_first_response_sec_sum: 0,
                sla_first_response_count: 0,
                sla_avg_response_sec_sum: 0,
                sla_avg_response_count: 0,
            };

            const evalAgg: any = {
                sentiment_positive: 0,
                sentiment_neutral: 0,
                sentiment_negative: 0,
                resolution_resolved: 0,
                resolution_unresolved: 0,
                categories: {}
            };

            data?.forEach((row: any) => {
                const s = row.system_metrics || {};
                const e = row.evaluator_metrics || {};

                // System Sums
                systemAgg.tokens_input_cache += s.tokens_input_cache || 0;
                systemAgg.tokens_input_total += s.tokens_input_total || 0;
                systemAgg.tokens_output += s.tokens_output || 0;
                systemAgg.msg_count_user += s.msg_count_user || 0;
                systemAgg.msg_count_ai += s.msg_count_ai || 0;
                systemAgg.msg_count_system += s.msg_count_system || 0;
                systemAgg.msg_count_tool += s.msg_count_tool || 0;

                // SLA Averages (Weighted by occurrence not possible without count, assume pure avg or weighted by msgs if available, using simple sum/count for now)
                // Better approach: if SLA is avg per day, we need daily volume to weight it.
                // For simplicity MVP: we'll average the daily averages (not perfect but OK)
                if (s.sla_first_response_sec) {
                    systemAgg.sla_first_response_sec_sum += s.sla_first_response_sec;
                    systemAgg.sla_first_response_count++;
                }
                if (s.sla_avg_response_sec) {
                    systemAgg.sla_avg_response_sec_sum += s.sla_avg_response_sec;
                    systemAgg.sla_avg_response_count++;
                }

                // Evaluator Sums
                evalAgg.sentiment_positive += e.sentiment_positive || 0;
                evalAgg.sentiment_neutral += e.sentiment_neutral || 0;
                evalAgg.sentiment_negative += e.sentiment_negative || 0;
                evalAgg.resolution_resolved += e.resolution_resolved || 0;
                evalAgg.resolution_unresolved += e.resolution_unresolved || 0;

                // Categories
                if (e.categories) {
                    Object.entries(e.categories).forEach(([cat, count]) => {
                        evalAgg.categories[cat] = (evalAgg.categories[cat] || 0) + (count as number);
                    });
                }
            });

            // Final calculations
            const finalSystem = {
                ...systemAgg,
                sla_first_response_sec: systemAgg.sla_first_response_count ? (systemAgg.sla_first_response_sec_sum / systemAgg.sla_first_response_count).toFixed(1) : 0,
                sla_avg_response_sec: systemAgg.sla_avg_response_count ? (systemAgg.sla_avg_response_sec_sum / systemAgg.sla_avg_response_count).toFixed(1) : 0,
            };

            setMetrics({ system: finalSystem, evaluator: evalAgg });
            setLoading(false);
        };

        fetchMetrics();
    }, [agentId, period]);

    const sys = metrics.system;
    const evalMetrics = metrics.evaluator;

    if (loading) return <div className="text-center text-slate-500 py-10">Carregando métricas avançadas...</div>;

    return (
        <div className="space-y-6">
            {/* Filter */}
            <div className="flex justify-end">
                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                    {[7, 14, 30].map((days) => (
                        <button
                            key={days}
                            onClick={() => setPeriod(days)}
                            className={`px - 3 py - 1.5 rounded - lg text - xs font - medium transition - all ${period === days
                                    ? 'bg-violet-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                } `}
                        >
                            {days} dias
                        </button>
                    ))}
                </div>
            </div>

            {/* System Metrics Section */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-violet-400" />
                    Métricas de Sistema (Infraestrutura)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Token Usage */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <Zap className="w-4 h-4" />
                            <span className="text-sm">Tokens (Input/Output)</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Total Input:</span>
                                <span className="text-white font-medium">{sys.tokens_input_total?.toLocaleString() || '-'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-emerald-500">Cacheado:</span>
                                <span className="text-emerald-400 font-medium">{sys.tokens_input_cache?.toLocaleString() || '-'}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-slate-700 mt-1 pt-1">
                                <span className="text-slate-500">Output:</span>
                                <span className="text-white font-medium">{sys.tokens_output?.toLocaleString() || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Check Cache Hit Rate */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <Activity className="w-4 h-4" />
                            <span className="text-sm">Eficiência de Cache</span>
                        </div>
                        <div className="flex items-end gap-2 mt-2">
                            <span className="text-3xl font-bold text-white">
                                {sys.tokens_input_total ? Math.round((sys.tokens_input_cache || 0) / sys.tokens_input_total * 100) : 0}%
                            </span>
                            <span className="text-slate-500 text-sm mb-1">dos inputs cacheados</span>
                        </div>
                    </div>

                    {/* Messages Breakdown */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-sm">Volumetria de Msgs</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-slate-900/50 p-2 rounded">
                                <p className="text-slate-500 text-xs">Usuário</p>
                                <p className="text-white font-bold">{sys.msg_count_user || 0}</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded">
                                <p className="text-slate-500 text-xs">IA</p>
                                <p className="text-violet-400 font-bold">{sys.msg_count_ai || 0}</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded">
                                <p className="text-slate-500 text-xs">Sistema</p>
                                <p className="text-blue-400 font-bold">{sys.msg_count_system || 0}</p>
                            </div>
                            <div className="bg-slate-900/50 p-2 rounded">
                                <p className="text-slate-500 text-xs">Ferramentas</p>
                                <p className="text-amber-400 font-bold">{sys.msg_count_tool || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* SLAs */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">SLA de Resposta</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">1ª Resposta:</span>
                                <span className={`font - bold px - 2 py - 0.5 rounded ${(sys.sla_first_response_sec || 0) < 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                    } `}>
                                    {sys.sla_first_response_sec || '-'}s
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Média Geral:</span>
                                <span className="text-white font-medium">{sys.sla_avg_response_sec || '-'}s</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Evaluator Metrics Section */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Agente Avaliador (Qualidade)
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sentiment Analysis */}
                    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                        <h4 className="text-sm font-medium text-slate-400 mb-4">Sentimento do Usuário</h4>
                        <div className="space-y-3">
                            {['positive', 'neutral', 'negative'].map((sentiment) => {
                                const key = `sentiment_${sentiment} `;
                                const val = evalMetrics[key] || 0;
                                const total = (evalMetrics.sentiment_positive || 0) + (evalMetrics.sentiment_neutral || 0) + (evalMetrics.sentiment_negative || 0);
                                const percentage = total > 0 ? (val / total) * 100 : 0;

                                let color = 'bg-slate-500';
                                if (sentiment === 'positive') color = 'bg-emerald-500';
                                if (sentiment === 'neutral') color = 'bg-blue-500';
                                if (sentiment === 'negative') color = 'bg-rose-500';

                                return (
                                    <div key={sentiment}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="capitalize text-slate-300">
                                                {sentiment === 'positive' ? 'Positivo' : sentiment === 'neutral' ? 'Neutro' : 'Negativo'}
                                            </span>
                                            <span className="text-slate-500">{val} ({percentage.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                                            <div className={`h - full ${color} `} style={{ width: `${percentage}% ` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Resolution Rate */}
                    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                        <h4 className="text-sm font-medium text-slate-400 mb-4">Taxa de Resolução</h4>
                        <div className="flex items-center justify-center h-40">
                            {/* Simple Donut Chart Representation using text/css */}
                            <div className="relative w-32 h-32 rounded-full border-8 border-slate-700 flex items-center justify-center">
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-white">
                                        {evalMetrics.resolution_resolved || 0}
                                    </span>
                                    <span className="text-xs text-slate-400">Resolvidos</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 text-sm mt-2">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-slate-300">Sim: {evalMetrics.resolution_resolved || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                <span className="text-slate-300">Não: {evalMetrics.resolution_unresolved || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Top Categories */}
                    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                        <h4 className="text-sm font-medium text-slate-400 mb-4">Principais Categorias</h4>
                        <div className="flex flex-wrap gap-2">
                            {evalMetrics.categories ? Object.entries(evalMetrics.categories).map(([cat, count]) => (
                                <div key={cat} className="px-3 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50 flex items-center gap-2">
                                    <span className="text-sm text-slate-200 capitalize">{cat}</span>
                                    <span className="text-xs bg-slate-800 rounded px-1.5 py-0.5 text-slate-400 font-mono">{count as number}</span>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500 italic">Sem categorias registradas ainda.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
