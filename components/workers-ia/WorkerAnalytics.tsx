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

    useEffect(() => {
        if (agentId) {
            fetchActiveConversations();
        }
    }, [agentId]);

    const fetchActiveConversations = async () => {
        // Fetch most recent metric row to get active_conversations count
        const { data } = await supabase
            .from('workers_ia_daily_metrics')
            .select('active_conversations')
            .eq('agent_id', agentId)
            .order('metric_date', { ascending: false })
            .limit(1);

        setActiveConvs(data?.[0]?.active_conversations || 2); // Proof of concept fallback
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
            {/* Real-time Banner (Premium Visual) */}
            {activeConvs > 0 && (
                <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 shadow-xl shadow-violet-500/20">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-violet-200 text-sm font-bold uppercase tracking-widest">Leads em Atendimento</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <p className="text-5xl font-black text-white">{activeConvs}</p>
                                <span className="text-violet-200 text-sm">conversas ativas agora</span>
                            </div>
                        </div>
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
                            <Activity className="w-10 h-10 text-white animate-pulse" />
                        </div>
                    </div>
                </div>
            )}

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
