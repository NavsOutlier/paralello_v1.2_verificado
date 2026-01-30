import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Search, Filter, Calendar, MessageSquare,
    User, ChevronRight, AlertCircle, CheckCircle,
    XCircle, Info, RefreshCw, Star, ArrowLeft,
    Database, Bot, Cpu, Clock, Zap, Sparkles,
    Frown, Meh, Smile
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkerMessageAuditProps {
    agentId: string;
    initialSessionId?: string;
}

interface WorkerConversation {
    id: string;
    session_id: string;
    client_id: string;
    agent_id: string;
    summary: string;
    last_interaction_at: string;
    funnel_stage: string;
    sentiment_score: number;
    contact_info?: {
        name?: string;
        email?: string;
        phone?: string;
    };
}

interface WorkerMessage {
    id: string;
    session_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    metadata: any;
}

export const WorkerMessageAudit: React.FC<WorkerMessageAuditProps> = ({ agentId, initialSessionId }) => {
    const [conversations, setConversations] = useState<WorkerConversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<WorkerConversation | null>(null);
    const [messages, setMessages] = useState<WorkerMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stageFilter, setStageFilter] = useState<string>('all');

    const fetchConversations = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('workers_ia_conversations')
                .select('*')
                .eq('agent_id', agentId)
                .order('last_interaction_at', { ascending: false });

            if (stageFilter !== 'all') {
                query = query.eq('funnel_stage', stageFilter);
            }

            const { data, error } = await query.limit(50);

            if (error) throw error;
            setConversations(data || []);
        } catch (err) {
            console.error('Error fetching audit sessions:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (sessionId: string) => {
        setLoadingMessages(true);
        try {
            const { data, error } = await supabase
                .from('workers_ia_memory_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching session messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [agentId, stageFilter]);

    useEffect(() => {
        if (initialSessionId && conversations.length > 0) {
            const found = conversations.find(c => c.session_id === initialSessionId);
            if (found) {
                setSelectedConv(found);
            }
        }
    }, [initialSessionId, conversations]);

    useEffect(() => {
        if (selectedConv) {
            fetchMessages(selectedConv.session_id);
        }
    }, [selectedConv]);

    const filteredConversations = conversations.filter(c =>
        (c.session_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.contact_info?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.summary?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const getSentimentConfig = (score?: number) => {
        if (score === undefined || score === null) return { color: 'text-slate-500', icon: Meh, label: 'Neutro' };
        if (score <= -0.6) return { color: 'text-rose-500', icon: Frown, label: 'Muito Insatisfeito' };
        if (score <= -0.1) return { color: 'text-orange-400', icon: Frown, label: 'Insatisfeito' };
        if (score < 0.2) return { color: 'text-amber-400', icon: Meh, label: 'Neutro' };
        if (score < 0.6) return { color: 'text-emerald-400', icon: Smile, label: 'Satisfeito' };
        return { color: 'text-green-500', icon: Smile, label: 'Muito Satisfeito' };
    };

    if (selectedConv) {
        return (
            <div className="flex flex-col h-[700px] bg-slate-900/50 rounded-3xl border border-cyan-500/10 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Audit Header */}
                <div className="p-6 border-b border-cyan-500/10 bg-slate-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedConv(null)}
                            className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h3 className="text-white font-bold flex items-center gap-2">
                                {selectedConv.contact_info?.name || 'Visitante Anônimo'}
                                {(() => {
                                    const config = getSentimentConfig(selectedConv.sentiment_score);
                                    const Icon = config.icon;
                                    return (
                                        <span className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border border-current/20 ${config.color} bg-current/5`}>
                                            <Icon className="w-3 h-3" />
                                            {config.label}
                                        </span>
                                    );
                                })()}
                            </h3>
                            <p className="text-slate-500 text-xs font-mono">{selectedConv.session_id}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2 text-violet-400">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <p className="text-[10px] uppercase font-bold tracking-widest">Resumo da IA</p>
                        </div>
                        <p className="text-white text-xs max-w-[200px] md:max-w-md line-clamp-2 text-right italic opacity-80 leading-relaxed">
                            {selectedConv.summary ? `"${selectedConv.summary}"` : 'Aguardando processamento de resumo...'}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                            <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/10 text-violet-400 rounded-md border border-violet-500/20 uppercase font-bold tracking-wider">
                                {selectedConv.funnel_stage?.replace('_', ' ') || 'Novo Lead'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Messages Log */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#0a0f1a]/50">
                    {loadingMessages ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                            <p className="text-xs text-slate-500 animate-pulse uppercase tracking-widest">Carregando Diálogo...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-30">
                            <MessageSquare className="w-16 h-16 mb-4" />
                            <p className="italic">Nenhuma mensagem registrada nesta sessão.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-4 shadow-xl ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-tr-none'
                                    : 'bg-slate-800/80 text-slate-200 border border-cyan-500/10 rounded-tl-none backdrop-blur-sm'
                                    }`}>
                                    <div className="flex items-center justify-between gap-4 mb-2 text-[10px] opacity-60">
                                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest">
                                            {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-cyan-400" />}
                                            {msg.role === 'user' ? 'Lead' : 'Worker IA'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {format(parseISO(msg.created_at), "HH:mm")}
                                        </div>
                                    </div>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                    {msg.metadata && msg.role === 'assistant' && (
                                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-3 opacity-40 text-[9px] uppercase font-bold tracking-tighter">
                                            {msg.metadata.tokens_total && (
                                                <span className="flex items-center gap-1">
                                                    <Cpu className="w-2.5 h-2.5" />
                                                    {msg.metadata.tokens_total} tokens
                                                </span>
                                            )}
                                            {msg.metadata.latency_ms && (
                                                <span className="flex items-center gap-1">
                                                    <Zap className="w-2.5 h-2.5" />
                                                    {msg.metadata.latency_ms}ms
                                                </span>
                                            )}
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
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-cyan-400" />
                        Auditoria de Sessões
                    </h3>
                    <p className="text-slate-400 text-sm">Acompanhe o histórico de atendimentos e a performance do Worker</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
                        <input
                            type="text"
                            placeholder="Buscar por session_id, nome ou resumo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-cyan-500/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-violet-500/50 outline-none transition-all"
                        />
                    </div>

                    <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="bg-slate-800/50 border border-cyan-500/10 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                        <option value="all">Fase do Funil (Todas)</option>
                        <option value="new_lead">Novos Leads</option>
                        <option value="qualified">Qualificados</option>
                        <option value="proposal">Em Proposta</option>
                        <option value="scheduled">Agendados</option>
                    </select>

                    <button
                        onClick={fetchConversations}
                        className="p-2 bg-slate-800/50 hover:bg-slate-700/50 border border-cyan-500/10 rounded-xl text-cyan-500 transition-colors"
                        title="Recarregar"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-44 bg-slate-800/20 rounded-2xl border border-cyan-500/5 animate-pulse"></div>
                    ))
                ) : filteredConversations.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                        <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500">Nenhuma sessão encontrada para os filtros aplicados.</p>
                    </div>
                ) : (
                    filteredConversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => setSelectedConv(conv)}
                            className="p-5 bg-slate-900/40 hover:bg-slate-800/60 border border-cyan-500/10 hover:border-violet-500/50 rounded-2xl text-left transition-all group relative overflow-hidden shadow-lg"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                                    <User className="w-5 h-5" />
                                </div>
                                {(() => {
                                    const config = getSentimentConfig(conv.sentiment_score);
                                    const Icon = config.icon;
                                    return (
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase ${config.color} border-current/20 bg-current/5 tracking-tighter shadow-[0_0_10px_currentColor] shadow-opacity-10`}>
                                            <Icon className="w-3 h-3" />
                                            {config.label}
                                        </div>
                                    );
                                })()}
                            </div>

                            <h4 className="text-white font-bold truncate mb-1">
                                {conv.contact_info?.name || 'Visitante Anônimo'}
                            </h4>
                            <p className="text-slate-500 text-[10px] font-mono mb-4">{conv.session_id}</p>

                            <div className="bg-slate-950/40 rounded-xl p-3 mb-4 border border-white/5">
                                <p className="text-slate-400 text-xs line-clamp-2 italic leading-relaxed">
                                    {conv.summary ? `"${conv.summary}"` : 'Sem resumo disponível para esta sessão.'}
                                </p>
                            </div>

                            <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-widest pt-3 border-t border-white/5">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(parseISO(conv.last_interaction_at), "dd/MM HH:mm")}
                                </span>
                                <span className="flex items-center gap-1 group-hover:text-violet-400 transition-colors">
                                    Ver Chat <ChevronRight className="w-3 h-3" />
                                </span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};
