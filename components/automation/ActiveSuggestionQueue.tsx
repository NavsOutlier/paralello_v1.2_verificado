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
                <div className="bg-slate-50 rounded-xl p-8 text-center">
                    <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Nenhuma sugestão pendente de aprovação.</p>
                    <p className="text-slate-400 text-xs mt-1">
                        Sugestões geradas pela IA aparecerão aqui.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {suggestions.map((suggestion) => {
                        const isExpanded = expandedId === suggestion.id;
                        const isProcessing = processingId === suggestion.id;

                        return (
                            <div
                                key={suggestion.id}
                                className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all"
                            >
                                {/* Header Row */}
                                <div
                                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50"
                                    onClick={() => toggleExpand(suggestion.id)}
                                >
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Sparkles className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800 text-sm">
                                                {suggestion.client?.name || 'Cliente'}
                                            </span>
                                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Pendente
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">
                                            {suggestion.suggested_message.substring(0, 100)}...
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">
                                            {formatDate(suggestion.created_at)}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                                        {/* Context Summary */}
                                        {suggestion.context_summary && (
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    Contexto Analisado
                                                </label>
                                                <p className="text-xs text-slate-600 bg-white rounded-lg p-3 border border-slate-200">
                                                    {suggestion.context_summary}
                                                </p>
                                            </div>
                                        )}

                                        {/* Suggested Message */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Mensagem Sugerida
                                            </label>
                                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                    {suggestion.suggested_message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => handleReject(suggestion.id)}
                                                disabled={isProcessing}
                                                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <X className="w-4 h-4" />
                                                Rejeitar
                                            </button>
                                            <button
                                                onClick={() => handleApprove(suggestion.id)}
                                                disabled={isProcessing}
                                                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Check className="w-4 h-4" />
                                                Aprovar e Enviar
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
