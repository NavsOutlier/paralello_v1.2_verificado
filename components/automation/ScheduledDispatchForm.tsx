import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Calendar, Clock, Send, X, MessageSquare, Video, CreditCard, Bell, CalendarDays, Copy,
    FileText, Bookmark, Loader2
} from 'lucide-react';
import { ScheduledMessage, MESSAGE_CATEGORIES } from '../../types/automation';
import { ClientSelector } from './ClientSelector';
import { VariableInsert } from './VariableInsert';
import { TemplateLibrary } from './TemplateLibrary';

interface ScheduledDispatchFormProps {
    clientId?: string;
    clientName?: string;
    onClose: () => void;
    onSuccess?: () => void;
    editingMessage?: ScheduledMessage;
    duplicateMode?: boolean;
}

export const ScheduledDispatchForm: React.FC<ScheduledDispatchFormProps> = ({
    clientId,
    clientName,
    onClose,
    onSuccess,
    editingMessage,
    duplicateMode = false
}) => {
    const { organizationId, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Client selection
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
        clientId ? [clientId] : []
    );

    // Form state
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('09:00');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<ScheduledMessage['category']>('reminder');

    // Initialize from editing/duplicating message if provided
    useEffect(() => {
        if (editingMessage) {
            const dt = new Date(editingMessage.scheduled_at);
            setScheduledDate(dt.toISOString().split('T')[0]);
            setScheduledTime(dt.toTimeString().slice(0, 5));
            setMessage(editingMessage.message);
            setCategory(editingMessage.category);

            if (!duplicateMode) {
                setSelectedClientIds([editingMessage.client_id]);
            }
        }
    }, [editingMessage, duplicateMode]);

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'holiday': return <CalendarDays className="w-4 h-4" />;
            case 'meeting': return <Video className="w-4 h-4" />;
            case 'payment': return <CreditCard className="w-4 h-4" />;
            case 'reminder': return <Bell className="w-4 h-4" />;
            default: return <MessageSquare className="w-4 h-4" />;
        }
    };

    const handleTemplateSelect = (selectedTemplate: any) => {
        setMessage(selectedTemplate.content);
        if (selectedTemplate.category) {
            setCategory(selectedTemplate.category as ScheduledMessage['category']);
        }
        setShowTemplates(false);
    };

    const handleSaveAsTemplate = async () => {
        if (!organizationId || !message.trim()) return;

        const templateName = prompt('Nome do template:', `Template ${category}`);
        if (!templateName) return;

        const { error } = await supabase
            .from('automation_templates')
            .insert({
                organization_id: organizationId,
                name: templateName,
                type: 'dispatch',
                category,
                content: message,
                created_by: user?.id
            });

        if (error) {
            console.error('Error saving template:', error);
            alert('Erro ao salvar template');
        } else {
            alert('Template salvo com sucesso!');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId || !message.trim() || !scheduledDate || selectedClientIds.length === 0) return;

        setLoading(true);
        try {
            const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

            if (editingMessage && !duplicateMode) {
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
                const inserts = selectedClientIds.map(cId => ({
                    organization_id: organizationId,
                    client_id: cId,
                    scheduled_at: scheduledAt,
                    message: message.trim(),
                    category,
                    created_by: user?.id
                }));

                const { error } = await supabase
                    .from('scheduled_messages')
                    .insert(inserts);

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

    const isEditing = editingMessage && !duplicateMode;
    const title = duplicateMode
        ? 'Duplicar Disparo'
        : editingMessage
            ? 'Editar Disparo'
            : 'Novo Disparo Agendado';

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-[#0d121f] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 w-full max-w-lg animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#0d121f] z-10">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${duplicateMode ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-indigo-500/10 border border-indigo-500/20'}`}>
                                {duplicateMode ? (
                                    <Copy className="w-5 h-5 text-orange-400" />
                                ) : (
                                    <Send className="w-5 h-5 text-indigo-400" />
                                )}
                            </div>
                            <div>
                                <h2 className="font-black text-white">{title}</h2>
                                {isEditing && clientName && (
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cliente: {clientName}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowTemplates(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Template
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Client Selection */}
                        {!isEditing && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    Cliente(s)
                                    {duplicateMode && (
                                        <span className="text-orange-400">(selecione destino)</span>
                                    )}
                                </label>
                                <ClientSelector
                                    selectedClientIds={selectedClientIds}
                                    onChange={setSelectedClientIds}
                                    mode="multiple"
                                    currentClientId={clientId}
                                    excludeClientIds={duplicateMode && editingMessage ? [editingMessage.client_id] : []}
                                />
                            </div>
                        )}

                        {/* Category */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Tipo de Mensagem
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {MESSAGE_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value as ScheduledMessage['category'])}
                                        className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all border ${category === cat.value
                                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                            : 'bg-slate-900/50 border-white/5 hover:bg-white/5 text-slate-500'
                                            }`}
                                    >
                                        {getCategoryIcon(cat.value)}
                                        <span className="text-[9px] font-black uppercase tracking-tight">
                                            {cat.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Data
                                </label>
                                <input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Horário
                                </label>
                                <input
                                    type="time"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Message with Variable Insert */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Mensagem
                                </label>
                                <button
                                    type="button"
                                    onClick={handleSaveAsTemplate}
                                    disabled={!message.trim()}
                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Bookmark className="w-3 h-3" />
                                    Salvar Template
                                </button>
                            </div>

                            {/* Variable Insert Chips */}
                            <VariableInsert
                                textareaRef={textareaRef}
                                value={message}
                                onChange={setMessage}
                                filterCategory="cliente"
                            />

                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Digite a mensagem que será enviada..."
                                rows={5}
                                required
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none resize-none placeholder:text-slate-600"
                            />
                        </div>

                        {/* Info for multiple selection */}
                        {selectedClientIds.length > 1 && (
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                                <p className="text-xs text-indigo-300 font-medium">
                                    <strong>Nota:</strong> Será criado um disparo separado para cada um dos {selectedClientIds.length} clientes selecionados.
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-800 border border-white/5 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !message.trim() || !scheduledDate || selectedClientIds.length === 0}
                                className={`flex-1 py-3 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg ${duplicateMode ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/20' : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/20'
                                    }`}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : duplicateMode ? (
                                    <Copy className="w-4 h-4" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {loading
                                    ? 'Salvando...'
                                    : duplicateMode
                                        ? `Duplicar (${selectedClientIds.length})`
                                        : isEditing
                                            ? 'Atualizar'
                                            : selectedClientIds.length > 1
                                                ? `Agendar (${selectedClientIds.length})`
                                                : 'Agendar'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Template Library Modal */}
            {showTemplates && (
                <TemplateLibrary
                    type="dispatch"
                    onSelect={handleTemplateSelect}
                    onClose={() => setShowTemplates(false)}
                />
            )}
        </>
    );
};
