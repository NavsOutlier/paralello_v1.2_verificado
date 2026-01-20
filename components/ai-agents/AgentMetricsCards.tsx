import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    TrendingUp, MessageSquare, Clock, DollarSign, CheckCircle,
    AlertTriangle, Users, Zap, ArrowUp, ArrowDown, Minus, MessagesSquare,
    Activity
} from 'lucide-react';
import { AIAgentMetrics, AgentKPIs } from '../../types/ai-agents';

interface AgentMetricsCardsProps {
    agentId: string;
    dateRange?: {
        start: Date;
        end: Date;
    };
}

export const AgentMetricsCards: React.FC<AgentMetricsCardsProps> = ({
    agentId,
    dateRange
}) => {
    const [kpis, setKpis] = useState<AgentKPIs | null>(null);
    const [previousKpis, setPreviousKpis] = useState<AgentKPIs | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);

            const now = new Date();
            let startDate: Date;
            let previousStartDate: Date;
            let previousEndDate: Date;

            switch (period) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    previousStartDate = new Date(startDate);
                    previousStartDate.setDate(previousStartDate.getDate() - 1);
                    previousEndDate = new Date(startDate);
                    break;
                case 'week':
                    startDate = new Date(now);
                    startDate.setDate(startDate.getDate() - 7);
                    previousStartDate = new Date(startDate);
                    previousStartDate.setDate(previousStartDate.getDate() - 7);
                    previousEndDate = new Date(startDate);
                    break;
                case 'month':
                    startDate = new Date(now);
                    startDate.setDate(startDate.getDate() - 30);
                    previousStartDate = new Date(startDate);
                    previousStartDate.setDate(previousStartDate.getDate() - 30);
                    previousEndDate = new Date(startDate);
                    break;
            }

            const { data: currentData, error } = await supabase
                .from('ai_agent_metrics')
                .select('*')
                .eq('agent_id', agentId)
                .gte('metric_date', startDate.toISOString().split('T')[0])
                .is('metric_hour', null);

            if (error) {
                console.error('Error fetching metrics:', error);
                setLoading(false);
                return;
            }

            const { data: previousData } = await supabase
                .from('ai_agent_metrics')
                .select('*')
                .eq('agent_id', agentId)
                .gte('metric_date', previousStartDate.toISOString().split('T')[0])
                .lt('metric_date', previousEndDate.toISOString().split('T')[0])
                .is('metric_hour', null);

            const calculateKPIs = (metrics: AIAgentMetrics[]): AgentKPIs => {
                if (!metrics || metrics.length === 0) {
                    return {
                        totalConversations: 0,
                        resolutionRate: 0,
                        avgResponseTime: 0,
                        avgCsatScore: null,
                        totalCost: 0,
                        activeConversations: 0,
                        escalationRate: 0,
                        abandonRate: 0,
                        tokensUsed: 0,
                        avgMessagesPerConversation: 0
                    };
                }

                const totals = metrics.reduce((acc, m) => ({
                    totalConversations: acc.totalConversations + m.total_conversations,
                    resolved: acc.resolved + m.resolved_conversations,
                    escalated: acc.escalated + m.escalated_conversations,
                    abandoned: acc.abandoned + m.abandoned_conversations,
                    responseTimeSum: acc.responseTimeSum + (m.avg_response_time || 0) * m.total_conversations,
                    csatSum: acc.csatSum + (m.avg_csat_score || 0) * m.csat_responses,
                    csatCount: acc.csatCount + m.csat_responses,
                    tokensInput: acc.tokensInput + m.tokens_input,
                    tokensOutput: acc.tokensOutput + m.tokens_output,
                    cost: acc.cost + Number(m.estimated_cost_brl),
                    active: m.active_conversations,
                    totalMessages: acc.totalMessages + m.total_messages
                }), {
                    totalConversations: 0,
                    resolved: 0,
                    escalated: 0,
                    abandoned: 0,
                    responseTimeSum: 0,
                    csatSum: 0,
                    csatCount: 0,
                    tokensInput: 0,
                    tokensOutput: 0,
                    cost: 0,
                    active: 0,
                    totalMessages: 0
                });

                return {
                    totalConversations: totals.totalConversations,
                    resolutionRate: totals.totalConversations > 0
                        ? (totals.resolved / totals.totalConversations) * 100
                        : 0,
                    avgResponseTime: totals.totalConversations > 0
                        ? totals.responseTimeSum / totals.totalConversations
                        : 0,
                    avgCsatScore: totals.csatCount > 0
                        ? totals.csatSum / totals.csatCount
                        : null,
                    totalCost: totals.cost,
                    activeConversations: totals.active,
                    escalationRate: totals.totalConversations > 0
                        ? (totals.escalated / totals.totalConversations) * 100
                        : 0,
                    abandonRate: totals.totalConversations > 0
                        ? (totals.abandoned / totals.totalConversations) * 100
                        : 0,
                    tokensUsed: totals.tokensInput + totals.tokensOutput,
                    avgMessagesPerConversation: totals.totalConversations > 0
                        ? totals.totalMessages / totals.totalConversations
                        : 0
                };
            };

            setKpis(calculateKPIs(currentData || []));
            setPreviousKpis(calculateKPIs(previousData || []));
            setLoading(false);
        };

        fetchMetrics();
    }, [agentId, period]);

    const getTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
        if (previous === 0) return 'neutral';
        const diff = ((current - previous) / previous) * 100;
        if (diff > 5) return 'up';
        if (diff < -5) return 'down';
        return 'neutral';
    };

    const TrendBadge = ({ trend, positive = true }: { trend: 'up' | 'down' | 'neutral', positive?: boolean }) => {
        if (trend === 'neutral') {
            return (
                <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full">
                    <Minus className="w-3 h-3" /> 0%
                </span>
            );
        }

        const isGood = (trend === 'up' && positive) || (trend === 'down' && !positive);

        return (
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isGood
                    ? 'text-emerald-400 bg-emerald-500/20'
                    : 'text-rose-400 bg-rose-500/20'
                }`}>
                {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {trend === 'up' ? '+' : '-'}5%
            </span>
        );
    };

    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${seconds.toFixed(0)}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}m ${secs}s`;
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toFixed(0);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="h-8 w-40 bg-slate-700/50 rounded-lg animate-pulse" />
                    <div className="h-10 w-48 bg-slate-700/50 rounded-xl animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="bg-slate-800/50 rounded-2xl p-5 animate-pulse border border-slate-700/50">
                            <div className="h-4 bg-slate-700 rounded w-1/2 mb-3" />
                            <div className="h-8 bg-slate-700 rounded w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!kpis) {
        return (
            <div className="bg-slate-800/30 rounded-2xl p-12 text-center border border-slate-700/50">
                <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nenhuma métrica disponível para este período.</p>
                <p className="text-slate-600 text-sm mt-2">As métricas aparecerão quando o agente começar a receber dados.</p>
            </div>
        );
    }

    const cards = [
        {
            label: 'Total de Conversas',
            value: formatNumber(kpis.totalConversations),
            icon: MessageSquare,
            gradient: 'from-violet-500 to-purple-600',
            bgGradient: 'from-violet-500/10 to-purple-500/10',
            trend: getTrend(kpis.totalConversations, previousKpis?.totalConversations || 0),
            positive: true
        },
        {
            label: 'Taxa de Resolução',
            value: `${kpis.resolutionRate.toFixed(1)}%`,
            icon: CheckCircle,
            gradient: 'from-emerald-500 to-teal-600',
            bgGradient: 'from-emerald-500/10 to-teal-500/10',
            trend: getTrend(kpis.resolutionRate, previousKpis?.resolutionRate || 0),
            positive: true
        },
        {
            label: 'Tempo Médio Resposta',
            value: formatTime(kpis.avgResponseTime),
            icon: Clock,
            gradient: 'from-blue-500 to-cyan-600',
            bgGradient: 'from-blue-500/10 to-cyan-500/10',
            trend: getTrend(kpis.avgResponseTime, previousKpis?.avgResponseTime || 0),
            positive: false
        },
        {
            label: 'CSAT Score',
            value: kpis.avgCsatScore ? `${kpis.avgCsatScore.toFixed(1)}/5` : 'N/A',
            icon: TrendingUp,
            gradient: 'from-amber-500 to-orange-600',
            bgGradient: 'from-amber-500/10 to-orange-500/10',
            trend: kpis.avgCsatScore && previousKpis?.avgCsatScore
                ? getTrend(kpis.avgCsatScore, previousKpis.avgCsatScore)
                : 'neutral',
            positive: true
        },
        {
            label: 'Custo do Período',
            value: `R$ ${kpis.totalCost.toFixed(2)}`,
            icon: DollarSign,
            gradient: 'from-green-500 to-emerald-600',
            bgGradient: 'from-green-500/10 to-emerald-500/10',
            trend: getTrend(kpis.totalCost, previousKpis?.totalCost || 0),
            positive: false
        },
        {
            label: 'Taxa de Escalonamento',
            value: `${kpis.escalationRate.toFixed(1)}%`,
            icon: Users,
            gradient: 'from-orange-500 to-red-600',
            bgGradient: 'from-orange-500/10 to-red-500/10',
            trend: getTrend(kpis.escalationRate, previousKpis?.escalationRate || 0),
            positive: false
        },
        {
            label: 'Taxa de Abandono',
            value: `${kpis.abandonRate.toFixed(1)}%`,
            icon: AlertTriangle,
            gradient: 'from-rose-500 to-pink-600',
            bgGradient: 'from-rose-500/10 to-pink-500/10',
            trend: getTrend(kpis.abandonRate, previousKpis?.abandonRate || 0),
            positive: false
        },
        {
            label: 'Tokens Utilizados',
            value: formatNumber(kpis.tokensUsed),
            icon: Zap,
            gradient: 'from-purple-500 to-indigo-600',
            bgGradient: 'from-purple-500/10 to-indigo-500/10',
            trend: getTrend(kpis.tokensUsed, previousKpis?.tokensUsed || 0),
            positive: true
        },
        {
            label: 'Msgs por Conversa',
            value: kpis.avgMessagesPerConversation.toFixed(1),
            icon: MessagesSquare,
            gradient: 'from-cyan-500 to-blue-600',
            bgGradient: 'from-cyan-500/10 to-blue-500/10',
            trend: getTrend(kpis.avgMessagesPerConversation, previousKpis?.avgMessagesPerConversation || 0),
            positive: true
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white">Visão Geral</h3>
                    <p className="text-slate-400 text-sm mt-1">Métricas de performance do agente</p>
                </div>
                <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                    {(['today', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p
                                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            {p === 'today' ? 'Hoje' : p === 'week' ? '7 dias' : '30 dias'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Conversations Banner */}
            {kpis.activeConversations > 0 && (
                <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-5">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-violet-200 text-sm font-medium">Conversas Ativas Agora</p>
                            <p className="text-4xl font-bold text-white mt-1">{kpis.activeConversations}</p>
                        </div>
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Activity className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={index}
                            className={`relative overflow-hidden bg-gradient-to-br ${card.bgGradient} backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all group`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2.5 bg-gradient-to-br ${card.gradient} rounded-xl shadow-lg`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <TrendBadge trend={card.trend} positive={card.positive} />
                            </div>
                            <p className="text-slate-400 text-sm mb-1">{card.label}</p>
                            <p className="text-2xl font-bold text-white">{card.value}</p>

                            {/* Decorative gradient */}
                            <div className={`absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br ${card.gradient} rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AgentMetricsCards;
