import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    TrendingUp, MessageSquare, Clock, DollarSign, CheckCircle,
    AlertTriangle, Users, Zap, ArrowUp, ArrowDown, Minus
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

            // Current period
            const { data: currentData, error } = await supabase
                .from('ai_agent_metrics')
                .select('*')
                .eq('agent_id', agentId)
                .gte('metric_date', startDate.toISOString().split('T')[0])
                .is('metric_hour', null); // Daily aggregates only

            if (error) {
                console.error('Error fetching metrics:', error);
                setLoading(false);
                return;
            }

            // Previous period for comparison
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
                        tokensUsed: 0
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
                    active: m.active_conversations // Last value
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
                    active: 0
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
                    tokensUsed: totals.tokensInput + totals.tokensOutput
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

    const TrendIcon = ({ trend, positive = true }: { trend: 'up' | 'down' | 'neutral', positive?: boolean }) => {
        if (trend === 'neutral') return <Minus className="w-3 h-3 text-slate-400" />;
        if (trend === 'up') {
            return positive
                ? <ArrowUp className="w-3 h-3 text-green-500" />
                : <ArrowUp className="w-3 h-3 text-red-500" />;
        }
        return positive
            ? <ArrowDown className="w-3 h-3 text-red-500" />
            : <ArrowDown className="w-3 h-3 text-green-500" />;
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                        <div className="h-8 bg-slate-200 rounded w-3/4" />
                    </div>
                ))}
            </div>
        );
    }

    if (!kpis) {
        return (
            <div className="bg-slate-50 rounded-xl p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma métrica disponível para este período.</p>
            </div>
        );
    }

    const cards = [
        {
            label: 'Total de Conversas',
            value: formatNumber(kpis.totalConversations),
            icon: MessageSquare,
            color: 'indigo',
            trend: getTrend(kpis.totalConversations, previousKpis?.totalConversations || 0),
            positive: true
        },
        {
            label: 'Taxa de Resolução',
            value: `${kpis.resolutionRate.toFixed(1)}%`,
            icon: CheckCircle,
            color: 'green',
            trend: getTrend(kpis.resolutionRate, previousKpis?.resolutionRate || 0),
            positive: true
        },
        {
            label: 'Tempo Médio Resposta',
            value: formatTime(kpis.avgResponseTime),
            icon: Clock,
            color: 'blue',
            trend: getTrend(kpis.avgResponseTime, previousKpis?.avgResponseTime || 0),
            positive: false // Lower is better
        },
        {
            label: 'CSAT Score',
            value: kpis.avgCsatScore ? `${kpis.avgCsatScore.toFixed(1)}/5` : 'N/A',
            icon: TrendingUp,
            color: 'yellow',
            trend: kpis.avgCsatScore && previousKpis?.avgCsatScore
                ? getTrend(kpis.avgCsatScore, previousKpis.avgCsatScore)
                : 'neutral',
            positive: true
        },
        {
            label: 'Custo do Período',
            value: `R$ ${kpis.totalCost.toFixed(2)}`,
            icon: DollarSign,
            color: 'emerald',
            trend: getTrend(kpis.totalCost, previousKpis?.totalCost || 0),
            positive: false // Lower is better
        },
        {
            label: 'Taxa de Escalonamento',
            value: `${kpis.escalationRate.toFixed(1)}%`,
            icon: Users,
            color: 'orange',
            trend: getTrend(kpis.escalationRate, previousKpis?.escalationRate || 0),
            positive: false // Lower is better
        },
        {
            label: 'Taxa de Abandono',
            value: `${kpis.abandonRate.toFixed(1)}%`,
            icon: AlertTriangle,
            color: 'red',
            trend: getTrend(kpis.abandonRate, previousKpis?.abandonRate || 0),
            positive: false // Lower is better
        },
        {
            label: 'Tokens Utilizados',
            value: formatNumber(kpis.tokensUsed),
            icon: Zap,
            color: 'purple',
            trend: getTrend(kpis.tokensUsed, previousKpis?.tokensUsed || 0),
            positive: true
        }
    ];

    const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
        green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
        yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', iconBg: 'bg-yellow-100' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
        red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' }
    };

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Visão Geral</h3>
                <div className="flex gap-2">
                    {(['today', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p
                                    ? 'bg-indigo-100 text-indigo-600'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {p === 'today' ? 'Hoje' : p === 'week' ? '7 dias' : '30 dias'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, index) => {
                    const colors = colorClasses[card.color];
                    const Icon = card.icon;
                    return (
                        <div
                            key={index}
                            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg ${colors.iconBg}`}>
                                    <Icon className={`w-5 h-5 ${colors.text}`} />
                                </div>
                                <TrendIcon trend={card.trend} positive={card.positive} />
                            </div>
                            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Active Conversations Highlight */}
            {kpis.activeConversations > 0 && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-sm">Conversas Ativas Agora</p>
                            <p className="text-3xl font-bold">{kpis.activeConversations}</p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentMetricsCards;
