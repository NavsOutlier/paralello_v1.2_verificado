
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Search, Filter, Calendar, MessageSquare,
    User, ChevronRight, AlertCircle, CheckCircle,
    XCircle, Info, RefreshCw, Star, ArrowLeft
} from 'lucide-react';
import { AIConversation, AIConversationMessage } from '../../types/ai-agents';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgentConversationAuditProps {
    agentId: string;
}

export const AgentConversationAudit: React.FC<AgentConversationAuditProps> = ({ agentId }) => {
    const [conversations, setConversations] = useState<AIConversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<AIConversation | null>(null);
    const [messages, setMessages] = useState<AIConversationMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sentimentFilter, setSentimentFilter] = useState<string>('all');

    const fetchConversations = async () => {
        setLoading(true);
        let query = supabase
            .from('ai_conversations')
            .select('*')
            .eq('agent_id', agentId)
            .order('last_interaction_at', { ascending: false });

        if (sentimentFilter !== 'all') {
            query = query.eq('sentiment', sentimentFilter);
        }

        const { data, error } = await query.limit(50);

        if (error) {
            console.error('Error fetching conversations:', error);
        } else {
            setConversations(data || []);
        }
        setLoading(false);
    };

    const fetchMessages = async (convId: string) => {
        setLoadingMessages(true);
        const { data, error } = await supabase
            .from('ai_conversation_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            setMessages(data || []);
        }
        setLoadingMessages(false);
    };

    useEffect(() => {
        fetchConversations();
    }, [agentId, sentimentFilter]);

    useEffect(() => {
        if (selectedConv) {
            fetchMessages(selectedConv.id);
        }
    }, [selectedConv]);

    const filteredConversations = conversations.filter(c =>
        c.contact_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return 'text-emerald-400';
            case 'negative': return 'text-rose-400';
            case 'neutral': return 'text-blue-400';
            default: return 'text-slate-400';
        }
    };

    if (selectedConv) {
        return (
            <div className="flex flex-col h-[700px] bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Audit Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedConv(null)}
                            className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h3 className="text-white font-bold flex items-center gap-2">
                                {selectedConv.contact_name || 'Anônimo'}
                                <span className={`text-xs px-2 py-0.5 rounded-full border border-current/20 ${getSentimentColor(selectedConv.sentiment)}`}>
                                    {selectedConv.sentiment || 'Sem Sentimento'}
                                </span>
                            </h3>
                            <p className="text-slate-500 text-xs">{selectedConv.contact_identifier}</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Resumo da IA</p>
                        <p className="text-white text-sm max-w-md truncate">{selectedConv.summary || 'Sem resumo disponível'}</p>
                    </div>
                </div>

                {/* Messages Log */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loadingMessages ? (
                        <div className="flex items-center justify-center h-full">
                            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                            <p className="italic">Nenhum log de mensagem encontrado para esta sessão.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                                        ? 'bg-violet-600 text-white rounded-tr-none'
                                        : msg.role === 'assistant'
                                            ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                                            : 'bg-slate-900 text-slate-400 border border-slate-800 italic text-xs'
                                    }`}>
                                    <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-60">
                                        <span className="font-bold uppercase tracking-widest">{msg.role}</span>
                                        <span>{format(parseISO(msg.created_at), "HH:mm")}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    {msg.tokens_used > 0 && (
                                        <div className="mt-2 pt-2 border-t border-white/10 text-[9px] opacity-40 uppercase font-bold">
                                            {msg.tokens_used} tokens
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-400" />
                        Auditoria de Atendimentos
                    </h3>
                    <p className="text-slate-400 text-sm">Audite o histórico completo e a performance das conversas</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Pesquisar logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                    </div>

                    <select
                        value={sentimentFilter}
                        onChange={(e) => setSentimentFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none"
                    >
                        <option value="all">Sentimento (Todos)</option>
                        <option value="negative">Negativo (Auditoria Crítica)</option>
                        <option value="neutral">Neutro</option>
                        <option value="positive">Positivo</option>
                    </select>

                    <button
                        onClick={fetchConversations}
                        className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-40 bg-slate-800/30 rounded-2xl animate-pulse"></div>
                    ))
                ) : filteredConversations.map((conv) => (
                    <button
                        key={conv.id}
                        onClick={() => setSelectedConv(conv)}
                        className="p-5 bg-slate-800/30 hover:bg-slate-800 border border-slate-700/50 hover:border-violet-500/50 rounded-2xl text-left transition-all group relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                            <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${getSentimentColor(conv.sentiment)} border-current/20 bg-current/5`}>
                                {conv.sentiment || 'N/A'}
                            </div>
                        </div>

                        <h4 className="text-white font-bold truncate">{conv.contact_name || 'Anônimo'}</h4>
                        <p className="text-slate-500 text-xs mb-3">{conv.contact_identifier}</p>

                        <div className="bg-slate-900/50 rounded-lg p-2 mb-3">
                            <p className="text-slate-400 text-[11px] line-clamp-2 italic leading-relaxed">
                                "{conv.summary || 'Sem resumo disponível'}"
                            </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            <span>{format(parseISO(conv.last_interaction_at), "dd/MM HH:mm")}</span>
                            <span className="flex items-center gap-1 group-hover:text-violet-400 transition-colors">
                                Ver Chat <ChevronRight className="w-3 h-3" />
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {!loading && filteredConversations.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                    Nenhuma conversa encontrada para os filtros aplicados.
                </div>
            )}
        </div>
    );
};
