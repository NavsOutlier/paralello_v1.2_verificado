import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    MoreHorizontal, Clock, AlertTriangle, CheckCircle,
    XCircle, Calendar, UserCheck, MessageSquare, GripVertical,
    Lock, Unlock, Filter, Search, RefreshCw
} from 'lucide-react';
import { AIConversation, ConversationStatus } from '../../types/ai-agents';

interface AgentKanbanBoardProps {
    agentId: string;
}

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

export const AgentKanbanBoard: React.FC<AgentKanbanBoardProps> = ({ agentId }) => {
    const [conversations, setConversations] = useState<AIConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [draggedItem, setDraggedItem] = useState<string | null>(null);

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

        // Subscribe to real-time updates
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

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItem(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, status: ConversationStatus) => {
        e.preventDefault();
        if (!draggedItem) return;

        const item = conversations.find(c => c.id === draggedItem);
        if (!item || item.status === status) return;

        // Optimistic update
        setConversations(prev => prev.map(c =>
            c.id === draggedItem ? { ...c, status } : c
        ));

        try {
            const { error } = await supabase
                .from('ai_conversations')
                .update({ status, is_manual_override: true }) // Moving manually triggers override
                .eq('id', draggedItem);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating status:', error);
            // Revert on error
            fetchConversations();
        } finally {
            setDraggedItem(null);
        }
    };

    const toggleOverride = async (id: string, current: boolean) => {
        // Optimistic update
        setConversations(prev => prev.map(c =>
            c.id === id ? { ...c, is_manual_override: !current } : c
        ));

        try {
            await supabase
                .from('ai_conversations')
                .update({ is_manual_override: !current })
                .eq('id', id);
        } catch (error) {
            console.error('Error toggling override:', error);
            fetchConversations();
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.contact_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col">
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
                            className={`w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-800/20 border border-slate-700/30 ${draggedItem ? 'border-dashed border-slate-600' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            {/* Column Header */}
                            <div className={`p-3 border-b border-slate-700/30 flex items-center justify-between ${col.bg} rounded-t-xl`}>
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
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, card.id)}
                                            className={`
                                                group bg-slate-800 border-l-2 p-3 rounded-lg shadow-sm cursor-move transition-all hover:shadow-md hover:bg-slate-750
                                                ${card.is_manual_override ? 'border-rose-500 bg-rose-500/5' : 'border-slate-600'}
                                            `}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                                        {card.contact_name?.[0] || card.contact_identifier[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white line-clamp-1">
                                                            {card.contact_name || card.contact_identifier}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {new Date(card.last_interaction_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => toggleOverride(card.id, card.is_manual_override)}
                                                    className={`p-1.5 rounded-md transition-colors ${card.is_manual_override
                                                        ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                                                        : 'text-slate-500 hover:bg-slate-700 hover:text-white'
                                                        }`}
                                                    title={card.is_manual_override ? "Controle Manual (IA Pausada)" : "Automático (IA Ativa)"}
                                                >
                                                    {card.is_manual_override ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                                </button>
                                            </div>

                                            {card.summary && (
                                                <p className="text-xs text-slate-400 mb-3 line-clamp-3 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                                    {card.summary}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare className="w-3 h-3 text-slate-500" />
                                                </div>
                                                {card.is_manual_override && (
                                                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                                        MANUAL
                                                    </span>
                                                )}
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
