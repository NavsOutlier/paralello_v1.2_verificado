import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Calendar, Clock, Send, Plus, Trash2, Edit2, CheckCircle, XCircle,
    AlertCircle, CalendarDays, Video, CreditCard, Bell, MessageSquare
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
            case 'holiday': return <CalendarDays className="w-4 h-4 text-orange-500" />;
            case 'meeting': return <Video className="w-4 h-4 text-blue-500" />;
            case 'payment': return <CreditCard className="w-4 h-4 text-green-500" />;
            case 'reminder': return <Bell className="w-4 h-4 text-purple-500" />;
            default: return <MessageSquare className="w-4 h-4 text-slate-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Pendente
                </span>;
            case 'sent':
                return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Enviado
                </span>;
            case 'failed':
                return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Falhou
                </span>;
            case 'cancelled':
                return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold flex items-center gap-1">
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
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingMessage(undefined);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800">Disparos Agendados</h3>
                    <span className="text-xs text-slate-400">({messages.length})</span>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Novo Disparo
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            ) : messages.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Nenhum disparo agendado para este cliente.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 text-indigo-600 text-sm font-bold hover:underline"
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
                                className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-all ${msg.status === 'cancelled' ? 'opacity-50' : ''
                                    }`}
                            >
                                {/* Category Icon */}
                                <div className="p-2 bg-slate-50 rounded-lg">
                                    {getCategoryIcon(msg.category)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-slate-400">
                                            {dt.date} às {dt.time}
                                        </span>
                                        {getStatusBadge(msg.status)}
                                    </div>
                                    <p className="text-sm text-slate-700 line-clamp-2">
                                        {msg.message}
                                    </p>
                                </div>

                                {/* Actions */}
                                {isPending && !isPast && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEdit(msg)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleCancel(msg.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
                                            title="Cancelar"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                {(msg.status === 'sent' || msg.status === 'cancelled' || msg.status === 'failed') && (
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
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
                />
            )}
        </div>
    );
};
