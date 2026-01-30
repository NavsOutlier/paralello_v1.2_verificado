import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Search, Filter, Plus, GripVertical, Calendar,
    MessageSquare, User, Tag, Clock, CheckCircle2,
    AlertCircle, MoreHorizontal, ChevronRight, X,
    Frown, Meh, Smile
} from 'lucide-react';
import { Avatar } from '../ui';

// TODO: Move to types/workers-ia
interface WorkerConversation {
    id: string;
    session_id: string;
    client_id: string;
    agent_id: string;
    status: 'active' | 'completed' | 'expired';
    funnel_stage: 'new_lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
    created_at: string;
    updated_at: string;
    metadata: any;
    summary?: string;
    contact_info?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    sentiment_score?: number;
}

interface WorkerKanbanBoardProps {
    agentId: string;
    onViewAudit?: (sessionId: string) => void;
}

const FUNNEL_STAGES: { id: WorkerConversation['funnel_stage']; label: string; color: string; bg: string }[] = [
    { id: 'new_lead', label: 'Novos Leads', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'qualified', label: 'Qualificados', color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { id: 'proposal', label: 'Proposta Enviada', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { id: 'negotiation', label: 'Em Negociação', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { id: 'closed_won', label: 'Venda Realizada', color: 'text-green-400', bg: 'bg-green-500/10' },
];

const getSentimentConfig = (score?: number) => {
    if (score === undefined || score === null) return { color: 'text-slate-500', icon: Meh, bg: 'bg-slate-500', label: 'Sem Feeling' };
    if (score <= -0.6) return { color: 'text-rose-500', icon: Frown, bg: 'bg-rose-500', label: 'Muito Insatisfeito' };
    if (score <= -0.1) return { color: 'text-orange-400', icon: Frown, bg: 'bg-orange-400', label: 'Insatisfeito' };
    if (score < 0.2) return { color: 'text-amber-400', icon: Meh, bg: 'bg-amber-400', label: 'Neutro' };
    if (score < 0.6) return { color: 'text-emerald-400', icon: Smile, bg: 'bg-emerald-400', label: 'Satisfeito' };
    return { color: 'text-green-500', icon: Smile, bg: 'bg-green-500', label: 'Muito Satisfeito' };
};

export const WorkerKanbanBoard: React.FC<WorkerKanbanBoardProps> = ({ agentId, onViewAudit }) => {
    const { organizationId } = useAuth();
    const [conversations, setConversations] = useState<WorkerConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (agentId) {
            fetchConversations();
        }
    }, [agentId]);

    // Real-time updates
    useEffect(() => {
        const subscription = supabase
            .channel(`workers-kanban-${agentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'workers_ia_conversations',
                    filter: `agent_id=eq.${agentId}`
                },
                (payload) => {
                    fetchConversations();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [agentId]);

    const fetchConversations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('workers_ia_conversations')
            .select('*')
            .eq('agent_id', agentId)
            .neq('funnel_stage', 'closed_lost')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
        } else {
            setConversations(data || []);
        }
        setLoading(false);
    };

    const getColumnConversations = (stageId: string) => {
        return conversations.filter(c =>
            c.funnel_stage === stageId &&
            (
                !searchTerm ||
                (c.session_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (c.contact_info?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            )
        );
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, targetStage: string) => {
        e.preventDefault();
        const conversationId = e.dataTransfer.getData('text/plain');

        setConversations(prev => prev.map(c =>
            c.id === conversationId ? { ...c, funnel_stage: targetStage as any } : c
        ));

        const { error } = await supabase
            .from('workers_ia_conversations')
            .update({ funnel_stage: targetStage })
            .eq('id', conversationId);

        if (error) {
            console.error('Error moving card:', error);
            fetchConversations();
        }
    };

    if (loading && conversations.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 bg-violet-500/20 text-violet-300 rounded-lg hover:bg-violet-500/30 transition-colors text-sm font-medium">
                        <Calendar className="w-4 h-4" />
                        Últimos 30 dias
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {FUNNEL_STAGES.map(column => (
                    <div
                        key={column.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                        className="flex-shrink-0 w-80 flex flex-col bg-slate-800/20 rounded-xl border border-slate-700/30"
                    >
                        <div className={`p-3 border-b border-slate-700/30 flex items-center justify-between ${column.bg} rounded-t-xl bg-opacity-30`}>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${column.color.replace('text-', 'bg-')}`} />
                                <h3 className={`font-semibold text-sm ${column.color}`}>{column.label}</h3>
                            </div>
                            <span className="text-xs font-mono text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-full">
                                {getColumnConversations(column.id).length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {getColumnConversations(column.id).map(card => (
                                <div
                                    key={card.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, card.id)}
                                    className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 hover:border-violet-500/50 transition-all cursor-move group relative shadow-sm hover:shadow-md"
                                >
                                    <div className="flex items-start gap-3 mb-2">
                                        <div className="relative">
                                            <Avatar
                                                name={card.contact_info?.name || 'Lead'}
                                                size="sm"
                                                className="ring-2 ring-slate-800"
                                            />
                                            {(() => {
                                                const config = getSentimentConfig(card.sentiment_score);
                                                const Icon = config.icon;
                                                return (
                                                    <div className="absolute -bottom-1 -right-1 p-0.5 bg-slate-900 rounded-full shadow-lg">
                                                        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-white line-clamp-1">
                                                {card.contact_info?.name || 'Visitante Anônimo'}
                                            </h4>
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(card.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {card.summary && (
                                        <p className="text-xs text-slate-400 line-clamp-2 mb-3 bg-slate-800/50 p-2 rounded border border-slate-800">
                                            {card.summary}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="w-3 h-3 text-slate-500" />
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    {card.session_id ? card.session_id.substring(0, 8) : 'ID n/a'}...
                                                </span>
                                            </div>
                                            {card.metadata?.avg_response_sec && (
                                                <div className="flex items-center gap-1 text-[8px] text-slate-500 font-mono">
                                                    <Clock className="w-2 h-2" />
                                                    TMR: {card.metadata.avg_response_sec}s
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onViewAudit?.(card.session_id)}
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
    );
};

export default WorkerKanbanBoard;
