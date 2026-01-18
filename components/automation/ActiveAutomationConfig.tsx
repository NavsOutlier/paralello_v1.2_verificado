import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Sparkles, Clock, X, Save, Calendar, Users, CheckCircle2
} from 'lucide-react';
import { ActiveAutomation, WEEKDAYS } from '../../types/automation';

interface ActiveAutomationConfigProps {
    clientId: string;
    clientName: string;
    onClose: () => void;
    onSuccess?: () => void;
    editingAutomation?: ActiveAutomation;
}

export const ActiveAutomationConfig: React.FC<ActiveAutomationConfigProps> = ({
    clientId,
    clientName,
    onClose,
    onSuccess,
    editingAutomation
}) => {
    const { organizationId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState<{ id: string, profile_id: string, profile?: { name?: string, email?: string } }[]>([]);

    // Form state
    const [name, setName] = useState('Atualização Semanal');
    const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
    const [timeOfDay, setTimeOfDay] = useState('09:00');
    const [contextDays, setContextDays] = useState(7);
    const [assignedApprover, setAssignedApprover] = useState<string>('');

    // Fetch team members
    useEffect(() => {
        const fetchTeamMembers = async () => {
            if (!organizationId) return;
            const { data } = await supabase
                .from('team_members')
                .select('id, profile_id, profile:profiles(name, email)')
                .eq('organization_id', organizationId)
                .eq('status', 'active');
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
        }
    }, [editingAutomation]);

    const toggleWeekday = (day: number) => {
        setSelectedWeekdays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day].sort()
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId || selectedWeekdays.length === 0) return;

        setLoading(true);
        try {
            const automationData = {
                organization_id: organizationId,
                client_id: clientId,
                name,
                weekdays: selectedWeekdays,
                time_of_day: timeOfDay,
                context_days: contextDays,
                assigned_approver: assignedApprover || null,
                is_active: true
            };

            if (editingAutomation) {
                const { error } = await supabase
                    .from('active_automations')
                    .update(automationData)
                    .eq('id', editingAutomation.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('active_automations')
                    .insert(automationData);
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-xl">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">
                                {editingAutomation ? 'Editar Active' : 'Nova Automação Active'}
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
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Nome da Automação
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Atualização Semanal"
                            required
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                    </div>

                    {/* Weekdays */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Dias de Envio
                        </label>
                        <div className="grid grid-cols-7 gap-1">
                            {WEEKDAYS.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleWeekday(day.value)}
                                    className={`p-2 rounded-lg text-center transition-all ${selectedWeekdays.includes(day.value)
                                        ? 'bg-purple-100 border-2 border-purple-500 text-purple-700'
                                        : 'bg-slate-50 border-2 border-transparent text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="text-[10px] font-bold uppercase">
                                        {day.label.slice(0, 3)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time & Context Days */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Horário
                            </label>
                            <input
                                type="time"
                                value={timeOfDay}
                                onChange={(e) => setTimeOfDay(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Dias de Contexto
                            </label>
                            <select
                                value={contextDays}
                                onChange={(e) => setContextDays(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            >
                                <option value={3}>Últimos 3 dias</option>
                                <option value={7}>Últimos 7 dias</option>
                                <option value={14}>Últimos 14 dias</option>
                                <option value={30}>Últimos 30 dias</option>
                            </select>
                        </div>
                    </div>

                    {/* Approver */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Responsável pela Aprovação
                        </label>
                        <select
                            value={assignedApprover}
                            onChange={(e) => setAssignedApprover(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                            <option value="">Selecione um membro...</option>
                            {teamMembers?.map(member => (
                                <option key={member.id} value={member.profile_id}>
                                    {member.profile?.name || member.profile?.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Info Box */}
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                        <p className="text-[11px] text-purple-800 leading-relaxed">
                            <strong>Como funciona:</strong> Nos dias selecionados, a IA analisará conversas,
                            tarefas e checklists dos últimos {contextDays} dias e sugerirá uma mensagem para enviar ao cliente.
                            O responsável revisa e aprova antes do envio.
                        </p>
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
                            disabled={loading || selectedWeekdays.length === 0}
                            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Salvando...' : editingAutomation ? 'Atualizar' : 'Criar Automação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
