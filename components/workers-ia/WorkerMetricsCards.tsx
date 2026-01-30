import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    TrendingUp, MessageSquare, Clock, DollarSign, CheckCircle,
    AlertTriangle, Users, Zap, ArrowUp, ArrowDown, Minus, MessagesSquare,
    Activity, Calendar, ChevronDown, X
} from 'lucide-react';
import { format, subDays, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodType = 'yesterday' | '7days' | '14days' | 'this_month' | 'last_month' | 'custom';

interface WorkerMetricsCardsProps {
    agentId: string;
}

export const WorkerMetricsCards: React.FC<WorkerMetricsCardsProps> = ({ agentId }) => {
    const [kpis, setKpis] = useState<any | null>(null);
    const [previousKpis, setPreviousKpis] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<PeriodType>('7days');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const datePickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDateRange = (selectedPeriod: PeriodType) => {
        const now = new Date();
        const today = startOfDay(now);
        let start: Date;
        let end: Date;
        let prevStart: Date;
        let prevEnd: Date;

        switch (selectedPeriod) {
            case 'yesterday':
                start = subDays(today, 1);
                end = today;
                prevStart = subDays(start, 1);
                prevEnd = start;
                break;
            case '7days':
                start = subDays(today, 7);
                end = today;
                prevStart = subDays(start, 7);
                prevEnd = start;
                break;
            case '14days':
                start = subDays(today, 14);
                end = today;
                prevStart = subDays(start, 14);
                prevEnd = start;
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = today;
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
                    start = subDays(today, 7);
                    end = today;
                    prevStart = subDays(start, 7);
                    prevEnd = start;
                }
                break;
            default:
                start = subDays(today, 7);
                end = today;
                prevStart = subDays(start, 7);
                prevEnd = start;
        }

        return { start, end, prevStart, prevEnd };
    };

    const fetchMetrics = async () => {
        setLoading(true);
        const { start, end, prevStart, prevEnd } = getDateRange(period);

        const { data: currentData } = await supabase
            .from('workers_ia_daily_metrics')
            .select('*')
            .eq('agent_id', agentId)
            .gte('metric_date', start.toISOString().split('T')[0])
            .lte('metric_date', end.toISOString().split('T')[0]);

        const { data: previousData } = await supabase
            .from('workers_ia_daily_metrics')
            .select('*')
            .eq('agent_id', agentId)
            .gte('metric_date', prevStart.toISOString().split('T')[0])
            .lte('metric_date', prevEnd.toISOString().split('T')[0]);

        const calculateKPIs = (metrics: any[]) => {
            if (!metrics || metrics.length === 0) return null;
            return metrics.reduce((acc, m) => ({
                totalConversations: acc.totalConversations + (m.total_conversations || 0),
                totalCost: acc.totalCost + Number(m.estimated_cost || 0),
                tokensUsed: acc.tokensUsed + (m.tokens_input || 0) + (m.tokens_output || 0),
                avgResponseTime: acc.avgResponseTime + (Number(m.avg_response_time || 0)),
                leadsScheduled: acc.leadsScheduled + (m.leads_scheduled || 0),
                leadsProcessed: acc.leadsProcessed + (m.leads_processed || 0),
                activeConversations: acc.activeConversations + (m.active_conversations || 0),
                avgSentiment: acc.avgSentiment + (Number(m.avg_sentiment_score || 0)),
                resolved: acc.resolved + (m.resolved_conversations || 0)
            }), {
                totalConversations: 0, totalCost: 0, tokensUsed: 0, avgResponseTime: 0,
                leadsScheduled: 0, leadsProcessed: 0, activeConversations: 0, avgSentiment: 0, resolved: 0
            });
        };

        const processKPIs = (data: any) => {
            const kpi = calculateKPIs(data || []);
            if (!kpi) return null;
            const count = (data || []).length;
            return {
                ...kpi,
                avgResponseTime: kpi.avgResponseTime / (count || 1),
                avgSentiment: kpi.avgSentiment / (count || 1),
                resolutionRate: kpi.totalConversations > 0 ? (kpi.resolved / kpi.totalConversations) * 100 : 0
            };
        };

        setKpis(processKPIs(currentData));
        setPreviousKpis(processKPIs(previousData));
        setLoading(false);
    };

    useEffect(() => {
        if (!agentId) return;

        fetchMetrics();

        // Subscribe to real-time updates for metrics
        const channel = supabase
            .channel(`worker-kpis-${agentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'workers_ia_daily_metrics',
                    filter: `agent_id=eq.${agentId}`
                },
                () => {
                    fetchMetrics();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [agentId, period]);

    const getTrend = (current: number, previous: number) => {
        if (!previous) return 'neutral';
        const diff = ((current - previous) / previous) * 100;
        if (diff > 5) return 'up';
        if (diff < -5) return 'down';
        return 'neutral';
    };

    const TrendBadge = ({ trend, positive = true }: { trend: 'up' | 'down' | 'neutral', positive?: boolean }) => {
        if (trend === 'neutral') return <span className="text-xs text-slate-500">0%</span>;
        const isGood = (trend === 'up' && positive) || (trend === 'down' && !positive);
        return (
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isGood ? 'text-emerald-400 bg-emerald-500/20' : 'text-rose-400 bg-rose-500/20'}`}>
                {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                5%
            </span>
        );
    };

    if (loading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array(6).fill(0).map((_, i) => <div key={i} className="h-32 bg-slate-800/50 rounded-2xl animate-pulse" />)}</div>;
    if (!kpis) return null;

    const cards = [
        { label: 'Conversas Ativas', value: kpis.totalConversations, icon: MessageSquare, color: 'from-violet-500 to-purple-600', trend: getTrend(kpis.totalConversations, previousKpis?.totalConversations), pos: true },
        { label: 'Sentimento Médio', value: `${(kpis.avgSentiment * 10).toFixed(1)}/10`, icon: StarIcon, color: 'from-emerald-500 to-teal-600', trend: 'neutral', pos: true },
        { label: 'Custo Estimado', value: `R$ ${kpis.totalCost.toFixed(2)}`, icon: DollarSign, color: 'from-blue-500 to-cyan-600', trend: getTrend(kpis.totalCost, previousKpis?.totalCost), pos: false },
        { label: 'SLA de Resposta', value: `${kpis.avgResponseTime.toFixed(1)}s`, icon: Clock, color: 'from-amber-500 to-orange-600', trend: getTrend(kpis.avgResponseTime, previousKpis?.avgResponseTime), pos: false },
        { label: 'Conversão Funil', value: `${(kpis.leadsProcessed > 0 ? (kpis.leadsScheduled / kpis.leadsProcessed) * 100 : 0).toFixed(1)}%`, icon: Zap, color: 'from-green-500 to-emerald-600', trend: 'neutral', pos: true },
        { label: 'Tokens Totais', value: `${(kpis.tokensUsed / 1000).toFixed(1)}k`, icon: Activity, color: 'from-purple-500 to-pink-600', trend: getTrend(kpis.tokensUsed, previousKpis?.tokensUsed), pos: true },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-xl font-bold text-white">Visão Geral</h3>
                <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
                    {periodOptions.map(p => (
                        <button key={p.id} onClick={() => setPeriod(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p.id ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{p.label}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card, i) => (
                    <div key={i} className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 hover:border-slate-500/50 transition-all group relative overflow-hidden">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-2.5 bg-gradient-to-br ${card.color} rounded-xl`}><card.icon className="w-5 h-5 text-white" /></div>
                            <TrendBadge trend={card.trend as any} positive={card.pos} />
                        </div>
                        <p className="text-slate-400 text-sm mb-1">{card.label}</p>
                        <p className="text-2xl font-bold text-white">{card.value}</p>
                        <div className={`absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br ${card.color} rounded-full opacity-5 blur-2xl`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

const StarIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.05 10.101c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
);

const periodOptions = [
    { id: 'yesterday', label: 'Ontem' },
    { id: '7days', label: '7 dias' },
    { id: '30days', label: '30 dias' },
    { id: 'this_month', label: 'Mês Atual' },
];
