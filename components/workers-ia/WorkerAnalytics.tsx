import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Database, AlertOctagon } from 'lucide-react';
import { WorkerMetricsCards } from './WorkerMetricsCards';
import { WorkerDeepMetrics } from './WorkerDeepMetrics';
import { WorkerConversationAnalytic } from './WorkerConversationAnalytic';
import { WorkerFunnelChart } from './WorkerFunnelChart';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

interface FunnelStage {
    id: string;
    label: string;
    color: string;
    bg: string;
    border: string;
}

interface WorkerAnalyticsProps {
    agentId: string;
}

const LOSS_COLORS: Record<string, string> = {
    price: '#f43f5e',      // rose-500
    competitor: '#f59e0b', // amber-500
    no_fit: '#64748b',     // slate-500
    scheduled: '#10b981',  // emerald-500
    other: '#8b5cf6',      // violet-500
};

const LOSS_LABELS: Record<string, string> = {
    price: 'Preço',
    competitor: 'Concorrência',
    no_fit: 'Sem Perfil',
    scheduled: 'Sucesso',
    other: 'Outros',
};

export const WorkerAnalytics: React.FC<WorkerAnalyticsProps> = ({ agentId }) => {
    const [loading, setLoading] = useState(false);
    const [activeConvs, setActiveConvs] = useState(0);
    const [attentionLeads, setAttentionLeads] = useState(0);
    const [highRiskLeads, setHighRiskLeads] = useState(0);
    const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
    const [funnelCounts, setFunnelCounts] = useState<Record<string, number>>({});
    const [lossDistribution, setLossDistribution] = useState<{ name: string, value: number, color: string }[]>([]);
    const [loadingFunnel, setLoadingFunnel] = useState(false);

    useEffect(() => {
        if (!agentId) return;

        fetchActiveConversations();
        fetchStrategicCounters();
        fetchFunnelData();
        fetchLossData();

        // Subscribe to real-time updates for metrics
        const metricsChannel = supabase
            .channel('worker-analytics-metrics')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'workers_ia_daily_metrics',
                    filter: `agent_id=eq.${agentId}`
                },
                () => {
                    fetchActiveConversations();
                }
            )
            .subscribe();

        // Subscribe to real-time updates for strategic counters
        const conversationsChannel = supabase
            .channel('worker-strategic-counters')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'workers_ia_conversations',
                    filter: `agent_id=eq.${agentId}`
                },
                (payload: any) => {
                    if (payload.new && payload.new.agent_id === agentId) {
                        fetchStrategicCounters();
                        fetchFunnelData();
                        fetchLossData();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'workers_ia_funnel_stages',
                    filter: `agent_id=eq.${agentId}`
                },
                () => {
                    fetchFunnelData();
                }
            )
            .subscribe();

        const agentChannel = supabase
            .channel('worker-analytics-agent')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'workers_ia_agents',
                    filter: `id=eq.${agentId}`
                },
                () => {
                    fetchActiveConversations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(metricsChannel);
            supabase.removeChannel(conversationsChannel);
            supabase.removeChannel(agentChannel);
        };
    }, [agentId]);

    const fetchActiveConversations = async () => {
        const { data } = await supabase
            .from('workers_ia_daily_metrics')
            .select('active_conversations')
            .eq('agent_id', agentId)
            .order('metric_date', { ascending: false })
            .limit(1);

        setActiveConvs(data?.[0]?.active_conversations || 0);
    };

    const fetchStrategicCounters = async () => {
        const { count: attention } = await supabase
            .from('workers_ia_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agentId)
            .eq('last_message_by', 'lead');

        const { count: risk } = await supabase
            .from('workers_ia_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agentId)
            .eq('last_message_by', 'lead')
            .lt('sentiment_score', 0);

        setAttentionLeads(attention || 0);
        setHighRiskLeads(risk || 0);
    };

    const fetchLossData = async () => {
        const { data, error } = await supabase
            .from('workers_ia_conversations')
            .select('loss_reason')
            .eq('agent_id', agentId)
            .not('loss_reason', 'is', null);

        if (!error && data) {
            const counts: Record<string, number> = {};
            data.forEach(c => {
                const reason = c.loss_reason || 'other';
                counts[reason] = (counts[reason] || 0) + 1;
            });

            const formatted = Object.entries(counts).map(([name, value]) => ({
                name: LOSS_LABELS[name] || name,
                value,
                color: LOSS_COLORS[name] || LOSS_COLORS.other
            })).sort((a, b) => b.value - a.value);

            setLossDistribution(formatted);
        }
    };

    const fetchFunnelData = async () => {
        if (!agentId) return;
        setLoadingFunnel(true);
        try {
            const { data: stagesData, error: stagesError } = await supabase
                .from('workers_ia_funnel_stages')
                .select('*')
                .eq('agent_id', agentId)
                .order('position', { ascending: true });

            let currentStages: FunnelStage[] = [];

            if (!stagesError && stagesData && stagesData.length > 0) {
                currentStages = stagesData.map(s => ({
                    id: s.stage_key,
                    label: s.label,
                    color: s.color,
                    bg: s.bg,
                    border: s.border
                }));
            } else {
                const { data: agentData } = await supabase
                    .from('workers_ia_agents')
                    .select('funnel_config')
                    .eq('id', agentId)
                    .single();

                if (agentData?.funnel_config) {
                    currentStages = agentData.funnel_config as FunnelStage[];
                }
            }

            setFunnelStages(currentStages);

            if (currentStages.length > 0) {
                const { data: convData } = await supabase
                    .from('workers_ia_conversations')
                    .select('funnel_stage')
                    .eq('agent_id', agentId);

                if (convData) {
                    const counts: Record<string, number> = {};
                    currentStages.forEach(s => counts[s.id] = 0);
                    convData.forEach(c => {
                        if (c.funnel_stage && counts[c.funnel_stage] !== undefined) {
                            counts[c.funnel_stage]++;
                        }
                    });
                    setFunnelCounts(counts);
                }
            }
        } catch (error) {
            console.error('Error fetching funnel data:', error);
        }
        setLoadingFunnel(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-slate-400 animate-pulse font-medium">Sincronizando métricas neurais...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Real-time Banners Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Connection Status */}
                <div className="md:col-span-1 relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 shadow-xl shadow-violet-500/10">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-violet-200 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Conexões Ativas</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black text-white">{activeConvs}</p>
                                <span className="text-violet-200 text-[11px] font-bold">online</span>
                            </div>
                        </div>
                        <Activity className="w-8 h-8 text-white/40 animate-pulse" />
                    </div>
                </div>

                {/* AI SDR Activity */}
                <div className="relative overflow-hidden bg-slate-900 border border-violet-500/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-violet-400/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">IA Atuando (SDR)</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black text-violet-400">{activeConvs}</p>
                                <span className="text-slate-500 text-[11px] font-bold">em triagem</span>
                            </div>
                        </div>
                        <Database className="w-6 h-6 text-violet-500/30" />
                    </div>
                </div>

                {/* Human Closer Actions */}
                <div className="relative overflow-hidden bg-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Ações Humano (Closer)</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black text-amber-500">{attentionLeads}</p>
                                <span className="text-slate-500 text-[11px] font-bold">aguardando</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>
                </div>

                {/* High Risk Alerts */}
                <div className="relative overflow-hidden bg-slate-900 border border-rose-500/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-rose-500/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Risco Crítico</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black text-rose-500">{highRiskLeads}</p>
                                <span className="text-slate-500 text-[11px] font-bold">precisam de ajuda</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                            <AlertOctagon className="w-5 h-5 text-rose-500 animate-bounce" />
                        </div>
                    </div>
                </div>
            </div>

            <WorkerMetricsCards agentId={agentId} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-700 delay-150">
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <WorkerFunnelChart
                        funnelStages={funnelStages}
                        counts={funnelCounts}
                        loading={loadingFunnel}
                    />

                    {/* Churn Analysis (Loss Reasons) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center gap-2 mb-6 text-rose-400">
                            <AlertOctagon className="w-4 h-4" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Churn Analysis (Loss)</h4>
                        </div>

                        {lossDistribution.length > 0 ? (
                            <div className="space-y-6">
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={lossDistribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {lossDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <ReTooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {lossDistribution.map((item) => (
                                        <div key={item.name} className="flex items-center gap-2 bg-slate-800/30 p-2 rounded-xl border border-white/5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] text-slate-300 font-bold truncate">{item.name}</p>
                                                <p className="text-[9px] text-slate-500 font-black">{item.value} leads</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-center p-6 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800">
                                <Database className="w-8 h-8 text-slate-700 mb-2" />
                                <p className="text-xs text-slate-500 font-medium">Nenhum dado de perda classificado ainda.</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-8">
                    <WorkerDeepMetrics agentId={agentId} />
                </div>
            </div>

            <div className="animate-in slide-in-from-bottom-4 duration-700 delay-300">
                <WorkerConversationAnalytic agentId={agentId} />
            </div>
        </div>
    );
};
