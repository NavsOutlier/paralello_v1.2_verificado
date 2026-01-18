import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
    CheckCircle2, Plus, ArrowRight, Send, X, Loader2, ListChecks
} from 'lucide-react';

interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    created_now?: boolean;
}

interface TaskStatusReportModalProps {
    taskId: string;
    taskTitle: string;
    oldStatus: string;
    newStatus: string;
    existingChecklist: ChecklistItem[];
    onConfirm: (completedItems: ChecklistItem[], nextStep: string) => void;
    onCancel: () => void;
}

export const TaskStatusReportModal: React.FC<TaskStatusReportModalProps> = ({
    taskId,
    taskTitle,
    oldStatus,
    newStatus,
    existingChecklist,
    onConfirm,
    onCancel
}) => {
    const { profile } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [checklist, setChecklist] = useState<ChecklistItem[]>(existingChecklist);
    const [nextStep, setNextStep] = useState('');
    const [newItemText, setNewItemText] = useState('');
    const [showNewItemInput, setShowNewItemInput] = useState(false);

    const hasCompletedItem = checklist.some(item => item.completed);

    const handleToggleItem = (id: string) => {
        setChecklist(prev =>
            prev.map(item =>
                item.id === id ? { ...item, completed: !item.completed } : item
            )
        );
    };

    const handleAddNewItem = () => {
        if (!newItemText.trim()) return;

        const newItem: ChecklistItem = {
            id: `new-${Date.now()}`,
            text: newItemText.trim(),
            completed: true, // Auto-mark as completed
            created_now: true
        };

        setChecklist(prev => [...prev, newItem]);
        setNewItemText('');
        setShowNewItemInput(false);
    };

    const handleSubmit = async () => {
        if (!hasCompletedItem || !nextStep.trim()) return;

        setLoading(true);
        try {
            // Save report to database
            const completedItems = checklist
                .filter(item => item.completed)
                .map(item => ({
                    item: item.text,
                    created_now: item.created_now || false
                }));

            const { error } = await supabase
                .from('task_status_reports')
                .insert({
                    task_id: taskId,
                    old_status: oldStatus,
                    new_status: newStatus,
                    completed_items: completedItems,
                    next_step: nextStep.trim(),
                    created_by: profile?.id
                });

            if (error) throw error;

            onConfirm(checklist.filter(item => item.completed), nextStep);
        } catch (err) {
            console.error('Error saving task report:', err);
            alert('Erro ao salvar relatório da tarefa');
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status: string) => {
        const statusLabels: Record<string, string> = {
            backlog: 'Backlog',
            todo: 'A Fazer',
            in_progress: 'Em Progresso',
            review: 'Revisão',
            done: 'Concluído'
        };
        return statusLabels[status] || status;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-xl">
                                <ListChecks className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">Relatório de Mudança</h2>
                                <p className="text-xs text-slate-500 truncate max-w-[250px]">{taskTitle}</p>
                            </div>
                        </div>
                        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Status Change Indicator */}
                    <div className="flex items-center justify-center gap-3 bg-slate-50 rounded-xl p-3">
                        <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">
                            {getStatusLabel(oldStatus)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                            {getStatusLabel(newStatus)}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Checklist */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            O que foi feito? (marque pelo menos 1)
                        </label>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {checklist.map(item => (
                                <label
                                    key={item.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${item.completed
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={item.completed}
                                        onChange={() => handleToggleItem(item.id)}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${item.completed
                                            ? 'border-blue-500 bg-blue-500'
                                            : 'border-slate-300'
                                        }`}>
                                        {item.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <span className={`text-sm flex-1 ${item.completed ? 'text-blue-700' : 'text-slate-700'
                                        }`}>
                                        {item.text}
                                        {item.created_now && (
                                            <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                                Novo
                                            </span>
                                        )}
                                    </span>
                                </label>
                            ))}
                        </div>

                        {/* Add New Item */}
                        {showNewItemInput ? (
                            <div className="flex gap-2 mt-3">
                                <input
                                    type="text"
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    placeholder="Descreva o que foi feito..."
                                    autoFocus
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewItem()}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddNewItem}
                                    disabled={!newItemText.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Adicionar
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowNewItemInput(true)}
                                className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline mt-2"
                            >
                                <Plus className="w-4 h-4" />
                                Fiz algo que não estava listado
                            </button>
                        )}
                    </div>

                    {/* Next Step */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <ArrowRight className="w-3.5 h-3.5" />
                            Qual o próximo passo?
                        </label>
                        <textarea
                            value={nextStep}
                            onChange={(e) => setNextStep(e.target.value)}
                            placeholder="Descreva brevemente o que será feito a seguir..."
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !hasCompletedItem || !nextStep.trim()}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        {loading ? 'Salvando...' : 'Confirmar e Enviar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
