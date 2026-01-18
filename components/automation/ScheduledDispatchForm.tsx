import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
    Calendar, Clock, Send, X, MessageSquare, Video, CreditCard, Bell, CalendarDays
} from 'lucide-react';
import { ScheduledMessage, MESSAGE_CATEGORIES } from '../../types/automation';

interface ScheduledDispatchFormProps {
    clientId: string;
    clientName: string;
    onClose: () => void;
    onSuccess?: () => void;
    editingMessage?: ScheduledMessage;
}

export const ScheduledDispatchForm: React.FC<ScheduledDispatchFormProps> = ({
    clientId,
    clientName,
    onClose,
    onSuccess,
    editingMessage
}) => {
    const { organizationId, profile } = useOrganization();
    const [loading, setLoading] = useState(false);

    // Form state
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('09:00');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<ScheduledMessage['category']>('reminder');

    // Initialize from editing message if provided
    useEffect(() => {
        if (editingMessage) {
            const dt = new Date(editingMessage.scheduled_at);
            setScheduledDate(dt.toISOString().split('T')[0]);
            setScheduledTime(dt.toTimeString().slice(0, 5));
            setMessage(editingMessage.message);
            setCategory(editingMessage.category);
        }
    }, [editingMessage]);

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'holiday': return <CalendarDays className="w-4 h-4" />;
            case 'meeting': return <Video className="w-4 h-4" />;
            case 'payment': return <CreditCard className="w-4 h-4" />;
            case 'reminder': return <Bell className="w-4 h-4" />;
            default: return <MessageSquare className="w-4 h-4" />;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId || !message.trim() || !scheduledDate) return;

        setLoading(true);
        try {
            const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

            if (editingMessage) {
                // Update existing
                const { error } = await supabase
                    .from('scheduled_messages')
                    .update({
                        scheduled_at: scheduledAt,
                        message: message.trim(),
                        category
                    })
                    .eq('id', editingMessage.id);

                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('scheduled_messages')
                    .insert({
                        organization_id: organizationId,
                        client_id: clientId,
                        scheduled_at: scheduledAt,
                        message: message.trim(),
                        category,
                        created_by: profile?.id
                    });

                if (error) throw error;
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error saving scheduled message:', err);
            alert('Erro ao salvar mensagem agendada');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Send className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">
                                {editingMessage ? 'Editar Disparo' : 'Novo Disparo Agendado'}
                            </h2>
                            <p className="text-xs text-slate-500">Cliente: {clientName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Tipo de Mensagem
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {MESSAGE_CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setCategory(cat.value as ScheduledMessage['category'])}
                                    className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${category === cat.value
                                        ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700'
                                        : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    {getCategoryIcon(cat.value)}
                                    <span className="text-[10px] font-bold uppercase tracking-tight">
                                        {cat.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                Data
                            </label>
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Horário
                            </label>
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Mensagem
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite a mensagem que será enviada..."
                            rows={4}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !message.trim() || !scheduledDate}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {loading ? 'Salvando...' : editingMessage ? 'Atualizar' : 'Agendar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
