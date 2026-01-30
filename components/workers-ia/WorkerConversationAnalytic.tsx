
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Search, Filter, Calendar, MessageSquare,
    User, ChevronRight, AlertCircle, CheckCircle,
    XCircle, Info, RefreshCw, Star
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkerConversation {
    id: string;
    session_id: string;
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

interface WorkerConversationAnalyticProps {
    agentId: string;
}

export const WorkerConversationAnalytic: React.FC<WorkerConversationAnalyticProps> = ({ agentId }) => {
    const [conversations, setConversations] = useState<WorkerConversation[]>([]);
    const [loading, setLoading] = useState(true);
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

            if (error) {
                console.error('Error fetching conversations:', error);
            } else {
                setConversations(data || []);
            }
        } catch (error) {
            console.error('Error in fetchConversations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [agentId, stageFilter]);

    const filteredConversations = conversations.filter(c =>
        (c.session_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.contact_info?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.summary?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const getSentimentColor = (score?: number) => {
        if (score === undefined || score === null) return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        if (score <= -0.1) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
        if (score < 0.2) return 'text-amber-400 bg-blue-500/10 border-blue-500/20';
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    };

    return (
        <div className="bg-slate-900/50 rounded-3xl border border-cyan-500/10 p-6 space-y-6 animate-in fade-in duration-500">
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

                    {/* Stage Filter */}
                    <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none"
                    >
                        <option value="all">Estágio (Todos)</option>
                        <option value="new_lead">Novos Leads</option>
                        <option value="qualified">Qualificados</option>
                        <option value="scheduled">Agendados</option>
                        <option value="disqualified">Desqualificados</option>
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
                            <th className="px-4 py-2">Contato / Sessão</th>
                            <th className="px-4 py-2">Resumo (IA)</th>
                            <th className="px-4 py-2">Fase</th>
                            <th className="px-4 py-2">Sentimento</th>
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
                                        <div className="max-w-[150px]">
                                            <p className="text-white font-medium truncate">{conv.contact_info?.name || 'Anônimo'}</p>
                                            <p className="text-slate-500 text-[10px] truncate font-mono">{conv.session_id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <p className="text-slate-300 text-xs italic line-clamp-2 max-w-sm">
                                        {conv.summary ? `"${conv.summary}"` : 'Sem resumo disponível.'}
                                    </p>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${conv.funnel_stage === 'scheduled' ? 'bg-emerald-500/20 text-emerald-400' :
                                        conv.funnel_stage === 'disqualified' ? 'bg-rose-500/20 text-rose-400' :
                                            'bg-slate-700 text-slate-300'
                                        }`}>
                                        {conv.funnel_stage?.replace('_', ' ') || 'Novo'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium ${getSentimentColor(conv.sentiment_score)}`}>
                                        <Star className="w-3 h-3 fill-current" />
                                        {conv.sentiment_score !== undefined && conv.sentiment_score !== null
                                            ? (conv.sentiment_score > 0 ? 'Positivo' : conv.sentiment_score < 0 ? 'Negativo' : 'Neutro')
                                            : 'Não Avaliado'}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-slate-400 text-xs">
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
