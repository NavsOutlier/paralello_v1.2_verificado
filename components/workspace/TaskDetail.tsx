import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    ArrowLeft, Zap, Pencil, Archive, ChevronDown,
    Calendar, CheckSquare, MessageSquare, Plus,
    X, Paperclip, Send, Loader2, Trash2, Check,
    Save, Download, Settings, Copy
} from 'lucide-react';
import { Task, Message, User as UIUser, ChecklistItem, ChecklistTemplate } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { MessageBubble } from '../MessageBubble';
import { MentionInput, MentionInputRef } from './MentionInput';

const TAG_COLORS = [
    { bg: 'bg-indigo-500/10', text: 'text-indigo-300', dot: 'bg-indigo-400' },
    { bg: 'bg-emerald-500/10', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    { bg: 'bg-amber-500/10', text: 'text-amber-300', dot: 'bg-amber-400' },
    { bg: 'bg-rose-500/10', text: 'text-rose-300', dot: 'bg-rose-400' },
    { bg: 'bg-sky-500/10', text: 'text-sky-300', dot: 'bg-sky-400' },
    { bg: 'bg-violet-500/10', text: 'text-violet-300', dot: 'bg-violet-400' },
];

const getTagColor = (tag: string) => {
    const hash = tag.toLowerCase().split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return TAG_COLORS[hash % TAG_COLORS.length];
};

const statusConfig = {
    'done': { label: 'APROVADO', color: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    'in-progress': { label: 'EM PROGRESSO', color: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-500/10' },
    'todo': { label: 'PENDENTE', color: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10' },
    'review': { label: 'REVISÃO', color: 'bg-indigo-400', text: 'text-indigo-400', bg: 'bg-indigo-500/10' },
};

interface TaskDetailProps {
    task: Task;
    messages: Message[];
    onBack: () => void;
    onNavigateToMessage: (msgId: string) => void;
    onAddComment: (text: string) => Promise<void>;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    teamMembers: UIUser[];
    allTasks?: Task[];
    allContextMessages?: Message[];
    checklistTemplates: ChecklistTemplate[];
    onCreateChecklistTemplate: (name: string, items: ChecklistItem[]) => void;
    onDeleteChecklistTemplate: (templateId: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
    task,
    messages,
    onBack,
    onNavigateToMessage,
    onAddComment,
    onUpdateTask,
    teamMembers,
    allTasks = [],
    allContextMessages = [],
    checklistTemplates,
    onCreateChecklistTemplate,
    onDeleteChecklistTemplate
}) => {
    const { user: currentUser } = useAuth();
    const [comment, setComment] = useState('');
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);
    const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
    const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    // Removed local mention state (handled by MentionInput)
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<MentionInputRef>(null);

    // Auto-focus input after sending comment
    useEffect(() => {
        if (!isAddingComment) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 10);
        }
    }, [isAddingComment]);

    // Checklist state
    const [newItemText, setNewItemText] = useState('');

    // Removed filteredMembers logic (handled by MentionInput)

    const config = statusConfig[task.status] || statusConfig.todo;

    const availableTags = Array.from(new Set((allTasks).flatMap(t => t.tags || [])))
        .filter(t => !(task.tags || []).includes(t as string));

    const toggleTag = (tag: string) => {
        const currentTags = task.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        onUpdateTask(task.id, { tags: newTags });
    };

    const handleAddTag = () => {
        const newTag = tagInput.trim();
        if (newTag && !(task.tags || []).includes(newTag)) {
            onUpdateTask(task.id, { tags: [...(task.tags || []), newTag] });
            setTagInput('');
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async () => {
        if (comment && !isAddingComment) {
            try {
                setIsAddingComment(true);
                await onAddComment(comment);
                setComment('');
            } catch (error) {
                console.error('Failed to add comment:', error);
            } finally {
                setIsAddingComment(false);
            }
        }
    };

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        const day = d.getDate();
        const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        return `${day} de ${month.toLowerCase()}.`;
    };

    // Assignee Logic
    const currentAssigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
    const assignees = teamMembers.filter(m => currentAssigneeIds.includes(m.id));

    // Checklist Logic
    const checklist = task.checklist || [];
    const completedCount = checklist.filter(i => i.completed).length;

    const toggleChecklistItem = (itemId: string) => {
        const newChecklist = checklist.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i);
        onUpdateTask(task.id, { checklist: newChecklist });
    };

    const addChecklistItem = () => {
        if (!newItemText.trim()) return;
        const newItem: ChecklistItem = {
            id: crypto.randomUUID(),
            text: newItemText.trim(),
            completed: false
        };
        onUpdateTask(task.id, { checklist: [...checklist, newItem] });
        setNewItemText('');
    };

    const removeChecklistItem = (itemId: string) => {
        const newChecklist = checklist.filter(i => i.id !== itemId);
        onUpdateTask(task.id, { checklist: newChecklist });
    };

    const handleImportTemplate = (template: ChecklistTemplate) => {
        const newItems = template.items.map(item => ({
            ...item,
            id: crypto.randomUUID(),
            completed: false
        }));
        onUpdateTask(task.id, { checklist: [...checklist, ...newItems] });
        setIsImportDropdownOpen(false);
    };

    const handleSaveAsTemplate = () => {
        if (!newTemplateName.trim() || checklist.length === 0) return;
        onCreateChecklistTemplate(newTemplateName.trim(), checklist.map(i => ({ ...i, completed: false })));
        setNewTemplateName('');
        setIsSaveAsTemplateOpen(false);
        alert('Template salvo com sucesso!');
    };

    const handleArchive = () => {
        if (confirm('Tem certeza que deseja arquivar esta tarefa?')) {
            onUpdateTask(task.id, { archivedAt: new Date() });
            onBack();
        }
    };

    const isArchived = !!task.archivedAt;

    if (isArchived) {
        return (
            <div className={`flex flex-col h-full ${config.bg} transition-colors duration-300`}>
                <div className={`h-[52px] flex items-center justify-between px-4 border-b border-white/5 bg-slate-900/60 backdrop-blur-md`}>
                    <button
                        onClick={onBack}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-cyan-400"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase bg-slate-800 text-slate-400`}>
                            {config.label}
                        </span>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <button
                            onClick={handleArchive}
                            className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                            title="Arquivar Tarefa"
                        >
                            <Archive className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-sm bg-[#0a101d]">
                    Esta tarefa foi arquivada. Restaure-a para visualizar.
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-[#0a101d] relative">
            {/* Checklist Modal */}
            {isChecklistOpen && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={(e) => {
                    if (e.target === e.currentTarget) setIsChecklistOpen(false)
                }}>
                    <div className="bg-[#0f172a] w-full max-w-sm rounded-[24px] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[80%] animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
                            <div className="flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-cyan-400" />
                                <span className="font-black text-white text-sm uppercase tracking-widest">Checklist</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Import Template Button */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
                                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                                        title="Importar Modelo"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </button>

                                    {isImportDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-20" onClick={() => setIsImportDropdownOpen(false)} />
                                            <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                                                <div className="px-4 py-3 bg-white/5 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">MODELOS DISPONÍVEIS</div>
                                                <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                                    {checklistTemplates.map(t => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => handleImportTemplate(t)}
                                                            className="w-full text-left px-4 py-3 text-[11px] hover:bg-white/5 text-slate-300 font-bold flex items-center justify-between group transition-colors"
                                                        >
                                                            <span>{t.name}</span>
                                                            <Plus className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400" />
                                                        </button>
                                                    ))}
                                                    {checklistTemplates.length === 0 && (
                                                        <div className="p-4 text-center text-slate-500 text-[10px] italic">Nenhum modelo salvo.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Save as Template Button */}
                                <button
                                    onClick={() => setIsSaveAsTemplateOpen(!isSaveAsTemplateOpen)}
                                    className={`p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors ${checklist.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    title="Salvar como Modelo"
                                    disabled={checklist.length === 0}
                                >
                                    <Save className="w-3.5 h-3.5" />
                                </button>

                                <button onClick={() => setIsChecklistOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {isSaveAsTemplateOpen && (
                            <div className="p-4 bg-cyan-500/5 border-b border-cyan-500/10 animate-in slide-in-from-top duration-200">
                                <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">Salvar Checklist como Modelo</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nome do modelo (ex: Onboarding)"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        className="flex-1 text-xs px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500 bg-slate-900/60 text-white placeholder:text-slate-600"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSaveAsTemplate}
                                        disabled={!newTemplateName.trim()}
                                        className="bg-cyan-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-cyan-500 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-500/10 uppercase tracking-widest"
                                    >
                                        SALVAR
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                            {checklist.map(item => (
                                <div key={item.id} className="flex items-start gap-3 group">
                                    <button onClick={() => toggleChecklistItem(item.id)} className={`mt-0.5 w-4.5 h-4.5 rounded-lg border flex items-center justify-center transition-all ${item.completed ? 'bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-white/10 bg-white/5 hover:border-cyan-500/30'}`}>
                                        {item.completed && <Check className="w-3 h-3 text-white stroke-[4]" />}
                                    </button>
                                    <div className={`flex-1 text-sm ${item.completed ? 'line-through text-slate-600' : 'text-slate-300 font-medium'}`}>
                                        {item.text}
                                    </div>
                                    <button onClick={() => removeChecklistItem(item.id)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {checklist.length === 0 && (
                                <p className="text-center text-slate-500 text-xs py-8 italic opacity-40">Nenhum item na checklist.</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/5 bg-slate-900/40">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    placeholder="Adicionar novo item..."
                                    className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500 bg-slate-900/60 text-white placeholder:text-slate-600"
                                    onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                />
                                <button onClick={addChecklistItem} disabled={!newItemText.trim()} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-500/10 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ultra Compact Premium Header */}
            <div className="flex-none bg-slate-900/60 backdrop-blur-md border-b border-white/5 z-30 shadow-2xl relative">
                <div className="h-[48px] flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-1.5 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4 border-l border-white/5 pl-4">
                            <button className="text-[#fab005] hover:scale-110 transition-transform opacity-60 hover:opacity-100" title="Automação (Em breve)">
                                <Zap className="w-4 h-4 fill-current" />
                            </button>
                            <button onClick={handleArchive} className="text-slate-500 hover:scale-110 transition-transform hover:text-rose-400" title="Arquivar">
                                <Archive className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{messages.length}</span>
                        </div>
                    </div>
                </div>

                {/* Single Context Session */}
                <div className="px-4 pb-4 pt-4">
                    <div className={`p-4 rounded-[28px] border shadow-2xl space-y-4 transition-all group/card bg-slate-900/40 backdrop-blur-xl border-white/5`}>
                        <div className="space-y-3">
                            {/* Title & Status Row */}
                            <div className="flex items-start justify-between gap-4">
                                <input
                                    type="text"
                                    className="flex-1 text-[20px] font-black text-white leading-tight bg-transparent border-none focus:ring-0 p-0 placeholder-slate-700 tracking-tight"
                                    value={task.title}
                                    onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
                                    placeholder="Título da tarefa..."
                                />

                                {/* Status Selector */}
                                <div className="relative flex-shrink-0">
                                    <button
                                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                        className={`h-8 px-3 rounded-xl border flex items-center gap-2 shadow-lg cursor-pointer hover:bg-white/5 transition-all ${config.bg} border-white/10`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${config.color} shadow-[0_0_10px_rgba(34,211,238,0.4)]`} />
                                        <span className={`text-[10px] font-black tracking-widest uppercase ${config.text}`}>{config.label}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 ${config.text} opacity-50`} />
                                    </button>

                                    {isStatusDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-20" onClick={() => setIsStatusDropdownOpen(false)} />
                                            <div className="absolute top-full right-0 mt-2 w-40 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl">
                                                {Object.entries(statusConfig).map(([key, conf]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            onUpdateTask(task.id, { status: key as any });
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black tracking-widest hover:bg-white/5 flex items-center gap-3 transition-colors uppercase ${task.status === key ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500'}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${conf.color}`} />
                                                        {conf.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Tags Row */}
                            <div className="flex flex-wrap gap-2 items-center">
                                <div className="relative">
                                    <button
                                        onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                                        className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 text-slate-500 text-[10px] font-black rounded-full border border-dashed border-white/10 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-widest"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Tag
                                    </button>
                                    {isTagDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-20" onClick={() => setIsTagDropdownOpen(false)} />
                                            <div className="absolute top-full left-0 mt-3 w-56 bg-slate-900 border border-white/10 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                                                <div className="p-3 border-b border-white/5 bg-white/5">
                                                    <input
                                                        autoFocus
                                                        className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-700"
                                                        placeholder="Pesquisar/Criar tag..."
                                                        value={tagInput}
                                                        onChange={(e) => setTagInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddTag();
                                                        }}
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    {availableTags.map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => toggleTag(tag as string)}
                                                            className="w-full text-left px-4 py-2.5 text-xs text-slate-400 hover:bg-white/5 flex items-center gap-3 transition-colors group"
                                                        >
                                                            <div className={`w-2 h-2 rounded-full ${getTagColor(tag as string).dot} opacity-40 group-hover:opacity-100`} />
                                                            <span className="font-bold uppercase tracking-wide">{tag}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {(task.tags || []).map(tag => {
                                    const color = getTagColor(tag);
                                    return (
                                        <span
                                            key={tag}
                                            className={`inline-flex items-center gap-2 px-3 py-1 ${color.bg} ${color.text} text-[10px] font-black rounded-full border border-white/5 uppercase tracking-wide shadow-sm`}
                                        >
                                            <X className="w-3 h-3 cursor-pointer hover:text-white transition-colors" onClick={() => toggleTag(tag)} />
                                            {tag}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="h-px bg-white/5" />

                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Checklist card */}
                            <div
                                onClick={() => setIsChecklistOpen(true)}
                                className="bg-white/5 h-8 px-4 rounded-xl border border-white/5 flex items-center gap-2.5 shadow-lg shadow-black/10 cursor-pointer hover:border-cyan-500/30 transition-all hover:bg-white/10"
                            >
                                <CheckSquare className="w-4 h-4 text-cyan-400" />
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Checklist <span className="text-cyan-400">({completedCount}/{checklist.length})</span></span>
                            </div>

                            {/* Editable Deadline */}
                            <div className="relative group">
                                <div
                                    onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()}
                                    className="bg-rose-500/10 h-8 px-4 rounded-xl border border-rose-500/20 flex items-center gap-2.5 cursor-pointer hover:bg-rose-500/20 transition-all"
                                >
                                    <Calendar className="w-4 h-4 text-rose-400" />
                                    <span className="text-rose-400 text-[10px] font-black whitespace-nowrap uppercase tracking-widest">
                                        {task.deadline ? formatDate(task.deadline) : 'Sem prazo'}
                                    </span>
                                </div>
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                                    value={task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            onUpdateTask(task.id, { deadline: e.target.value });
                                        }
                                    }}
                                />
                            </div>

                            {/* Editable Assignees - Multi-select */}
                            <div className="flex items-center -space-x-2 mr-2">
                                {assignees.map(a => (
                                    <div key={a.id} className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-900 bg-slate-800 shadow-xl relative z-0">
                                        {a.avatar ? (
                                            <img src={a.avatar} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-black">
                                                {a.name.slice(0, 1)}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="relative z-10 -ml-2">
                                    <button
                                        onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                                        className="w-6 h-6 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-full flex items-center justify-center shadow-2xl transition-all text-slate-400 hover:text-cyan-400"
                                        title="Gerenciar Responsáveis"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>

                                    {isAssigneeDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsAssigneeDropdownOpen(false)} />
                                            <div className="absolute top-full right-0 mt-3 w-56 bg-slate-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[20px] overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                                                <div className="max-h-56 overflow-y-auto py-2 custom-scrollbar">
                                                    {teamMembers.map(member => {
                                                        const isSelected = currentAssigneeIds.includes(member.id);
                                                        return (
                                                            <button
                                                                key={member.id}
                                                                onClick={() => {
                                                                    const newIds = isSelected
                                                                        ? currentAssigneeIds.filter(id => id !== member.id)
                                                                        : [...currentAssigneeIds, member.id];
                                                                    onUpdateTask(task.id, { assigneeIds: newIds, assigneeId: newIds[0] });
                                                                }}
                                                                className={`w-full text-left px-4 py-3 text-xs flex items-center gap-3 hover:bg-white/5 transition-colors ${isSelected ? 'bg-cyan-500/10' : ''}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-lg flex items-center justify-center border transition-all ${isSelected ? 'bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-white/10 bg-white/5'}`}>
                                                                    {isSelected && <Check className="w-3 h-3 text-white stroke-[4]" />}
                                                                </div>
                                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 shadow-lg border border-white/5">
                                                                    {member.avatar ? (
                                                                        <img src={member.avatar} className="w-full h-full object-cover" alt="" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-500">
                                                                            {member.name.slice(0, 1)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className={`truncate font-bold ${isSelected ? 'text-cyan-400' : 'text-slate-300'}`}>
                                                                    {member.name}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950/30 custom-scrollbar discussion-container backdrop-blur-3xl">
                <div className="p-6 pb-20 space-y-6">

                    {/* Fixed Separator */}
                    <div className="sticky top-0 z-20 py-6 mb-4 -mx-6 px-6 bg-[#0a101d]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-center shadow-2xl">
                        <div className="relative px-6">
                            <div className="flex items-center gap-3 px-4 py-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-lg">
                                <MessageSquare className="w-4 h-4 text-cyan-400" />
                                <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase">Discussão Interna</span>
                            </div>
                        </div>
                    </div>

                    {messages.length === 0 && (
                        <div className="text-center py-20 opacity-40">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                <MessageSquare className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-[11px] font-black text-slate-600 tracking-widest uppercase">Silêncio absoluto...</p>
                        </div>
                    )}
                    <div className="space-y-3">
                        {messages.map((msg) => {
                            const sender = teamMembers.find(t => t.id === msg.senderId);

                            const linkedMsg = msg.linkedMessageId && allContextMessages
                                ? allContextMessages.find(m => m.id === msg.linkedMessageId)
                                : undefined;

                            let linkedSenderName = 'Usuário';
                            if (linkedMsg) {
                                if (linkedMsg.senderId === currentUser?.id) {
                                    linkedSenderName = 'Você';
                                } else {
                                    const s = teamMembers.find(t => t.id === linkedMsg.senderId);
                                    if (s) linkedSenderName = s.name;
                                    else if (linkedMsg.senderType === 'CLIENT') linkedSenderName = 'Cliente';
                                }
                            }

                            return (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    isMe={msg.senderId === currentUser?.id}
                                    senderName={sender?.name || 'Membro'}
                                    senderJobTitle={sender?.jobTitle}
                                    colorScheme="cyan"
                                    onNavigateToLinked={onNavigateToMessage}
                                    linkedMessage={linkedMsg}
                                    linkedMessageSenderName={linkedSenderName}
                                />
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>

            {/* Premium Floating Input Pill */}
            <div className="p-6 bg-slate-900/60 backdrop-blur-md border-t border-white/5 relative">
                <div className="max-w-4xl mx-auto flex items-center gap-4 bg-slate-800/80 p-2.5 pl-5 rounded-[32px] border border-white/10 shadow-2xl focus-within:border-cyan-500/50 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all duration-300 group">
                    <button className="text-slate-500 hover:text-cyan-400 transition-colors disabled:opacity-50" disabled={isAddingComment}>
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                        <MentionInput
                            ref={inputRef}
                            value={comment}
                            onChange={setComment}
                            teamMembers={teamMembers}
                            onSubmit={handleSubmit}
                            placeholder={isAddingComment ? "Manifestando..." : "Escreva sua mensagem espacial..."}
                            className="w-full bg-transparent border-none text-white text-[15px] placeholder:text-slate-600 focus:ring-0 focus:outline-none py-1.5 font-medium"
                            disabled={isAddingComment}
                        />
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!comment.trim() || isAddingComment}
                        className={`p-3 rounded-full transition-all duration-300 ${!comment.trim() || isAddingComment ? 'bg-slate-700 text-slate-500 scale-90' : 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 hover:scale-110 active:scale-95'}`}
                    >
                        {isAddingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
