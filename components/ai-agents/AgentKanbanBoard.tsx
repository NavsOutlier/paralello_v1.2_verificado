import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Clock, AlertTriangle, CheckCircle,
    XCircle, Calendar, MessageSquare, Search, RefreshCw,
    Frown, Meh, Smile
} from 'lucide-react';
import { AIConversation, ConversationStatus } from '../../types/ai-agents';

interface AgentKanbanBoardProps {
    agentId: string;
    onViewAudit?: (conversationId: string) => void;
}

const getSentimentConfig = (score?: number, label?: string) => {
    // If we have a score, use 5 levels
    if (score !== undefined && score !== null) {
        if (score <= -0.6) return { color: 'text-rose-500', icon: Frown, label: 'Muito Insatisfeito' };
        if (score <= -0.1) return { color: 'text-orange-400', icon: Frown, label: label || 'Insatisfeito' };
        if (score < 0.2) return { color: 'text-amber-400', icon: Meh, label: label || 'Neutro' };
        if (score < 0.6) return { color: 'text-emerald-400', icon: Smile, label: label || 'Satisfeito' };
        return { color: 'text-green-500', icon: Smile, label: 'Muito Satisfeito' };
    }

    // Fallback to label if no score
    switch (label) {
        case 'positive': return { color: 'text-emerald-400', icon: Smile, label: 'Satisfeito' };
        case 'negative': return { color: 'text-rose-400', icon: Frown, label: 'Insatisfeito' };
        case 'neutral': return { color: 'text-amber-400', icon: Meh, label: 'Neutro' };
        default: return { color: 'text-slate-500', icon: Meh, label: 'Sem Feeling' };
    }
};

const COLUMNS: { id: ConversationStatus; label: string; color: string; bg: string }[] = [
    { id: 'new', label: 'Novos', color: 'text-slate-400', bg: 'bg-slate-500/10' },
    { id: 'interested', label: 'Interessados', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { id: 'qualified', label: 'Qualificados', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'scheduled', label: 'Agendados', color: 'text-green-400', bg: 'bg-green-500/10' },
    { id: 'patient', label: 'Já Paciente', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'no_response', label: 'Sem Resposta', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'lost', label: 'Perdido', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    { id: 'disqualified', label: 'Desqualificados', color: 'text-rose-400', bg: 'bg-rose-500/10' },
];

export const AgentKanbanBoard: React.FC<AgentKanbanBoardProps> = ({ agentId, onViewAudit }) => {
    const [conversations, setConversations] = useState<AIConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ai_conversations')
                .select('*')
                .eq('agent_id', agentId)
                .order('last_interaction_at', { ascending: false });

            if (error) throw error;
            setConversations(data || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();

        const subscription = supabase
            .channel(`kanban-${agentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ai_conversations',
                    filter: `agent_id=eq.${agentId}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setConversations(prev => [payload.new as AIConversation, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setConversations(prev => prev.map(c =>
                            c.id === payload.new.id ? payload.new as AIConversation : c
                        ));
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [agentId]);

    const filteredConversations = conversations.filter(c =>
        c.contact_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col pt-2">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                </div>
                <button
                    onClick={fetchConversations}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Board */}
            <div className="flex-1 overflow-x-auto">
                <div className="flex gap-4 h-full min-w-max pb-4">
                    {COLUMNS.map(col => (
                        <div
                            key={col.id}
                            className="w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-800/20 border border-slate-700/30 overflow-hidden"
                        >
                            {/* Column Header */}
                            <div className={`p-3 border-b border-slate-700/30 flex items-center justify-between ${col.bg}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
                                    <span className="text-xs bg-slate-900/50 px-2 py-0.5 rounded-full text-slate-400">
                                        {filteredConversations.filter(c => c.status === col.id).length}
                                    </span>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {filteredConversations
                                    .filter(c => c.status === col.id)
                                    .map(card => (
                                        <div
                                            key={card.id}
                                            className="group bg-slate-800 border-l-2 p-3 rounded-lg shadow-sm border-slate-600 hover:border-violet-500 transition-all cursor-default"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white group-hover:bg-violet-600 transition-colors">
                                                        {card.contact_name?.[0] || card.contact_identifier[0]}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-sm font-medium text-white line-clamp-1">
                                                                {card.contact_name || card.contact_identifier}
                                                            </p>
                                                            {(() => {
                                                                const config = getSentimentConfig(card.sentiment_score, card.sentiment);
                                                                const Icon = config.icon;
                                                                return (
                                                                    <Icon className={`w-3.5 h-3.5 ${config.color} transition-colors`} />
                                                                );
                                                            })()}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500">
                                                            {new Date(card.last_interaction_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {card.summary && (
                                                <p className="text-xs text-slate-400 mb-3 line-clamp-3 bg-slate-900/30 p-2 rounded border border-slate-700/30">
                                                    {card.summary}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    {(() => {
                                                        const config = getSentimentConfig(card.sentiment_score, card.sentiment);
                                                        return (
                                                            <div className={`text-[9px] font-bold uppercase tracking-tighter ${config.color}`}>
                                                                {config.label}
                                                            </div>
                                                        );
                                                    })()}
                                                    {card.session_metrics?.avg_response_sec && (
                                                        <div className="flex items-center gap-1 text-[8px] text-slate-500 font-mono">
                                                            <Clock className="w-2 h-2" />
                                                            TMR: {card.session_metrics.avg_response_sec}s
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => onViewAudit?.(card.id)}
                                                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-violet-400 font-bold uppercase tracking-widest transition-colors"
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    AUDITORIA
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AgentKanbanBoard;
