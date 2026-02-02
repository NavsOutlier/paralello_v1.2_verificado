import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Sparkles, Check, X, Send, Clock, Eye, Trash2, ChevronDown, ChevronUp, Loader2, RefreshCw
} from 'lucide-react';
import { ActiveSuggestion } from '../../types/automation';

interface ActiveSuggestionQueueProps {
    clientId?: string; // Optional - if provided, filter by client
}

export const ActiveSuggestionQueue: React.FC<ActiveSuggestionQueueProps> = ({
    clientId
}) => {
    const { organizationId, user } = useAuth();
    const [suggestions, setSuggestions] = useState<(ActiveSuggestion & { client?: { name: string } })[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchSuggestions = async () => {
        if (!organizationId) return;

        setLoading(true);
        let query = supabase
            .from('active_suggestions')
            .select(`
                *,
                client:clients(name)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching suggestions:', error);
        } else {
            setSuggestions(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSuggestions();
    }, [organizationId, clientId]);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('active_suggestions')
                .update({
                    status: 'approved',
                    approved_by: user?.id,
                    approved_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            // Trigger automation immediately to send the message
            await supabase.functions.invoke('process-automation');

            fetchSuggestions();
        } catch (err) {
            console.error('Error approving suggestion:', err);
            alert('Erro ao aprovar sugestão');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('active_suggestions')
                .update({ status: 'rejected' })
                .eq('id', id);

            if (error) throw error;
            fetchSuggestions();
        } catch (err) {
            console.error('Error rejecting suggestion:', err);
            alert('Erro ao rejeitar sugestão');
        } finally {
            setProcessingId(null);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4">
            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                </div>
            ) : suggestions.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-xl border border-dashed border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
                        <Sparkles className="w-8 h-8 text-violet-400" />
                    </div>
                    <h4 className="text-slate-300 font-black text-sm uppercase tracking-widest mb-2">Tudo em dia!</h4>
                    <p className="text-slate-500 text-xs font-medium max-w-xs mx-auto">
                        Nenhuma sugestão pendente no momento. As próximas sugestões aparecerão aqui conforme agendado.
                    </p>
                    <button
                        onClick={fetchSuggestions}
                        className="mt-4 text-xs font-black text-violet-400 hover:text-violet-300 flex items-center justify-center gap-2 mx-auto uppercase tracking-widest"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Verificar novamente
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {suggestions.map((suggestion) => {
                        const isExpanded = expandedId === suggestion.id;
                        const isProcessing = processingId === suggestion.id;

                        return (
                            <div
                                key={suggestion.id}
                                className={`bg-slate-900/40 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-200
                                    ${isExpanded ? 'border-violet-500/30 ring-2 ring-violet-500/10' : 'border-white/5 hover:border-violet-500/20'}
                                `}
                            >
                                {/* Header Row */}
                                <div
                                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => toggleExpand(suggestion.id)}
                                >
                                    <div className={`p-2.5 rounded-xl transition-colors ${isExpanded ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white' : 'bg-violet-500/10 text-violet-400'
                                        }`}>
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-white text-sm">
                                                {suggestion.client?.name || 'Cliente'}
                                            </span>
                                            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                Pendente
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 truncate font-medium">
                                            {suggestion.suggested_message.substring(0, 80)}...
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            {formatDate(suggestion.created_at)}
                                        </span>
                                        <div className={`p-1.5 rounded-xl transition-transform duration-200 ${isExpanded ? 'bg-violet-500/20 rotate-180' : 'bg-white/5'}`}>
                                            <ChevronDown className={`w-4 h-4 ${isExpanded ? 'text-violet-400' : 'text-slate-500'}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 p-5 space-y-6 bg-slate-950/30">
                                        {/* Context Summary */}
                                        {suggestion.context_summary && (
                                            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-4 flex gap-3">
                                                <div className="mt-0.5">
                                                    <div className="w-6 h-6 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20">
                                                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Contexto Analisado</h5>
                                                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                                        {suggestion.context_summary}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggested Message Options */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    Escolha a melhor opção
                                                </label>
                                                <span className="text-[9px] bg-white/5 text-slate-400 px-3 py-1 rounded-lg border border-white/5 font-bold uppercase tracking-widest">
                                                    {suggestion.suggested_options?.length || 1} opções
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                {(suggestion.suggested_options && suggestion.suggested_options.length > 0) ? (
                                                    suggestion.suggested_options.map((option: string, index: number) => (
                                                        <button
                                                            key={index}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                supabase
                                                                    .from('active_suggestions')
                                                                    .update({ suggested_message: option })
                                                                    .eq('id', suggestion.id)
                                                                    .then(() => fetchSuggestions());
                                                            }}
                                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all relative group ${suggestion.suggested_message === option
                                                                ? 'border-violet-500/50 bg-violet-500/10 shadow-lg ring-4 ring-violet-500/10 z-10'
                                                                : 'border-white/5 bg-slate-900/50 hover:border-violet-500/30 hover:shadow-sm'
                                                                }`}
                                                        >
                                                            <div className="flex gap-4">
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${suggestion.suggested_message === option
                                                                    ? 'border-violet-500 bg-violet-500'
                                                                    : 'border-slate-600 group-hover:border-violet-500/50'
                                                                    }`}>
                                                                    {suggestion.suggested_message === option && (
                                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                                    )}
                                                                </div>
                                                                <p className={`text-sm leading-relaxed ${suggestion.suggested_message === option ? 'text-slate-200 font-medium' : 'text-slate-400'
                                                                    }`}>
                                                                    {option}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                                                        <p className="text-sm text-slate-300 whitespace-pre-wrap font-medium">
                                                            {suggestion.suggested_message}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3 pt-4 border-t border-white/5 mt-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleReject(suggestion.id);
                                                }}
                                                disabled={isProcessing}
                                                className="px-6 py-2.5 bg-slate-800 border border-white/5 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                                            >
                                                <X className="w-4 h-4" />
                                                Rejeitar
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleApprove(suggestion.id);
                                                }}
                                                disabled={isProcessing}
                                                className="flex-1 py-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                                {isProcessing ? 'Enviando...' : 'Aprovar e Enviar'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
