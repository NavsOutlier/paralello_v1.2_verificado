import React, { useState } from 'react';
import { X, Plus, Link2, Check, CheckSquare, ChevronDown } from 'lucide-react';
import { Task, DiscussionDraft, User as UIUser, ChecklistTemplate, ChecklistItem } from '../../types';
import { Button } from '../ui';
import { MentionInput } from './MentionInput';

interface TaskCreationProps {
    draft: DiscussionDraft;
    existingTasks: Task[];
    teamMembers: UIUser[];
    onCancel: () => void;
    onCreate: (data: {
        title: string;
        priority: 'low' | 'medium' | 'high';
        assigneeId?: string;
        assigneeIds?: string[];
        status: 'todo' | 'in-progress' | 'review' | 'done';
        deadline?: string;
        tags?: string[];
        description?: string;
        checklist?: ChecklistItem[];
    }, comment?: string) => void;
    onAttach: (taskId: string, comment?: string) => void;
    checklistTemplates: ChecklistTemplate[];
}

const TAG_COLORS = [
    { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
    { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
    { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
];

const getTagColor = (tag: string) => {
    const hash = tag.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return TAG_COLORS[hash % TAG_COLORS.length];
};

export const TaskCreation: React.FC<TaskCreationProps> = ({
    draft,
    existingTasks,
    teamMembers,
    onCancel,
    onCreate,
    onAttach,
    checklistTemplates
}) => {
    const [mode, setMode] = useState<'select' | 'create' | 'attach'>(draft.sourceMessage.id === 'manual' ? 'create' : 'select');
    const [title, setTitle] = useState('');
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [status, setStatus] = useState<'todo' | 'in-progress' | 'review' | 'done'>('todo');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [deadline, setDeadline] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [currentChecklist, setCurrentChecklist] = useState<ChecklistItem[]>([]);

    // Extract all unique tags from existing tasks for suggestions
    const availableTags = (Array.from(new Set(existingTasks.flatMap(t => t.tags || []))) as string[]).filter(t => !selectedTags.includes(t));

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(prev => prev.filter(t => t !== tag));
        } else {
            setSelectedTags(prev => [...prev, tag]);
        }
    };

    const handleAddTag = () => {
        const newTag = tagInput.trim();
        if (newTag && !selectedTags.includes(newTag)) {
            setSelectedTags(prev => [...prev, newTag]);
            setTagInput('');
        }
    };

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const template = checklistTemplates.find(t => t.id === templateId);
        if (template) {
            setCurrentChecklist(template.items.map(item => ({ ...item, completed: false })));
        } else {
            setCurrentChecklist([]);
        }
    };

    const handleCreate = () => {
        if (!title.trim()) return;

        onCreate({
            title,
            priority,
            assigneeId: assigneeIds[0], // Keep primary assignee logic for backwards compatibility if needed
            assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
            status,
            deadline: deadline || undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            checklist: currentChecklist.length > 0 ? currentChecklist : undefined
        }, comment.trim() || undefined);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                        <Plus className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-800">Nova Atividade</h2>
                </div>
                <button
                    onClick={onCancel}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Original Message - only if not manual */}
                {draft.sourceMessage.id !== 'manual' && (
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg mb-2">
                        <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">DRAFT DE MENSAGEM</span>
                        <p className="text-xs text-slate-700 italic">"{draft.sourceMessage.text || draft.sourceMessage.content}"</p>
                    </div>
                )}

                {/* Mode Selection - only if not manual */}
                {draft.sourceMessage.id !== 'manual' && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                            onClick={() => setMode('create')}
                            className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${mode === 'create'
                                ? 'border-slate-800 bg-slate-800 text-white shadow-md'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold">Criar Nova Task</span>
                        </button>
                        <button
                            onClick={() => setMode('attach')}
                            className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${mode === 'attach'
                                ? 'border-slate-800 bg-slate-800 text-white shadow-md'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                        >
                            <Link2 className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold">Vincular a Existente</span>
                        </button>
                    </div>
                )}

                {/* Create Mode */}
                {mode === 'create' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Título */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Título da Task
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Corrigir erro no checkout"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:font-normal"
                            />
                        </div>

                        {/* Responsáveis - Multi Select */}
                        <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Responsáveis
                            </label>

                            <div
                                onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent cursor-pointer flex items-center justify-between min-h-[34px] bg-white"
                            >
                                {assigneeIds.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {teamMembers.filter(m => assigneeIds.includes(m.id)).map(member => (
                                            <div key={member.id} className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                                    {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : null}
                                                </div>
                                                <span className="text-[10px] font-bold text-indigo-700 whitespace-nowrap">{member.name.split(' ')[0]}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-400 font-normal">Selecionar responsáveis...</span>
                                )}
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </div>

                            {isAssigneeDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsAssigneeDropdownOpen(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
                                        {teamMembers.map(member => {
                                            const isSelected = assigneeIds.includes(member.id);
                                            return (
                                                <div
                                                    key={member.id}
                                                    onClick={() => {
                                                        const newIds = isSelected
                                                            ? assigneeIds.filter(id => id !== member.id)
                                                            : [...assigneeIds, member.id];
                                                        setAssigneeIds(newIds);
                                                    }}
                                                    className={`px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                                >
                                                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'}`}>
                                                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                                                        {member.avatar ? (
                                                            <img src={member.avatar} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-400">
                                                                {member.name.slice(0, 1)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`truncate ${isSelected ? 'text-indigo-700 font-bold' : 'text-slate-600'}`}>
                                                        {member.name}
                                                    </span>
                                                    {member.jobTitle && <span className="text-[10px] text-slate-400 ml-auto">{member.jobTitle}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Status e Prazo */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white h-[34px]"
                                >
                                    <option value="todo">Pendente</option>
                                    <option value="in-progress">Em Progresso</option>
                                    <option value="review">Revisão</option>
                                    <option value="done">Concluído</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Prazo
                                </label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-[34px]"
                                />
                            </div>
                        </div>

                        {/* Prioridade */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Prioridade
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white h-[34px]"
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>

                        {/* Checklist Template */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Atividades (Checklist)
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => handleSelectTemplate(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white h-[34px]"
                                >
                                    <option value="">Sem checklist</option>
                                    {checklistTemplates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <CheckSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            </div>
                            {currentChecklist.length > 0 && (
                                <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-lg space-y-1 grayscale opacity-70">
                                    {currentChecklist.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded border border-slate-300 bg-white" />
                                            <span className="text-[10px] text-slate-600 font-medium">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Etiquetas */}
                        <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Etiquetas
                            </label>

                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {selectedTags.map(tag => {
                                    const color = getTagColor(tag);
                                    return (
                                        <span
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 ${color.bg} ${color.text} text-[10px] font-bold rounded-md cursor-pointer hover:brightness-95 transition-all shadow-sm border border-black/5`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                                            {tag.toUpperCase()}
                                            <X className="w-2.5 h-2.5 opacity-40 hover:opacity-100 transition-opacity" />
                                        </span>
                                    );
                                })}
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all ${isTagDropdownOpen ? 'border-green-500 ring-2 ring-green-100 shadow-sm' : 'border-slate-300'}`}>
                                        <span className="text-slate-400 font-bold text-xs">#</span>
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onFocus={() => setIsTagDropdownOpen(true)}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddTag();
                                                } else if (e.key === 'Escape') {
                                                    setIsTagDropdownOpen(false);
                                                }
                                            }}
                                            placeholder="Nova tag..."
                                            className="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-slate-400 font-medium h-[24px]"
                                        />
                                        <button
                                            onClick={handleAddTag}
                                            className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {isTagDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setIsTagDropdownOpen(false)}
                                            />
                                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">EXISTENTES</span>
                                                    <span className="text-[9px] font-bold text-slate-300 bg-white px-1.5 py-0.5 rounded border border-slate-100">ESC</span>
                                                </div>
                                                <div className="max-h-32 overflow-y-auto p-1 space-y-0.5">
                                                    {availableTags
                                                        .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()))
                                                        .map(tag => {
                                                            const color = getTagColor(tag);
                                                            return (
                                                                <button
                                                                    key={tag}
                                                                    onClick={() => {
                                                                        toggleTag(tag);
                                                                        setIsTagDropdownOpen(false);
                                                                        setTagInput('');
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded transition-all text-xs text-slate-700 font-bold group"
                                                                >
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${color.dot} opacity-40 group-hover:opacity-100 transition-opacity`} />
                                                                    {tag}
                                                                </button>
                                                            );
                                                        })}
                                                    {availableTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase())).length === 0 && (
                                                        <div className="p-3 text-center">
                                                            <p className="text-[10px] text-slate-400 italic">Enter para criar "{tagInput || '...'}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Attach Mode */}
                {mode === 'attach' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-xs text-slate-600 font-medium mb-2">
                            Selecione uma tarefa existente para vincular esta mensagem:
                        </p>
                        {existingTasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => onAttach(task.id, comment.trim() || undefined)}
                                className="p-3 bg-white border-2 border-slate-100 rounded-lg cursor-pointer hover:border-indigo-500 hover:shadow-sm transition-all group"
                            >
                                <h5 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 mb-1">
                                    {task.title}
                                </h5>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">
                                        {task.status.toUpperCase()}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 ${task.priority === 'high' ? 'bg-rose-100 text-rose-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'} rounded-full font-bold`}>
                                        {task.priority.toUpperCase()}
                                    </span>
                                    {(task.tags || []).map(tag => {
                                        const color = getTagColor(tag);
                                        return (
                                            <span
                                                key={tag}
                                                className={`text-[9px] px-1.5 py-0.5 ${color.bg} ${color.text} rounded-full font-bold border border-black/5`}
                                            >
                                                #{tag.toUpperCase()}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Comment / Atualização Field - Always shown when not manual */}
                {draft.sourceMessage.id !== 'manual' && (
                    <div className="space-y-1.5 pt-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Comentário / Atualização
                        </label>
                        <MentionInput
                            value={comment}
                            onChange={setComment}
                            teamMembers={teamMembers}
                            placeholder="Escreva seu comentário aqui... (use @ para mencionar)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none min-h-[80px]"
                            multiline
                        />
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                {mode === 'create' && (
                    <button
                        onClick={handleCreate}
                        disabled={!title.trim()}
                        className="flex items-center gap-2 px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Criar Task
                    </button>
                )}
            </div>
        </div>
    );
};
