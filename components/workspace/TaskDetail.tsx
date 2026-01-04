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
    { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
    { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
    { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
];

const getTagColor = (tag: string) => {
    const hash = tag.toLowerCase().split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return TAG_COLORS[hash % TAG_COLORS.length];
};

const statusConfig = {
    'done': { label: 'APROVADO', color: 'bg-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50/50' },
    'in-progress': { label: 'EM PROGRESSO', color: 'bg-blue-400', text: 'text-blue-600', bg: 'bg-blue-50/50' },
    'todo': { label: 'PENDENTE', color: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50/50' },
    'review': { label: 'REVISÃO', color: 'bg-indigo-400', text: 'text-indigo-600', bg: 'bg-indigo-50/50' },
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
                <div className={`h-[52px] flex items-center justify-between px-4 border-b ${config.color.replace('bg-', 'border-').replace('500', '100')} bg-white/50 backdrop-blur-sm`}>
                    <button
                        onClick={onBack}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${config.bg.replace('50', '100')} ${config.text}`}>
                            {config.label}
                        </span>
                        <div className="h-4 w-px bg-slate-200 mx-1" />
                        <button
                            onClick={handleArchive}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Arquivar Tarefa"
                        >
                            <Archive className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-sm">
                    Esta tarefa foi arquivada. Restaure-a para visualizar.
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Checklist Modal */}
            {isChecklistOpen && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={(e) => {
                    if (e.target === e.currentTarget) setIsChecklistOpen(false)
                }}>
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[80%]">
                        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-indigo-500" />
                                <span className="font-bold text-slate-700 text-sm">Checklist</span>
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
                                            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400">MODELOS DISPONÍVEIS</div>
                                                <div className="max-h-48 overflow-y-auto">
                                                    {checklistTemplates.map(t => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => handleImportTemplate(t)}
                                                            className="w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50 text-slate-600 font-medium flex items-center justify-between group"
                                                        >
                                                            <span>{t.name}</span>
                                                            <Plus className="w-3 h-3 text-slate-300 group-hover:text-indigo-500" />
                                                        </button>
                                                    ))}
                                                    {checklistTemplates.length === 0 && (
                                                        <div className="p-3 text-center text-slate-400 text-[10px]">Nenhum modelo salvo.</div>
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

                                <button onClick={() => setIsChecklistOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {isSaveAsTemplateOpen && (
                            <div className="p-3 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top duration-200">
                                <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1.5">Salvar Checklist como Modelo</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nome do modelo (ex: Onboarding)"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        className="flex-1 text-xs px-2 py-1.5 rounded border border-indigo-200 focus:outline-none focus:border-indigo-500 bg-white"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSaveAsTemplate}
                                        disabled={!newTemplateName.trim()}
                                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-[10px] font-bold hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        SALVAR
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="p-3 overflow-y-auto flex-1 space-y-2">
                            {checklist.map(item => (
                                <div key={item.id} className="flex items-start gap-2 group">
                                    <button onClick={() => toggleChecklistItem(item.id)} className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'}`}>
                                        {item.completed && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                    <div className={`flex-1 text-xs ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                        {item.text}
                                    </div>
                                    <button onClick={() => removeChecklistItem(item.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {checklist.length === 0 && (
                                <p className="text-center text-slate-400 text-xs py-4 italic">Nenhum item na checklist.</p>
                            )}
                        </div>
                        <div className="p-3 border-t border-slate-100 bg-slate-50">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    placeholder="Novo item..."
                                    className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-indigo-500"
                                    onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                />
                                <button onClick={addChecklistItem} disabled={!newItemText.trim()} className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700 disabled:opacity-50">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ultra Compact Premium Header */}
            <div className="flex-none bg-white border-b border-slate-100 z-10 shadow-sm relative">
                <div className="h-[46px] flex items-center justify-between px-3">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-1 hover:bg-slate-50 rounded-lg transition-colors">
                            <ArrowLeft className="w-4 h-4 text-slate-500" />
                        </button>
                        <div className="flex items-center gap-4 border-l border-slate-100 pl-4">
                            <button className="text-[#fab005] hover:scale-110 transition-transform" title="Automação (Em breve)">
                                <Zap className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button onClick={handleArchive} className="text-slate-400 hover:scale-110 transition-transform hover:text-rose-500" title="Arquivar">
                                <Archive className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                            <MessageSquare className="w-3 h-3 text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-600">{messages.length}</span>
                        </div>
                    </div>
                </div>

                {/* Single Context Session */}
                <div className="px-4 pb-2 pt-1">
                    <div className={`p-3 rounded-xl border shadow-sm space-y-3 transition-all hover:shadow-md group/card ${config.bg} ${config.color.replace('bg-', 'border-').replace('400', '100')}`}>
                        <div className="space-y-2">
                            {/* Title & Status Row */}
                            <div className="flex items-start justify-between gap-3">
                                <input
                                    type="text"
                                    className="flex-1 text-[16px] font-black text-slate-800 leading-tight bg-transparent border-none focus:ring-0 p-0 placeholder-slate-300"
                                    value={task.title}
                                    onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
                                    placeholder="Título da tarefa..."
                                />

                                {/* Status Selector */}
                                <div className="relative flex-shrink-0">
                                    <button
                                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                        className={`h-7 px-2.5 rounded-md border flex items-center gap-1.5 shadow-sm cursor-pointer hover:bg-white/50 transition-colors ${config.bg.replace('50/50', '100')} ${config.color.replace('bg-', 'border-').replace('400', '200')}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${config.color}`} />
                                        <span className={`text-[10px] font-black tracking-wider uppercase ${config.text}`}>{config.label}</span>
                                        <ChevronDown className={`w-3 h-3 ${config.text} opacity-50`} />
                                    </button>

                                    {isStatusDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-20" onClick={() => setIsStatusDropdownOpen(false)} />
                                            <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-75">
                                                {Object.entries(statusConfig).map(([key, conf]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            onUpdateTask(task.id, { status: key as any });
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-slate-50 flex items-center gap-2 transition-colors ${task.status === key ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}
                                                    >
                                                        <div className={`w-1.5 h-1.5 rounded-full ${conf.color}`} />
                                                        {conf.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Tags Row */}
                            <div className="flex flex-wrap gap-1.5 items-center">
                                <div className="relative">
                                    <button
                                        onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white text-slate-400 text-[9px] font-bold rounded-full border border-dashed border-slate-200 hover:border-slate-300 transition-all uppercase"
                                    >
                                        <Plus className="w-2.5 h-2.5" />
                                        Tag
                                    </button>
                                    {isTagDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-20" onClick={() => setIsTagDropdownOpen(false)} />
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-100">
                                                <div className="p-2 border-b border-slate-50">
                                                    <input
                                                        autoFocus
                                                        className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:border-indigo-500"
                                                        placeholder="Pesquisar/Criar tag..."
                                                        value={tagInput}
                                                        onChange={(e) => setTagInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddTag();
                                                        }}
                                                    />
                                                </div>
                                                <div className="max-h-32 overflow-y-auto">
                                                    {availableTags.map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => toggleTag(tag as string)}
                                                            className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <div className={`w-2 h-2 rounded-full ${getTagColor(tag as string).dot}`} />
                                                            {tag}
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
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 ${color.bg} ${color.text} text-[9px] font-bold rounded-full border border-black/5`}
                                        >
                                            <X className="w-2.5 h-2.5 cursor-pointer hover:opacity-50" onClick={() => toggleTag(tag)} />
                                            {tag}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="h-px bg-slate-50" />

                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Checklist card */}
                            <div
                                onClick={() => setIsChecklistOpen(true)}
                                className="bg-white h-7 px-2.5 rounded-md border border-slate-100 flex items-center gap-2 shadow-sm shadow-black/[0.02] cursor-pointer hover:border-indigo-200 transition-colors"
                            >
                                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-slate-400 text-[10px] font-bold">Checklist <span className="text-indigo-500 font-black">({completedCount}/{checklist.length})</span></span>
                            </div>

                            {/* Editable Deadline */}
                            <div className="relative group">
                                <div
                                    onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()}
                                    className="bg-[#fff5f5] h-7 px-2.5 rounded-md border border-[#ffc9c9]/30 flex items-center gap-2 cursor-pointer hover:bg-[#fff0f0] transition-colors"
                                >
                                    <Calendar className="w-3.5 h-3.5 text-[#e03131]" />
                                    <span className="text-[#e03131] text-[10px] font-bold whitespace-nowrap">
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
                            <div className="flex items-end -space-x-2">
                                {assignees.map(a => (
                                    <div key={a.id} className="w-8 h-8 rounded-full overflow-hidden border-2 border-white bg-slate-200 shadow-sm relative z-0">
                                        {a.avatar ? (
                                            <img src={a.avatar} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-500 font-bold">
                                                {a.name.slice(0, 1)}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="relative z-10 -ml-2 mb-[1px]">
                                    <button
                                        onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                                        className="w-5 h-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center shadow-sm transition-all text-slate-400 hover:text-indigo-500"
                                        title="Gerenciar Responsáveis"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>

                                    {isAssigneeDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsAssigneeDropdownOpen(false)} />
                                            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                                                <div className="max-h-48 overflow-y-auto py-1">
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
                                                                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                                                            >
                                                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'}`}>
                                                                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                                </div>
                                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                                                                    {member.avatar ? (
                                                                        <img src={member.avatar} className="w-full h-full object-cover" alt="" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                                            {member.name.slice(0, 1)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className={`truncate ${isSelected ? 'text-indigo-700 font-bold' : 'text-slate-600'}`}>
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

            <div className="flex-1 overflow-y-auto bg-[#efeae2] discussion-container">
                <div className="p-4 pb-10 space-y-4">

                    {/* Fixed Separator */}
                    <div className="sticky top-0 z-20 py-4 mb-2 -mx-4 px-4 bg-[#efeae2] flex items-center justify-center">
                        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />
                        <div className="relative px-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/60 backdrop-blur-sm border border-white/50 rounded-full shadow-sm">
                                <MessageSquare className="w-3 h-3 text-indigo-500" />
                                <span className="text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase">Discussão Interna</span>
                            </div>
                        </div>
                    </div>

                    {messages.length === 0 && (
                        <div className="text-center py-8">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-[11px] text-slate-400 italic">Nenhuma mensagem ainda...</p>
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
                                    colorScheme="indigo"
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

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex items-center space-x-4">
                    <button className="text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled={isAddingComment}>
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                        <MentionInput
                            ref={inputRef}
                            value={comment}
                            onChange={setComment}
                            teamMembers={teamMembers}
                            onSubmit={handleSubmit}
                            placeholder={isAddingComment ? "Enviando..." : "Digite uma mensagem..."}
                            className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-75"
                            disabled={isAddingComment}
                        />
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!comment.trim() || isAddingComment}
                        className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
                    >
                        {isAddingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
