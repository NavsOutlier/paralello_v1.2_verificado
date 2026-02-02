import React, { useState, useEffect } from 'react';
import {
    MoreVertical, Pencil, Trash2, Power, PowerOff, Calendar,
    Bot, Clock, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ActiveAutomation, WEEKDAYS } from '../../types/automation';

interface ActiveAutomationsListProps {
    clientId: string;
    onEdit: (automation: ActiveAutomation) => void;
    refreshTrigger?: number;
}

export const ActiveAutomationsList: React.FC<ActiveAutomationsListProps> = ({
    clientId,
    onEdit,
    refreshTrigger = 0
}) => {
    const [automations, setAutomations] = useState<ActiveAutomation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAutomations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('active_automations')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAutomations(data || []);
        } catch (err: any) {
            console.error('Error fetching automations:', err);
            setError('Erro ao carregar automações');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAutomations();
    }, [clientId, refreshTrigger]);

    const toggleStatus = async (automation: ActiveAutomation) => {
        try {
            const newStatus = !automation.is_active;
            const { error } = await supabase
                .from('active_automations')
                .update({ is_active: newStatus })
                .eq('id', automation.id);

            if (error) throw error;

            // Update local state
            setAutomations(automations.map(a =>
                a.id === automation.id ? { ...a, is_active: newStatus } : a
            ));
        } catch (err) {
            console.error('Error toggling status:', err);
            alert('Erro ao atualizar status');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta automação?')) return;

        try {
            const { error } = await supabase
                .from('active_automations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setAutomations(automations.filter(a => a.id !== id));
        } catch (err) {
            console.error('Error deleting automation:', err);
            alert('Erro ao excluir automação');
        }
    };

    const getWeekdaysLabel = (days: number[]) => {
        if (days.length === 7) return 'Todos os dias';
        if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Dias úteis';
        return days.map(d => WEEKDAYS.find(w => w.value === d)?.label.slice(0, 3)).join(', ');
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
        );
    }

    if (automations.length === 0) {
        return (
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-8 text-center border border-dashed border-white/10">
                <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <Bot className="w-7 h-7 text-slate-600" />
                </div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhuma automação ativa</p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                    Crie uma automação para começar a receber sugestões.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {automations.map(auto => (
                <div
                    key={auto.id}
                    className={`group relative bg-slate-900/40 backdrop-blur-xl border rounded-2xl p-5 transition-all duration-200 
                        ${auto.is_active
                            ? 'border-white/5 hover:border-cyan-500/20 shadow-lg'
                            : 'border-white/5 opacity-60'
                        }`}
                >
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className={`font-black text-sm ${auto.is_active ? 'text-white' : 'text-slate-500'}`}>
                                        {auto.name}
                                    </h4>
                                    {!auto.is_active && (
                                        <span className="text-[9px] font-black px-2.5 py-1 bg-slate-700 text-slate-400 rounded-lg uppercase tracking-widest border border-white/5">
                                            PAUSADO
                                        </span>
                                    )}
                                    {auto.is_active && (
                                        <span className="text-[9px] font-black px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg uppercase tracking-widest border border-emerald-500/20">
                                            ATIVO
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{getWeekdaysLabel(auto.weekdays)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        <span className="text-[10px] font-bold text-slate-400">Contexto: <strong className="text-cyan-400">{auto.context_days} dias</strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => toggleStatus(auto)}
                                title={auto.is_active ? "Pausar Automação" : "Ativar Automação"}
                                className={`p-2.5 rounded-xl transition-all ${auto.is_active
                                    ? 'text-emerald-400 hover:bg-emerald-500/10 bg-emerald-500/5 border border-emerald-500/20'
                                    : 'text-slate-500 hover:bg-white/5 hover:text-emerald-400 border border-white/5'
                                    }`}
                            >
                                {auto.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                            </button>

                            <button
                                onClick={() => onEdit(auto)}
                                title="Editar Configurações"
                                className="p-2.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all border border-white/5"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => handleDelete(auto.id)}
                                title="Excluir Permanentemente"
                                className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-white/5"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Active Indicator Strip */}
                    {auto.is_active && (
                        <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-r-full" />
                    )}
                </div>
            ))}
        </div>
    );
};
