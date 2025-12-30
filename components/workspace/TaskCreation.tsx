import React, { useState } from 'react';
import { CornerDownRight } from 'lucide-react';
import { Task, DiscussionDraft } from '../../types';
import { Button } from '../ui';

interface TaskCreationProps {
    draft: DiscussionDraft;
    existingTasks: Task[];
    onCancel: () => void;
    onCreate: (title: string, priority: 'low' | 'medium' | 'high') => void;
    onAttach: (taskId: string) => void;
}

export const TaskCreation: React.FC<TaskCreationProps> = ({
    draft,
    existingTasks,
    onCancel,
    onCreate,
    onAttach
}) => {
    const [mode, setMode] = useState<'create' | 'attach'>('create');
    const [newTitle, setNewTitle] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

    const handleCreate = () => {
        onCreate(newTitle, priority);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="h-14 flex items-center px-4 bg-indigo-600 text-white shadow-sm">
                <button onClick={onCancel} className="mr-3 hover:bg-white/10 p-1 rounded">
                    <CornerDownRight className="w-5 h-5 rotate-180" />
                </button>
                <span className="text-sm font-bold">Discussão Interna</span>
            </div>

            <div className="p-4 bg-yellow-50 border-b border-yellow-100">
                <span className="text-xs font-bold text-yellow-700 uppercase">Mensagem Selecionada</span>
                <p className="text-sm text-slate-700 mt-1 italic line-clamp-3">"{draft.sourceMessage.text}"</p>
            </div>

            <div className="flex p-2 m-4 bg-slate-200 rounded-lg">
                <button
                    onClick={() => setMode('create')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Nova Tarefa
                </button>
                <button
                    onClick={() => setMode('attach')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'attach' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Anexar Existente
                </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                {mode === 'create' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Título da Tarefa</label>
                            <input
                                autoFocus
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="Ex: Ajustar campanha..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Prioridade</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                        <Button
                            disabled={!newTitle}
                            onClick={handleCreate}
                            className="w-full"
                        >
                            Criar Tarefa
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs text-slate-500 mb-2">Selecione uma tarefa para vincular esta mensagem:</p>
                        {existingTasks.map(t => (
                            <div
                                key={t.id}
                                onClick={() => onAttach(t.id)}
                                className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-500 group"
                            >
                                <h5 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">{t.title}</h5>
                                <span className="text-xs text-slate-400">{t.status}</span>
                            </div>
                        ))}
                        {existingTasks.length === 0 && <p className="text-sm text-slate-400 text-center mt-4">Nenhuma tarefa encontrada.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};
