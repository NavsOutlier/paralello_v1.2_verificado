import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    TrendingUp, MessageSquare, Clock, DollarSign, CheckCircle,
    AlertTriangle, Users, Zap, ArrowUp, ArrowDown, Minus, MessagesSquare,
    Activity, Calendar, ChevronDown, X
} from 'lucide-react';
import { AIAgentMetrics, AgentKPIs } from '../../types/ai-agents';
import { AgentFunnelChart } from './AgentFunnelChart';

type PeriodType = 'yesterday' | '7days' | '14days' | 'this_month' | 'last_month' | 'custom';

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
    const [period, setPeriod] = useState<PeriodType>('7days');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [funnelData, setFunnelData] = useState({
        total: 0,
        existingPatient: 0,
        newInterested: 0,
        qualified: 0,
        scheduled: 0,
        disqualified: 0,
        noResponse: 0
    });
    const datePickerRef = useRef<HTMLDivElement>(null);

    // Close date picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDateRange = (selectedPeriod: PeriodType): { start: Date; end: Date; prevStart: Date; prevEnd: Date } => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start: Date;
        let end: Date;
        let prevStart: Date;
        let prevEnd: Date;

        switch (selectedPeriod) {
            case 'yesterday':
                start = new Date(today);
                start.setDate(start.getDate() - 1);
                end = new Date(today);
                prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 1);
                prevEnd = new Date(start);
                break;

            case '7days':
                start = new Date(today);
                start.setDate(start.getDate() - 7);
                end = new Date(today);
                prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 7);
                prevEnd = new Date(start);
                break;

            case '14days':
                start = new Date(today);
                start.setDate(start.getDate() - 14);
                end = new Date(today);
                prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 14);
                prevEnd = new Date(start);
                break;

            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(today);
                prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                break;

            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
                break;

            case 'custom':
                if (customStartDate && customEndDate) {
                    start = new Date(customStartDate);
                    end = new Date(customEndDate);
                    const diff = end.getTime() - start.getTime();
                    prevEnd = new Date(start);
                    prevStart = new Date(start.getTime() - diff);
                } else {
                    start = new Date(today);
                    start.setDate(start.getDate() - 7);
                    end = new Date(today);
                    prevStart = new Date(start);
                    prevStart.setDate(prevStart.getDate() - 7);
                    prevEnd = new Date(start);
                }
                break;

            default:
                start = new Date(today);
                start.setDate(start.getDate() - 7);
                end = new Date(today);
                prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 7);
                prevEnd = new Date(start);
        }

        return { start, end, prevStart, prevEnd };
    };

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);

            const { start, end, prevStart, prevEnd } = getDateRange(period);

            const { data: currentData, error } = await supabase
                .from('ai_agent_metrics')
                .select('*')
                .eq('agent_id', agentId)
                .gte('metric_date', start.toISOString().split('T')[0])
                .lte('metric_date', end.toISOString().split('T')[0])
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
                .gte('metric_date', prevStart.toISOString().split('T')[0])
                .lte('metric_date', prevEnd.toISOString().split('T')[0])
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
                    responseTimeSum: acc.responseTimeSum + (m.avg_response_time || 0) * m.total_messages,
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

                // Aggregate funnel data
                const funnelTotals = metrics.reduce((acc, m) => ({
                    total: acc.total + (m.funnel_total || 0),
                    existingPatient: acc.existingPatient + (m.funnel_existing_patient || 0),
                    newInterested: acc.newInterested + (m.funnel_new_interested || 0),
                    qualified: acc.qualified + (m.funnel_qualified || 0),
                    scheduled: acc.scheduled + (m.funnel_scheduled || 0),
                    disqualified: acc.disqualified + (m.funnel_disqualified || 0),
                    noResponse: acc.noResponse + (m.funnel_no_response || 0)
                }), {
                    total: 0, existingPatient: 0, newInterested: 0,
                    qualified: 0, scheduled: 0, disqualified: 0, noResponse: 0
                });
                setFunnelData(funnelTotals);

                return {
                    totalConversations: totals.totalConversations,
                    resolutionRate: totals.totalConversations > 0
                        ? (totals.resolved / totals.totalConversations) * 100
                        : 0,
                    avgResponseTime: totals.totalMessages > 0
                        ? totals.responseTimeSum / totals.totalMessages
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
    }, [agentId, period, customStartDate, customEndDate]);

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

    const periodOptions: { id: PeriodType; label: string }[] = [
        { id: 'yesterday', label: 'Ontem' },
        { id: '7days', label: '7 dias' },
        { id: '14days', label: '14 dias' },
        { id: 'this_month', label: 'Este mês' },
        { id: 'last_month', label: 'Mês passado' },
    ];

    const getSelectedLabel = () => {
        if (period === 'custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
        }
        return periodOptions.find(p => p.id === period)?.label || '7 dias';
    };

    const handleApplyCustomDate = () => {
        if (customStartDate && customEndDate) {
            setPeriod('custom');
            setShowDatePicker(false);
        }
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
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white">Visão Geral</h3>
                    <p className="text-slate-400 text-sm mt-1">Métricas de performance do agente</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Period Buttons */}
                    <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                        {periodOptions.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${period === p.id
                                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Picker */}
                    <div className="relative" ref={datePickerRef}>
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${period === 'custom'
                                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-transparent shadow-lg shadow-violet-500/25'
                                : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            {period === 'custom' ? getSelectedLabel() : 'Personalizado'}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                        </button>

                        {showDatePicker && (
                            <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-50 min-w-[280px]">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-white">Período personalizado</h4>
                                    <button
                                        onClick={() => setShowDatePicker(false)}
                                        className="p-1 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Data inicial</label>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Data final</label>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                        />
                                    </div>
                                    <button
                                        onClick={handleApplyCustomDate}
                                        disabled={!customStartDate || !customEndDate}
                                        className="w-full py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-bold hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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

            {/* Sales Funnel */}
            <div className="mt-6">
                <AgentFunnelChart data={funnelData} />
            </div>
        </div>
    );
};

export default AgentMetricsCards;
