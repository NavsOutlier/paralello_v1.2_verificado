import React, { useState } from 'react';
import { X, Plus, Link2, Check, CheckSquare, ChevronDown, Briefcase, Activity, MessageSquare, Send } from 'lucide-react';
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
        clientId?: string; // Add clientId to onCreate data definition
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
    clients?: { id: string; name: string }[]; // New Prop
    initialClientId?: string; // New Prop
}

const TAG_COLORS = [
    { bg: 'bg-indigo-500/10', text: 'text-indigo-300', dot: 'bg-indigo-400' },
    { bg: 'bg-emerald-500/10', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    { bg: 'bg-amber-500/10', text: 'text-amber-300', dot: 'bg-amber-400' },
    { bg: 'bg-rose-500/10', text: 'text-rose-300', dot: 'bg-rose-400' },
    { bg: 'bg-sky-500/10', text: 'text-sky-300', dot: 'bg-sky-400' },
    { bg: 'bg-violet-500/10', text: 'text-violet-300', dot: 'bg-violet-400' },
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
    checklistTemplates,
    clients = [], // Default to empty array
    initialClientId
}) => {
    const [mode, setMode] = useState<'select' | 'create' | 'attach'>(draft.sourceMessage.id === 'manual' ? 'create' : 'select');
    const [title, setTitle] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || ''); // Client State
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
            checklist: currentChecklist.length > 0 ? currentChecklist : undefined,
            clientId: selectedClientId || undefined // Include Client ID
        }, comment.trim() || undefined);
    };

    return (
        <div className="flex flex-col h-full bg-[#0a101d] relative">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-slate-900/60 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Plus className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Nova Missão</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Expandir Horizontes</p>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all hover:rotate-90 text-slate-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Original Message - only if not manual */}
                {draft.sourceMessage.id !== 'manual' && (
                    <div className="p-4 bg-indigo-500/5 border-l-4 border-cyan-500 rounded-r-2xl mb-4 shadow-lg shadow-cyan-500/5">
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-1">DRAFT DE MENSAGEM</span>
                        <p className="text-xs text-slate-400 italic leading-relaxed">"{draft.sourceMessage.text || draft.sourceMessage.content}"</p>
                    </div>
                )}

                {/* Mode Selection - only if not manual */}
                {draft.sourceMessage.id !== 'manual' && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                            onClick={() => setMode('create')}
                            className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border transition-all duration-300 ${mode === 'create'
                                ? 'border-indigo-500/50 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                                : 'border-white/5 bg-white/5 text-slate-500 hover:border-white/10 hover:bg-white/10'
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Criar Nova Task</span>
                        </button>
                        <button
                            onClick={() => setMode('attach')}
                            className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border transition-all duration-300 ${mode === 'attach'
                                ? 'border-cyan-500/50 bg-cyan-600 text-white shadow-lg shadow-cyan-600/20 scale-[1.02]'
                                : 'border-white/5 bg-white/5 text-slate-500 hover:border-white/10 hover:bg-white/10'
                                }`}
                        >
                            <Link2 className="w-4 h-4" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Vincular Atividade</span>
                        </button>
                    </div>
                )}

                {/* Create Mode */}
                {mode === 'create' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">

                        {/* Selected Client (If clients are available) */}
                        {clients && clients.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                    Cliente Vinculado
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/5 group-focus-within:border-cyan-500/30 transition-colors">
                                        <Briefcase className="w-4 h-4 text-slate-500 group-focus-within:text-cyan-400" />
                                    </div>
                                    <select
                                        value={selectedClientId}
                                        onChange={(e) => setSelectedClientId(e.target.value)}
                                        className="w-full pl-16 pr-5 h-14 rounded-2xl bg-slate-950/50 border border-white/5 text-white font-black text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all appearance-none shadow-inner"
                                    >
                                        <option value="" className="bg-slate-900">SEM CLIENTE (INTERNO)</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id} className="bg-slate-900">{client.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none group-focus-within:text-cyan-400 transition-colors" />
                                </div>
                            </div>
                        )}

                        {/* Título */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Título da Atividade
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Qual o próximo passo épico?"
                                className="w-full px-6 h-14 rounded-2xl bg-slate-950/50 border border-white/5 text-white font-black text-[16px] placeholder:text-slate-700 placeholder:font-black focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-inner"
                            />
                        </div>

                        {/* Responsáveis - Multi Select */}
                        <div className="relative group/assignee">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 mb-2">
                                Responsáveis pela Operação
                            </label>

                            <div
                                onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                                className="w-full px-5 py-3 rounded-2xl bg-slate-950/50 border border-white/5 text-white font-medium focus-within:border-cyan-500/50 focus-within:ring-4 focus-within:ring-cyan-500/10 cursor-pointer flex items-center justify-between min-h-[56px] shadow-inner group-hover/assignee:border-white/10 transition-all"
                            >
                                {assigneeIds.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {teamMembers.filter(m => assigneeIds.includes(m.id)).map(member => (
                                            <div key={member.id} className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-2.5 py-1 shadow-lg">
                                                <div className="w-4 h-4 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex-shrink-0">
                                                    {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : null}
                                                </div>
                                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">{member.name.split(' ')[0]}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-700 font-black uppercase tracking-widest text-[11px] ml-1">Nenhum tripulante selecionado</span>
                                )}
                                <ChevronDown className="w-4 h-4 text-slate-600 transition-colors group-hover/assignee:text-cyan-400" />
                            </div>

                            {isAssigneeDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsAssigneeDropdownOpen(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] rounded-[24px] overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                                        <div className="px-4 py-3 bg-white/5 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Equipe Disponível</div>
                                        <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
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
                                                        className={`px-4 py-3 text-sm flex items-center gap-3 hover:bg-white/5 transition-all cursor-pointer group/item ${isSelected ? 'bg-cyan-500/10' : ''}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-white/10 bg-white/5 group-hover/item:border-cyan-500/30'}`}>
                                                            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-white/5 flex-shrink-0 shadow-lg relative">
                                                            {member.avatar ? (
                                                                <img src={member.avatar} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                                                    {member.name.slice(0, 1)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-[13px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-400 group-hover/item:text-slate-200'}`}>
                                                                {member.name}
                                                            </span>
                                                            {member.jobTitle && <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-none mt-0.5">{member.jobTitle}</span>}
                                                        </div>
                                                        {isSelected && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Status e Prazo */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                    Status Inicial
                                </label>
                                <div className="relative group/select">
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as any)}
                                        className="w-full px-5 h-12 rounded-2xl bg-slate-950/50 border border-white/5 text-white font-black text-[12px] uppercase tracking-widest focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none shadow-inner"
                                    >
                                        <option value="todo" className="bg-slate-900">PENDENTE</option>
                                        <option value="in-progress" className="bg-slate-900">PROGRESSO</option>
                                        <option value="review" className="bg-slate-900">REVISÃO</option>
                                        <option value="done" className="bg-slate-900">APROVADO</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none transition-colors group-hover/select:text-indigo-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                    Data Estelar (Prazo)
                                </label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full px-5 h-12 rounded-2xl bg-slate-950/50 border border-white/5 text-rose-400 font-black text-[12px] focus:outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-inner uppercase tracking-widest"
                                />
                            </div>
                        </div>

                        {/* Prioridade */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Prioridade Operacional
                            </label>
                            <div className="flex gap-3">
                                {(['low', 'medium', 'high'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPriority(p)}
                                        className={`flex-1 h-12 rounded-2xl border font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${priority === p
                                            ? p === 'high' ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20 active:scale-95'
                                                : p === 'medium' ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20 active:scale-95'
                                                    : 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 active:scale-95'
                                            : 'bg-white/5 border-white/5 text-slate-600 hover:border-white/10 hover:text-slate-400 active:scale-95'
                                            }`}
                                    >
                                        {p === 'high' ? 'Crítica' : p === 'medium' ? 'Padrão' : 'Baixa'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Checklist Template */}
                        <div className="space-y-3 p-6 rounded-[28px] bg-white/5 border border-white/5 shadow-2xl">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Atividades do Checklist
                            </label>
                            <div className="relative group/checklist">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    <CheckSquare className="w-4 h-4 text-cyan-400 group-focus-within/checklist:scale-110 transition-transform" />
                                </div>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => handleSelectTemplate(e.target.value)}
                                    className="w-full pl-12 pr-5 h-12 rounded-2xl bg-slate-950/50 border border-white/5 text-white font-black text-[11px] focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all appearance-none shadow-inner uppercase tracking-widest"
                                >
                                    <option value="" className="bg-slate-900 text-slate-600">Nenhum modelo estelar</option>
                                    {checklistTemplates.map(t => (
                                        <option key={t.id} value={t.id} className="bg-slate-900">{t.name.toUpperCase()}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none transition-colors group-hover/checklist:text-cyan-400" />
                            </div>
                            {currentChecklist.length > 0 && (
                                <div className="mt-4 p-4 bg-slate-950/40 border border-white/5 rounded-2xl space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    {currentChecklist.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 group/item">
                                            <div className="w-4 h-4 rounded-lg border border-white/10 bg-white/5 flex-shrink-0 group-hover/item:border-cyan-500/30 transition-colors" />
                                            <span className="text-[11px] text-slate-400 font-bold tracking-wide group-hover/item:text-slate-200 transition-colors">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Etiquetas */}
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Marcadores da Atividade
                            </label>

                            <div className="flex flex-wrap gap-2.5">
                                {selectedTags.map(tag => {
                                    const color = getTagColor(tag);
                                    return (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`inline-flex items-center gap-2 px-3 py-1.5 ${color.bg} ${color.text} text-[10px] font-black rounded-full border border-white/5 uppercase tracking-widest shadow-lg hover:scale-105 transition-all`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${color.dot} shadow-[0_0_8px_rgba(255,255,255,0.3)]`} />
                                            {tag}
                                            <X className="w-3 h-3 opacity-40 hover:opacity-100" />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="relative group/tag">
                                <div className={`flex items-center gap-3 h-12 px-5 bg-slate-950/50 border rounded-2xl transition-all duration-300 ${isTagDropdownOpen ? 'border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-500/10 shadow-2xl' : 'border-white/5'}`}>
                                    <span className="text-cyan-400 font-black text-sm">#</span>
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
                                        placeholder="ADICIONAR NOVA TAG..."
                                        className="flex-1 bg-transparent border-none outline-none text-[11px] text-white placeholder:text-slate-700 font-black tracking-widest uppercase"
                                    />
                                    <button
                                        onClick={handleAddTag}
                                        className="p-1.5 hover:bg-white/10 rounded-xl transition-all text-slate-500 hover:text-cyan-400"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>

                                {isTagDropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setIsTagDropdownOpen(false)}
                                        />
                                        <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-white/10 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                                            <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Existentes</span>
                                                <kbd className="text-[9px] font-black text-slate-600 bg-white/5 px-2 py-1 rounded-lg border border-white/10">ESC</kbd>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto p-2 space-y-1 custom-scrollbar">
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
                                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all text-[11px] text-slate-400 font-black uppercase tracking-wider group/item"
                                                            >
                                                                <div className={`w-2 h-2 rounded-full ${color.dot} opacity-40 group-hover/item:opacity-100 group-hover/item:scale-125 transition-all`} />
                                                                {tag}
                                                            </button>
                                                        );
                                                    })}
                                                {availableTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase())).length === 0 && (
                                                    <div className="p-4 text-center">
                                                        <p className="text-[10px] text-slate-600 font-black tracking-widest uppercase">Pressione Enter para criar</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Attach Mode */}
                {mode === 'attach' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 max-w-lg mx-auto">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">
                            Vincular mensagem à atividade orbital:
                        </p>
                        {existingTasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => onAttach(task.id, comment.trim() || undefined)}
                                className="group p-5 bg-slate-900/60 border border-white/5 rounded-[24px] cursor-pointer hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all scale-[0.98] hover:scale-100"
                            >
                                <h5 className="text-[14px] font-black text-white group-hover:text-cyan-400 mb-3 transition-colors">
                                    {task.title}
                                </h5>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] px-2 py-1 bg-white/5 text-slate-500 rounded-lg font-black uppercase tracking-widest border border-white/5">
                                        {task.status}
                                    </span>
                                    <span className={`text-[9px] px-2 py-1 ${task.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'} rounded-lg font-black uppercase tracking-widest`}>
                                        {task.priority}
                                    </span>
                                    {(task.tags || []).map(tag => {
                                        const color = getTagColor(tag);
                                        return (
                                            <span
                                                key={tag}
                                                className={`text-[9px] px-2 py-1 ${color.bg} ${color.text} rounded-lg font-black uppercase tracking-widest border border-white/5`}
                                            >
                                                #{tag}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {existingTasks.length === 0 && (
                            <div className="text-center py-20 opacity-40">
                                <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-[11px] font-black text-slate-600 tracking-widest uppercase">Nenhuma atividade orbital encontrada</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Comment / Atualização Field - Always shown when not manual */}
                {draft.sourceMessage.id !== 'manual' && (
                    <div className="space-y-3 pt-6 border-t border-white/5">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Relatório de Transmissão
                        </label>
                        <MentionInput
                            value={comment}
                            onChange={setComment}
                            teamMembers={teamMembers}
                            placeholder="Adicione um comentário espacial..."
                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-700 resize-none min-h-[120px] transition-all shadow-inner"
                            multiline
                        />
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-5 border-t border-white/5 bg-slate-900/40 backdrop-blur-md flex items-center justify-end gap-4">
                <button
                    onClick={onCancel}
                    className="px-6 py-3 text-[11px] font-black text-slate-500 hover:text-white uppercase tracking-widest hover:bg-white/5 rounded-xl transition-all"
                >
                    Abortar
                </button>
                {mode === 'create' && (
                    <button
                        onClick={handleCreate}
                        disabled={!title.trim()}
                        className="flex items-center gap-3 px-8 py-3 bg-indigo-600 text-white text-[11px] font-black rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:scale-95 transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest"
                    >
                        <Send className="w-4 h-4" />
                        Lançar Missão
                    </button>
                )}
            </div>
        </div>
    );
};
