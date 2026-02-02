import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Sparkles, Clock, X, Save, Calendar, Users, CheckCircle2, Copy, Loader2
} from 'lucide-react';
import { ActiveAutomation, WEEKDAYS } from '../../types/automation';
import { ClientSelector } from './ClientSelector';

interface ActiveAutomationConfigProps {
    clientId?: string;
    clientName?: string;
    onClose: () => void;
    onSuccess?: () => void;
    editingAutomation?: ActiveAutomation;
    duplicateMode?: boolean;
}

export const ActiveAutomationConfig: React.FC<ActiveAutomationConfigProps> = ({
    clientId,
    clientName,
    onClose,
    onSuccess,
    editingAutomation,
    duplicateMode = false
}) => {
    const { organizationId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState<{ id: string, profile_id: string, profile?: { name?: string, email?: string } }[]>([]);

    // Client selection
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
        clientId ? [clientId] : []
    );

    // Form state
    const [name, setName] = useState('Atualização Semanal');
    const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
    const [timeOfDay, setTimeOfDay] = useState('09:00');
    const [contextDays, setContextDays] = useState(7);
    const [assignedApprover, setAssignedApprover] = useState<string>('');
    const [customPrompt, setCustomPrompt] = useState<string>('');

    // Fetch team members
    useEffect(() => {
        const fetchTeamMembers = async () => {
            if (!organizationId) {
                console.log('[ActiveAutomationConfig] No organizationId, skipping fetch');
                return;
            }
            console.log('[ActiveAutomationConfig] Fetching team members for org:', organizationId);
            const { data, error } = await supabase
                .from('team_members')
                .select('id, profile_id, profile:profiles!team_members_profile_id_fkey(name, email)')
                .eq('organization_id', organizationId)
                .eq('status', 'active');

            console.log('[ActiveAutomationConfig] Team members result:', { data, error });
            if (data) setTeamMembers(data as any);
        };
        fetchTeamMembers();
    }, [organizationId]);

    // Initialize from editing automation if provided
    useEffect(() => {
        if (editingAutomation) {
            setName(editingAutomation.name);
            setSelectedWeekdays(editingAutomation.weekdays || [1, 3, 5]);
            setTimeOfDay(editingAutomation.time_of_day);
            setContextDays(editingAutomation.context_days);
            setAssignedApprover(editingAutomation.assigned_approver || '');
            setCustomPrompt(editingAutomation.custom_prompt || '');

            if (!duplicateMode) {
                setSelectedClientIds([editingAutomation.client_id]);
            }
        }
    }, [editingAutomation, duplicateMode]);

    const toggleWeekday = (day: number) => {
        setSelectedWeekdays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day].sort()
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId || selectedWeekdays.length === 0 || selectedClientIds.length === 0) return;

        setLoading(true);
        try {
            const baseAutomationData = {
                organization_id: organizationId,
                name,
                weekdays: selectedWeekdays,
                time_of_day: timeOfDay,
                context_days: contextDays,
                assigned_approver: assignedApprover || null,
                custom_prompt: customPrompt,
                is_active: true
            };

            if (editingAutomation && !duplicateMode) {
                const { error } = await supabase
                    .from('active_automations')
                    .update({
                        ...baseAutomationData,
                        client_id: editingAutomation.client_id
                    })
                    .eq('id', editingAutomation.id);
                if (error) throw error;
            } else {
                const inserts = selectedClientIds.map(cId => ({
                    ...baseAutomationData,
                    client_id: cId
                }));

                const { error } = await supabase
                    .from('active_automations')
                    .insert(inserts);
                if (error) throw error;
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error saving automation:', err);
            alert('Erro ao salvar automação');
        } finally {
            setLoading(false);
        }
    };

    const isEditing = editingAutomation && !duplicateMode;
    const title = duplicateMode
        ? 'Duplicar Automação Active'
        : editingAutomation
            ? 'Editar Active'
            : 'Nova Automação Active';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d121f] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 w-full max-w-lg animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#0d121f] z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${duplicateMode ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-violet-500/10 border border-violet-500/20'}`}>
                            {duplicateMode ? (
                                <Copy className="w-5 h-5 text-orange-400" />
                            ) : (
                                <Sparkles className="w-5 h-5 text-violet-400" />
                            )}
                        </div>
                        <div>
                            <h2 className="font-black text-white">{title}</h2>
                            {isEditing && clientName && (
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cliente: {clientName}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
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
                                excludeClientIds={duplicateMode && editingAutomation ? [editingAutomation.client_id] : []}
                            />
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Nome da Automação
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Atualização Semanal"
                            required
                            className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:outline-none placeholder:text-slate-600"
                        />
                    </div>

                    {/* Weekdays */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Dias de Envio
                        </label>
                        <div className="grid grid-cols-7 gap-1">
                            {WEEKDAYS.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleWeekday(day.value)}
                                    className={`p-2 rounded-lg text-center transition-all border ${selectedWeekdays.includes(day.value)
                                        ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                                        : 'bg-slate-900/50 border-white/5 text-slate-500 hover:bg-white/5'
                                        }`}
                                >
                                    <span className="text-[10px] font-black uppercase">
                                        {day.label.slice(0, 3)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Context Days & Approver */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Dias de Contexto
                            </label>
                            <select
                                value={contextDays}
                                onChange={(e) => setContextDays(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:outline-none"
                            >
                                <option value={3}>Últimos 3 dias</option>
                                <option value={7}>Últimos 7 dias</option>
                                <option value={14}>Últimos 14 dias</option>
                                <option value={30}>Últimos 30 dias</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Responsável
                            </label>
                            <select
                                value={assignedApprover}
                                onChange={(e) => setAssignedApprover(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:outline-none"
                            >
                                <option value="">Selecione...</option>
                                {teamMembers?.map(member => (
                                    <option key={member.id} value={member.profile_id}>
                                        {member.profile?.name || member.profile?.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Custom AI Guidance */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                            Direcionamento para IA (opcional)
                        </label>
                        <textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="Ex: Mencione a nova campanha de marketing. Seja mais formal. Pergunte sobre o projeto X..."
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-violet-500/30 focus:outline-none resize-none placeholder:text-slate-600"
                            rows={3}
                        />
                        <p className="text-[9px] text-slate-500 font-medium">
                            Instruções extras para a IA usar ao gerar as sugestões de mensagem.
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                        <p className="text-[11px] text-violet-300 leading-relaxed font-medium">
                            <strong>Como funciona:</strong> Nos dias selecionados, a IA analisará conversas,
                            tarefas e checklists dos últimos {contextDays} dias e sugerirá uma mensagem para enviar ao cliente.
                            O responsável revisa e aprova antes do envio.
                        </p>
                    </div>

                    {/* Info for multiple selection */}
                    {selectedClientIds.length > 1 && (
                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                            <p className="text-xs text-violet-300 font-medium">
                                <strong>Nota:</strong> Será criada uma automação separada para cada um dos {selectedClientIds.length} clientes selecionados.
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
                            disabled={loading || selectedWeekdays.length === 0 || selectedClientIds.length === 0}
                            className={`flex-1 py-3 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg ${duplicateMode ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/20' : 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/20'
                                }`}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : duplicateMode ? (
                                <Copy className="w-4 h-4" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {loading
                                ? 'Salvando...'
                                : duplicateMode
                                    ? `Duplicar (${selectedClientIds.length})`
                                    : isEditing
                                        ? 'Atualizar'
                                        : selectedClientIds.length > 1
                                            ? `Criar (${selectedClientIds.length})`
                                            : 'Criar Automação'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
