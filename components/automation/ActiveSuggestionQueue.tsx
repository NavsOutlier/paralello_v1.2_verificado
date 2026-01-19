import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Sparkles, Check, X, Send, Clock, Eye, Trash2, ChevronDown, ChevronUp
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-slate-800">Sugestões Pendentes</h3>
                    <span className="text-xs text-slate-400">({suggestions.length})</span>
                </div>
                <button
                    onClick={fetchSuggestions}
                    className="text-xs text-purple-600 font-bold hover:underline"
                >
                    Atualizar
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                </div>
            ) : suggestions.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                    <h4 className="text-slate-700 font-bold mb-1">Tudo em dia!</h4>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                        Nenhuma sugestão pendente no momento. As próximas sugestões aparecerão aqui conforme agendado.
                    </p>
                    <button
                        onClick={fetchSuggestions}
                        className="mt-4 text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center justify-center gap-1 mx-auto"
                    >
                        <Clock className="w-3 h-3" />
                        Verificar novamente
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {suggestions.map((suggestion) => {
                        const isExpanded = expandedId === suggestion.id;
                        const isProcessing = processingId === suggestion.id;

                        return (
                            <div
                                key={suggestion.id}
                                className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 shadow-sm
                                    ${isExpanded ? 'border-purple-200 ring-2 ring-purple-100' : 'border-slate-200 hover:border-purple-200 hover:shadow-md'}
                                `}
                            >
                                {/* Header Row */}
                                <div
                                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => toggleExpand(suggestion.id)}
                                >
                                    <div className={`p-2.5 rounded-xl transition-colors ${isExpanded ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600'
                                        }`}>
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-slate-800">
                                                {suggestion.client?.name || 'Cliente'}
                                            </span>
                                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                                Pendente
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate font-medium">
                                            {suggestion.suggested_message.substring(0, 80)}...
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-medium text-slate-400">
                                            {formatDate(suggestion.created_at)}
                                        </span>
                                        <div className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'bg-purple-100 rotate-180' : 'bg-slate-100'}`}>
                                            <ChevronDown className={`w-4 h-4 ${isExpanded ? 'text-purple-600' : 'text-slate-400'}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-5 space-y-6 bg-slate-50/30">
                                        {/* Context Summary */}
                                        {suggestion.context_summary && (
                                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3">
                                                <div className="mt-0.5">
                                                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <Eye className="w-3 h-3 text-blue-600" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <h5 className="text-xs font-bold text-blue-700 uppercase">Contexto Analisado</h5>
                                                    <p className="text-sm text-slate-700 leading-relaxed">
                                                        {suggestion.context_summary}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggested Message Options */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    Escolha a melhor opção
                                                </label>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                                    {suggestion.suggested_options?.length || 1} opções geradas
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
                                                                    ? 'border-purple-500 bg-white shadow-md ring-4 ring-purple-500/10 z-10'
                                                                    : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-sm'
                                                                }`}
                                                        >
                                                            <div className="flex gap-4">
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${suggestion.suggested_message === option
                                                                        ? 'border-purple-500 bg-purple-500'
                                                                        : 'border-slate-300 group-hover:border-purple-300'
                                                                    }`}>
                                                                    {suggestion.suggested_message === option && (
                                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                                    )}
                                                                </div>
                                                                <p className={`text-sm leading-relaxed ${suggestion.suggested_message === option ? 'text-slate-800 font-medium' : 'text-slate-600'
                                                                    }`}>
                                                                    {option}
                                                                </p>
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                            {suggestion.suggested_message}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3 pt-2 border-t border-slate-200/50 mt-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleReject(suggestion.id);
                                                }}
                                                disabled={isProcessing}
                                                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50 flex items-center gap-2"
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
                                                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isProcessing ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                                {isProcessing ? 'Enviando...' : 'Aprovar e Enviar Agora'}
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
