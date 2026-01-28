import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Search, MessageSquare, Clock, Cpu,
    User, Bot, ArrowRight, Database, Filter
} from 'lucide-react';

interface WorkerMessageAuditProps {
    agentId: string;
}

interface AuditMessage {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    message: string;
    created_at: string;
    session_id: string;
    token_total: number;
    ai_model: string;
    response_time_ms: number;
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

export const WorkerMessageAudit: React.FC<WorkerMessageAuditProps> = ({ agentId }) => {
    const [messages, setMessages] = useState<AuditMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'user' | 'assistant'>('all');

    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true);
            try {
                // Fetch recent messages linked to this agent context
                // Note: Since messages are linked to conversations, and conversations are linked to agents/clients via n8n logic,
                // we might need to filter by client_id if we had it, or just show all for the organization/client context.
                // For now, we will fetch the last 100 messages from the table.
                // TODO: Enhance filtering to be strictly specific to this 'agentId' if the relationship is direct.
                // Currently assuming the dashboard context 'selectedClient' filters the view, but here we query purely on the table.

                let query = supabase
                    .from('workers_ia_messages')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (filterRole !== 'all') {
                    query = query.eq('role', filterRole);
                }

                const { data, error } = await query;

                if (error) throw error;

                // Client-side filtering for search term since Supabase ILIKE can be heavy on all columns
                const filtered = (data || []).filter(msg =>
                    (msg.message?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                    (msg.session_id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
                );

                setMessages(filtered);

            } catch (err) {
                console.error('Error fetching audit logs:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [agentId, searchTerm, filterRole]); // Re-fetch when filters change is simple for now

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-cyan-400" />
                        Auditoria de Mensagens
                    </h3>
                    <p className="text-sm text-slate-400">
                        Histórico detalhado de interações e consumo de tokens
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar conteúdo ou ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:outline-none w-64"
                        />
                    </div>

                    <div className="flex bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
                        <button
                            onClick={() => setFilterRole('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filterRole === 'all'
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterRole('user')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filterRole === 'user'
                                    ? 'bg-violet-500/20 text-violet-400'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Usuário
                        </button>
                        <button
                            onClick={() => setFilterRole('assistant')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filterRole === 'assistant'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Bot
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/80 border-b border-cyan-500/10 text-xs uppercase tracking-wider text-slate-400">
                                <th className="p-4 font-medium">Data / Hora</th>
                                <th className="p-4 font-medium">Participante</th>
                                <th className="p-4 font-medium w-1/2">Mensagem</th>
                                <th className="p-4 font-medium text-center">Modelo</th>
                                <th className="p-4 font-medium text-center">Tokens</th>
                                <th className="p-4 font-medium text-right">Latência</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-500/5 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                            Carregando logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : messages.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        Nenhuma mensagem encontrada para os filtros atuais.
                                    </td>
                                </tr>
                            ) : (
                                messages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="p-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                                            {formatDate(msg.created_at)}
                                            <div className="text-[10px] opacity-50 mt-1 truncate max-w-[100px]" title={msg.session_id}>
                                                {msg.session_id}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {msg.role === 'assistant' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                                                    <Bot className="w-3 h-3" />
                                                    IA Worker
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs font-medium border border-violet-500/20">
                                                    <User className="w-3 h-3" />
                                                    Cliente
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="text-slate-300 line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                                                {msg.message}
                                            </p>
                                        </td>
                                        <td className="p-4 text-center">
                                            {msg.ai_model ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                                                    <Cpu className="w-3 h-3" />
                                                    {msg.ai_model}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center font-mono text-slate-400">
                                            {msg.token_total ? msg.token_total.toLocaleString() : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            {msg.response_time_ms ? (
                                                <span className={`font-mono text-xs ${msg.response_time_ms > 2000 ? 'text-amber-400' : 'text-green-400'
                                                    }`}>
                                                    {msg.response_time_ms}ms
                                                </span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
