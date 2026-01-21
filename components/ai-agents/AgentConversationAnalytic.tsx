
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Search, Filter, Calendar, MessageSquare,
    User, ChevronRight, AlertCircle, CheckCircle,
    XCircle, Info, RefreshCw, Star
} from 'lucide-react';
import { AIConversation } from '../../types/ai-agents';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgentConversationAnalyticProps {
    agentId: string;
}

export const AgentConversationAnalytic: React.FC<AgentConversationAnalyticProps> = ({ agentId }) => {
    const [conversations, setConversations] = useState<AIConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sentimentFilter, setSentimentFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

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
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query.limit(50);

        if (error) {
            console.error('Error fetching conversations:', error);
        } else {
            setConversations(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchConversations();
    }, [agentId, sentimentFilter, statusFilter]);

    const filteredConversations = conversations.filter(c =>
        c.contact_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'negative': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'neutral': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    return (
        <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-violet-400" />
                        Analítico de Sessões
                    </h3>
                    <p className="text-slate-400 text-sm">Exploração granular de atendimentos e KPIs individuais</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar contato ou resumo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                    </div>

                    {/* Sentiment Filter */}
                    <select
                        value={sentimentFilter}
                        onChange={(e) => setSentimentFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none"
                    >
                        <option value="all">Sentimento (Todos)</option>
                        <option value="positive">Positivo</option>
                        <option value="neutral">Neutro</option>
                        <option value="negative">Negativo</option>
                    </select>

                    <button
                        onClick={fetchConversations}
                        className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                    <thead>
                        <tr className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest">
                            <th className="px-4 py-2">Contato</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Sentimento</th>
                            <th className="px-4 py-2">Eficiência</th>
                            <th className="px-4 py-2">Última Interação</th>
                            <th className="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="h-12 bg-slate-800/30 rounded-xl mb-2"></td>
                                </tr>
                            ))
                        ) : filteredConversations.map((conv) => (
                            <tr key={conv.id} className="group bg-slate-800/30 hover:bg-slate-800 transition-colors rounded-xl overflow-hidden">
                                <td className="px-4 py-4 rounded-l-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{conv.contact_name || 'Anônimo'}</p>
                                            <p className="text-slate-500 text-xs">{conv.contact_identifier}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${conv.status === 'scheduled' ? 'bg-emerald-500/20 text-emerald-400' :
                                            conv.status === 'disqualified' ? 'bg-rose-500/20 text-rose-400' :
                                                'bg-slate-700 text-slate-300'
                                        }`}>
                                        {conv.status}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${getSentimentColor(conv.sentiment)}`}>
                                        <Star className="w-3 h-3 fill-current" />
                                        {conv.sentiment ? conv.sentiment.charAt(0).toUpperCase() + conv.sentiment.slice(1) : 'Não Avaliado'}
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 uppercase">Tokens</span>
                                            <span className="text-white font-mono">{conv.session_metrics?.tokens_total?.toLocaleString() || '-'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 uppercase">SLA</span>
                                            <span className="text-white font-mono">{conv.session_metrics?.avg_response_sec?.toFixed(1) || '-'}s</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-slate-400">
                                    {format(parseISO(conv.last_interaction_at), "dd MMM, HH:mm", { locale: ptBR })}
                                </td>
                                <td className="px-4 py-4 rounded-r-xl text-right">
                                    <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {!loading && filteredConversations.length === 0 && (
                    <div className="text-center py-10 text-slate-500 italic">
                        Nenhuma conversa encontrada com os filtros atuais.
                    </div>
                )}
            </div>
        </div>
    );
};
