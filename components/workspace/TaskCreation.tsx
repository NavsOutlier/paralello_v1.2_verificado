import React, { useState } from 'react';
import { X, Plus, Link2 } from 'lucide-react';
import { Task, DiscussionDraft, User as UIUser } from '../../types';
import { Button } from '../ui';

interface TaskCreationProps {
    draft: DiscussionDraft;
    existingTasks: Task[];
    teamMembers: UIUser[];
    onCancel: () => void;
    onCreate: (data: {
        title: string;
        priority: 'low' | 'medium' | 'high';
        assigneeId?: string;
        status: 'todo' | 'in-progress' | 'review' | 'done';
        deadline?: string;
        tags?: string[];
        description?: string;
    }) => void;
    onAttach: (taskId: string) => void;
}

export const TaskCreation: React.FC<TaskCreationProps> = ({
    draft,
    existingTasks,
    teamMembers,
    onCancel,
    onCreate,
    onAttach
}) => {
    const [mode, setMode] = useState<'select' | 'create' | 'attach'>('select');
    const [title, setTitle] = useState('');
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [status, setStatus] = useState<'todo' | 'in-progress' | 'review' | 'done'>('todo');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [deadline, setDeadline] = useState('');
    const [tags, setTags] = useState('');
    const [description, setDescription] = useState('');

    const handleCreate = () => {
        if (!title.trim()) return;

        onCreate({
            title,
            priority,
            assigneeId: assigneeId || undefined,
            status,
            deadline: deadline || undefined,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
            description: description || undefined
        });
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <Plus className="w-4 h-4 text-green-600" />
                    </div>
                    <h2 className="text-base font-bold text-slate-800">Nova Atividade</h2>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Mensagem Original */}
                <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                    <span className="text-xs font-bold text-blue-700 uppercase block mb-1">VOCÊ</span>
                    <p className="text-sm text-slate-700 italic">"{draft.sourceMessage.text}"</p>
                </div>

                {/* Mode Selection */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setMode('create')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${mode === 'create'
                            ? 'border-slate-800 bg-slate-800 text-white shadow-lg'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-semibold">Criar Nova Task</span>
                    </button>
                    <button
                        onClick={() => setMode('attach')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${mode === 'attach'
                            ? 'border-slate-800 bg-slate-800 text-white shadow-lg'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                    >
                        <Link2 className="w-4 h-4" />
                        <span className="text-sm font-semibold">Vincular a Existente</span>
                    </button>
                </div>

                {/* Create Mode */}
                {mode === 'create' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Título */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                                Título da Task
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Corrigir erro no checkout"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Responsáveis */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                                Responsáveis
                            </label>
                            <select
                                value={assigneeId}
                                onChange={(e) => setAssigneeId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">Selecionar responsáveis...</option>
                                {teamMembers.map(member => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status e Prazo */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="todo">Pendente</option>
                                    <option value="in-progress">Em Progresso</option>
                                    <option value="review">Revisão</option>
                                    <option value="done">Concluído</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                                    Prazo
                                </label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Prioridade (hidden in priority select style) */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                                Prioridade
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>

                        {/* Etiquetas */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                                Etiquetas
                            </label>
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="Adicionar tag (digite)..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Separe múltiplas tags com vírgula</p>
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                                Descrição / Detalhes
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Adicione detalhes sobre a tarefa..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* Attach Mode */}
                {mode === 'attach' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-sm text-slate-600 font-medium mb-3">
                            Selecione uma tarefa existente para vincular esta mensagem:
                        </p>
                        {existingTasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => onAttach(task.id)}
                                className="p-4 bg-white border-2 border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
                            >
                                <h5 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 mb-1">
                                    {task.title}
                                </h5>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                                        {task.status}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                                        {task.priority}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {existingTasks.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-sm text-slate-400">Nenhuma tarefa encontrada para este cliente.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                {mode === 'create' && (
                    <button
                        onClick={handleCreate}
                        disabled={!title.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Criar Task
                    </button>
                )}
            </div>
        </div>
    );
};
