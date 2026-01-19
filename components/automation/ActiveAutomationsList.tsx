import React, { useState, useEffect } from 'react';
import {
    MoreVertical, Pencil, Trash2, Power, PowerOff, Calendar,
    Bot, Clock, AlertCircle
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
                <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (automations.length === 0) {
        return (
            <div className="bg-slate-50 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                <Bot className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhuma automação ativa</p>
                <p className="text-xs text-slate-400 mt-1">
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
                    className={`group relative bg-white border rounded-xl p-5 transition-all duration-200 
                        ${auto.is_active
                            ? 'border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 bg-gradient-to-br from-white to-slate-50/30'
                            : 'border-slate-100 bg-slate-50 opacity-80'
                        }`}
                >
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h4 className={`font-bold text-base ${auto.is_active ? 'text-slate-800' : 'text-slate-500'}`}>
                                        {auto.name}
                                    </h4>
                                    {!auto.is_active && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full">
                                            PAUSADO
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{getWeekdaysLabel(auto.weekdays)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Contexto: <strong>{auto.context_days} dias</strong></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => toggleStatus(auto)}
                                title={auto.is_active ? "Pausar Automação" : "Ativar Automação"}
                                className={`p-2 rounded-lg transition-colors ${auto.is_active
                                        ? 'text-green-600 hover:bg-green-50 bg-green-50/50'
                                        : 'text-slate-400 hover:bg-slate-200 hover:text-green-600'
                                    }`}
                            >
                                {auto.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                            </button>

                            <button
                                onClick={() => onEdit(auto)}
                                title="Editar Configurações"
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => handleDelete(auto.id)}
                                title="Excluir Permanentemente"
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Active Indicator Strip */}
                    {auto.is_active && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-purple-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                </div>
            ))}
        </div>
    );
};
