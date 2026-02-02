import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Calendar, Clock, Send, Plus, Trash2, Edit2, CheckCircle, XCircle,
    AlertCircle, CalendarDays, Video, CreditCard, Bell, MessageSquare, Copy, Loader2
} from 'lucide-react';
import { ScheduledMessage } from '../../types/automation';
import { ScheduledDispatchForm } from './ScheduledDispatchForm';

interface ScheduledDispatchListProps {
    clientId: string;
    clientName: string;
}

export const ScheduledDispatchList: React.FC<ScheduledDispatchListProps> = ({
    clientId,
    clientName
}) => {
    const { organizationId } = useAuth();
    const [messages, setMessages] = useState<ScheduledMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingMessage, setEditingMessage] = useState<ScheduledMessage | undefined>();
    const [duplicatingMessage, setDuplicatingMessage] = useState<ScheduledMessage | undefined>();

    const fetchMessages = async () => {
        if (!organizationId || !clientId) return;

        setLoading(true);
        const { data, error } = await supabase
            .from('scheduled_messages')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('client_id', clientId)
            .order('scheduled_at', { ascending: true });

        if (error) {
            console.error('Error fetching scheduled messages:', error);
        } else {
            setMessages(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMessages();
    }, [organizationId, clientId]);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este disparo?')) return;

        const { error } = await supabase
            .from('scheduled_messages')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting message:', error);
            alert('Erro ao excluir mensagem');
        } else {
            fetchMessages();
        }
    };

    const handleCancel = async (id: string) => {
        const { error } = await supabase
            .from('scheduled_messages')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) {
            console.error('Error cancelling message:', error);
            alert('Erro ao cancelar mensagem');
        } else {
            fetchMessages();
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'holiday': return <CalendarDays className="w-4 h-4 text-orange-400" />;
            case 'meeting': return <Video className="w-4 h-4 text-blue-400" />;
            case 'payment': return <CreditCard className="w-4 h-4 text-emerald-400" />;
            case 'reminder': return <Bell className="w-4 h-4 text-violet-400" />;
            default: return <MessageSquare className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Programada
                </span>;
            case 'sent':
                return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" /> Enviado
                </span>;
            case 'failed':
                return <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" /> Falhou
                </span>;
            case 'cancelled':
                return <span className="px-2.5 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <XCircle className="w-3 h-3" /> Cancelado
                </span>;
            default:
                return null;
        }
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return {
            date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const handleEdit = (msg: ScheduledMessage) => {
        setEditingMessage(msg);
        setDuplicatingMessage(undefined);
        setShowForm(true);
    };

    const handleDuplicate = (msg: ScheduledMessage) => {
        setDuplicatingMessage(msg);
        setEditingMessage(msg);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingMessage(undefined);
        setDuplicatingMessage(undefined);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Send className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-black text-white tracking-tight">Disparos Agendados</h3>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">({messages.length})</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Novo Disparo
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
            ) : messages.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-10 text-center border border-white/5 shadow-2xl">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                        <Calendar className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400 text-sm font-bold">Nenhum disparo agendado para este cliente.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 text-indigo-400 text-xs font-black uppercase tracking-widest hover:underline"
                    >
                        Agendar primeiro disparo
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {messages.map((msg) => {
                        const dt = formatDateTime(msg.scheduled_at);
                        const isPending = msg.status === 'pending';
                        const isPast = new Date(msg.scheduled_at) < new Date();

                        return (
                            <div
                                key={msg.id}
                                className={`bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex items-start gap-4 transition-all hover:border-white/10 ${msg.status === 'cancelled' ? 'opacity-50' : ''
                                    }`}
                            >
                                {/* Category Icon */}
                                <div className="p-2.5 bg-slate-800 rounded-xl border border-white/5">
                                    {getCategoryIcon(msg.category)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {dt.date} às {dt.time}
                                        </span>
                                        {getStatusBadge(msg.status)}
                                    </div>
                                    <p className="text-sm text-slate-300 line-clamp-2 font-medium">
                                        {msg.message}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    {/* Duplicate Button - Always visible for pending/sent */}
                                    {(msg.status === 'pending' || msg.status === 'sent') && (
                                        <button
                                            onClick={() => handleDuplicate(msg)}
                                            className="p-2.5 hover:bg-orange-500/10 rounded-xl transition-colors text-slate-500 hover:text-orange-400"
                                            title="Duplicar para outros clientes"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    )}

                                    {isPending && !isPast && (
                                        <>
                                            <button
                                                onClick={() => handleEdit(msg)}
                                                className="p-2.5 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-slate-300"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleCancel(msg.id)}
                                                className="p-2.5 hover:bg-rose-500/10 rounded-xl transition-colors text-slate-500 hover:text-rose-400"
                                                title="Cancelar"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {(msg.status === 'sent' || msg.status === 'cancelled' || msg.status === 'failed') && (
                                        <button
                                            onClick={() => handleDelete(msg.id)}
                                            className="p-2.5 hover:bg-rose-500/10 rounded-xl transition-colors text-slate-500 hover:text-rose-400"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <ScheduledDispatchForm
                    clientId={clientId}
                    clientName={clientName}
                    onClose={handleFormClose}
                    onSuccess={fetchMessages}
                    editingMessage={editingMessage}
                    duplicateMode={!!duplicatingMessage}
                />
            )}
        </div>
    );
};
