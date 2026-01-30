import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity } from 'lucide-react';
import { WorkerMetricsCards } from './WorkerMetricsCards';
import { WorkerDeepMetrics } from './WorkerDeepMetrics';
import { WorkerConversationAnalytic } from './WorkerConversationAnalytic';

interface WorkerAnalyticsProps {
    agentId: string;
}

export const WorkerAnalytics: React.FC<WorkerAnalyticsProps> = ({ agentId }) => {
    const [loading, setLoading] = useState(false);
    const [activeConvs, setActiveConvs] = useState(0);
    const [attentionLeads, setAttentionLeads] = useState(0);
    const [highRiskLeads, setHighRiskLeads] = useState(0);

    useEffect(() => {
        if (!agentId) return;

        fetchActiveConversations();
        fetchStrategicCounters();

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
                () => {
                    fetchStrategicCounters();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(metricsChannel);
            supabase.removeChannel(conversationsChannel);
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
        // Needs attention: last_message_by = 'user'
        const { count: attention } = await supabase
            .from('workers_ia_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agentId)
            .eq('last_message_by', 'user');

        // High risk: last_message_by = 'user' AND sentiment_score < 0
        const { count: risk } = await supabase
            .from('workers_ia_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agentId)
            .eq('last_message_by', 'user')
            .lt('sentiment_score', 0);

        setAttentionLeads(attention || 0);
        setHighRiskLeads(risk || 0);
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Banner: Active Conversations */}
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

                {/* Counter 2: Attention Required */}
                <div className="relative overflow-hidden bg-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Ações Pendentes</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black text-amber-500">{attentionLeads}</p>
                                <span className="text-slate-500 text-[11px] font-bold">leads aguardando</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>
                </div>

                {/* Counter 3: High Risk (Intervention) */}
                <div className="relative overflow-hidden bg-slate-900 border border-rose-500/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-rose-500/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Risco de Perda</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black text-rose-500">{highRiskLeads}</p>
                                <span className="text-slate-500 text-[11px] font-bold">precisam de ajuda</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-rose-500 animate-bounce" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 1: KPI Cards */}
            <WorkerMetricsCards agentId={agentId} />

            {/* Section 2: Advanced Data Visualization */}
            <div className="animate-in slide-in-from-bottom-4 duration-700 delay-150">
                <WorkerDeepMetrics agentId={agentId} />
            </div>

            {/* Section 3: Individual Session Analytics (The "Resumo" List) */}
            <div className="animate-in slide-in-from-bottom-4 duration-700 delay-300">
                <WorkerConversationAnalytic agentId={agentId} />
            </div>
        </div>
    );
};
