import React, { useState } from 'react';
import { Plus, CheckCircle2, ChevronDown, Folder, Search, X, Archive, Filter, Flag, List, LayoutGrid } from 'lucide-react';
import { Task, Message, DiscussionDraft, User as UIUser, ChecklistTemplate, ChecklistItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { TaskCard } from './TaskCard';
import { TaskDetail } from './TaskDetail';
import { TaskCreation } from './TaskCreation';
import { KanbanBoard } from './KanbanBoard';

interface TaskManagerProps {
    tasks: Task[];
    allMessages: Message[];
    discussionDraft: DiscussionDraft | null;
    onCancelDraft: () => void;
    onCreateTaskFromDraft: (data: {
        title: string;
        priority: 'low' | 'medium' | 'high';
        assigneeId?: string;
        assigneeIds?: string[];
        status: 'todo' | 'in-progress' | 'review' | 'done';
        deadline?: string;
        tags?: string[];
        description?: string;
        clientId?: string; // Support override
    }) => void;
    onAttachTaskFromDraft: (taskId: string, comment?: string) => void;
    onNavigateToMessage: (id: string) => void;
    onAddTaskComment: (taskId: string, text: string) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onManualCreate: () => void;
    teamMembers: UIUser[];
    checklistTemplates: ChecklistTemplate[];
    onCreateChecklistTemplate: (name: string, items: ChecklistItem[]) => void;
    onDeleteChecklistTemplate: (templateId: string) => void;
    selectedTask?: Task | null;
    onSelectTask?: (task: Task | null) => void;
    clients?: { id: string; name: string }[]; // New Prop
    initialClientId?: string; // New Prop
}

type StatusFilter = 'all' | 'todo' | 'in-progress' | 'review' | 'done' | 'archived';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high';

export const TaskManager: React.FC<TaskManagerProps> = (props) => {
    const { isSuperAdmin, permissions } = useAuth();
    const canManage = isSuperAdmin || permissions?.can_manage_tasks;
    const [internalSelectedTask, setInternalSelectedTask] = useState<Task | null>(null);

    // View Mode State
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

    const selectedTask = props.selectedTask !== undefined ? props.selectedTask : internalSelectedTask;
    const handleSelectTask = (t: Task | null) => {
        if (props.onSelectTask) {
            props.onSelectTask(t);
        } else {
            setInternalSelectedTask(t);
        }
    };

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');
    const [tagFilter, setTagFilter] = useState<string | 'all'>('all');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

    // Dropdown visibility state
    const [openFilter, setOpenFilter] = useState<'status' | 'assignee' | 'tag' | 'priority' | null>(null);

    const handleAttachTask = (taskId: string, comment?: string) => {
        props.onAttachTaskFromDraft(taskId, comment);
        const task = props.tasks.find(t => t.id === taskId);
        if (task) {
            handleSelectTask(task);
        }
    };

    if (props.discussionDraft) {
        return <TaskCreation
            draft={props.discussionDraft}
            existingTasks={props.tasks}
            teamMembers={props.teamMembers}
            onCancel={props.onCancelDraft}
            onCreate={props.onCreateTaskFromDraft}
            onAttach={handleAttachTask}
            checklistTemplates={props.checklistTemplates}
            clients={props.clients}
            initialClientId={props.initialClientId}
        />;
    }

    // Reactivity: Use task from props if available so real-time updates reflect in detail view
    const currentTask = selectedTask ? props.tasks.find(t => t.id === selectedTask.id) || (selectedTask.archivedAt ? selectedTask : null) : null;

    if (currentTask) {
        return <TaskDetail
            task={currentTask}
            messages={props.allMessages.filter(m => m.taskId === currentTask.id)}
            onBack={() => handleSelectTask(null)}
            onNavigateToMessage={props.onNavigateToMessage}
            onAddComment={(text) => props.onAddTaskComment(currentTask.id, text)}
            onUpdateTask={props.onUpdateTask}
            teamMembers={props.teamMembers}
            allTasks={props.tasks}
            allContextMessages={props.allMessages}
            checklistTemplates={props.checklistTemplates}
            onCreateChecklistTemplate={props.onCreateChecklistTemplate}
            onDeleteChecklistTemplate={props.onDeleteChecklistTemplate}
        />;
    }

    // Derived Lists for Filters
    const uniqueTags = Array.from(new Set(props.tasks.flatMap(t => t.tags || [])));

    // Filtering Logic
    const filteredTasks = props.tasks.filter(task => {
        // Search
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Status & Archive Logic
        if (statusFilter === 'archived') {
            if (!task.archivedAt) return false;
        } else {
            // Normal statuses logic - MUST exclude archived
            if (task.archivedAt) return false;

            if (statusFilter !== 'all' && task.status !== statusFilter) {
                return false;
            }
        }

        // Assignee
        if (assigneeFilter !== 'all') {
            const assigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
            if (!assigneeIds.includes(assigneeFilter)) return false;
        }

        // Tag
        if (tagFilter !== 'all') {
            if (!(task.tags || []).includes(tagFilter)) return false;
        }

        // Priority
        if (priorityFilter !== 'all') {
            if (task.priority !== priorityFilter) return false;
        }

        return true;
    });

    const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (assigneeFilter !== 'all' ? 1 : 0) + (tagFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0);

    return (
        <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-xl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-slate-900/40 backdrop-blur-md border-b border-cyan-500/10 flex-none gap-4 min-w-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-cyan-400 border border-cyan-500/10 transition-all hover:scale-110">
                            <Folder className="w-4 h-4" />
                        </div>
                        <h3 className="text-[16px] font-black text-white tracking-tight">Tasks do Projeto</h3>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center p-1 bg-slate-800 rounded-lg gap-1 border border-white/5 shadow-inner">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Lista"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Quadro"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                        {filteredTasks.length}
                    </span>
                    {canManage && (
                        <button
                            onClick={props.onManualCreate}
                            className="flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-violet-600 text-white px-4 py-2 rounded-full font-black text-[11.5px] hover:scale-105 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 border border-white/10"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Nova Task
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'list' ? (
                <>
                    {/* Enhanced Filter Bar - 2 Rows */}
                    <div className="flex flex-col bg-slate-900/60 backdrop-blur-xl sticky top-0 z-10 border-b border-white/5 shadow-xl relative flex-shrink-0">
                        {/* Row 1: Search */}
                        <div className="px-5 py-3 border-b border-white/5">
                            <div className="relative group w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar tasks..."
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/50 border border-cyan-500/10 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 placeholder:text-slate-600 transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-full transition-colors">
                                        <X className="w-3 h-3 text-slate-500" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Filters */}
                        <div className="px-5 py-2 flex gap-2 flex-wrap pb-3">
                            {/* Status Filter */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[11px] font-black transition-all whitespace-nowrap shadow-lg ${statusFilter !== 'all' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                                        }`}
                                >
                                    {statusFilter === 'all' ? 'Status' : statusFilter === 'archived' ? 'Arquivadas' : statusFilter.toUpperCase()}
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </button>
                                {openFilter === 'status' && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-[#0d121f]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="p-2 space-y-1">
                                                <button onClick={() => { setStatusFilter('all'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>Todos</button>
                                                <div className="h-px bg-white/5 mx-2 my-1" />
                                                <button onClick={() => { setStatusFilter('todo'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'todo' ? 'bg-amber-500/10 text-amber-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> Pendente
                                                </button>
                                                <button onClick={() => { setStatusFilter('in-progress'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'in-progress' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" /> Em Progresso
                                                </button>
                                                <button onClick={() => { setStatusFilter('review'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'review' ? 'bg-violet-500/10 text-violet-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]" /> Revisão
                                                </button>
                                                <button onClick={() => { setStatusFilter('done'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> Concluído
                                                </button>
                                                <div className="h-px bg-white/5 mx-2 my-1" />
                                                <button onClick={() => { setStatusFilter('archived'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'archived' ? 'bg-rose-500/10 text-rose-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                    <Archive className="w-3.5 h-3.5" /> Arquivadas
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Priority Filter */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenFilter(openFilter === 'priority' ? null : 'priority')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[11px] font-black transition-all whitespace-nowrap shadow-lg ${priorityFilter !== 'all' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                                        }`}
                                >
                                    {priorityFilter === 'all' ? 'Prioridade' : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </button>
                                {openFilter === 'priority' && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                                        <div className="absolute top-full left-0 mt-3 w-48 bg-[#0d121f]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-2 space-y-1">
                                                <button onClick={() => { setPriorityFilter('all'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${priorityFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>Todas Níveis</button>
                                                <div className="h-px bg-white/5 mx-2 my-1" />
                                                <button onClick={() => { setPriorityFilter('high'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-3 ${priorityFilter === 'high' ? 'bg-rose-500/10 text-rose-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                    <Flag className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]" /> Crítica
                                                </button>
                                                <button onClick={() => { setPriorityFilter('medium'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-3 ${priorityFilter === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                    <Flag className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.3)]" /> Operacional
                                                </button>
                                                <button onClick={() => { setPriorityFilter('low'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-3 ${priorityFilter === 'low' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                    <Flag className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]" /> Suporte
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Assignee Filter */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenFilter(openFilter === 'assignee' ? null : 'assignee')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[11px] font-black transition-all whitespace-nowrap shadow-lg ${assigneeFilter !== 'all' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                                        }`}
                                >
                                    {assigneeFilter === 'all' ? 'Responsável' : props.teamMembers.find(m => m.id === assigneeFilter)?.name.split(' ')[0] || 'Unknown'}
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </button>
                                {openFilter === 'assignee' && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                                        <div className="absolute top-full left-0 mt-3 w-64 bg-[#0d121f]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                                <button onClick={() => { setAssigneeFilter('all'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${assigneeFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>Todos Colaboradores</button>
                                                <div className="h-px bg-white/5 mx-2 my-1" />
                                                {props.teamMembers.map(member => (
                                                    <button
                                                        key={member.id}
                                                        onClick={() => { setAssigneeFilter(member.id); setOpenFilter(null); }}
                                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-3 ${assigneeFilter === member.id ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                                                    >
                                                        <div className="w-6 h-6 rounded-lg bg-slate-800 border border-white/10 overflow-hidden flex-shrink-0">
                                                            {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : (
                                                                <div className="w-full h-full flex items-center justify-center text-[8px] font-black bg-indigo-500/20 text-indigo-400">
                                                                    {member.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="truncate">{member.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Tag Filter */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenFilter(openFilter === 'tag' ? null : 'tag')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[11px] font-black transition-all whitespace-nowrap shadow-lg ${tagFilter !== 'all' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                                        }`}
                                >
                                    {tagFilter === 'all' ? 'Etiqueta' : `#${tagFilter}`}
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </button>
                                {openFilter === 'tag' && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-[#0d121f]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                                <button onClick={() => { setTagFilter('all'); setOpenFilter(null); }} className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tagFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>Todas</button>
                                                {uniqueTags.map(tag => (
                                                    <button
                                                        key={tag as string}
                                                        onClick={() => { setTagFilter(tag as string); setOpenFilter(null); }}
                                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tagFilter === tag ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                                                    >
                                                        #{tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {activeFilterCount > 0 && (
                                <button
                                    onClick={() => { setStatusFilter('all'); setAssigneeFilter('all'); setTagFilter('all'); setPriorityFilter('all'); setSearchQuery(''); }}
                                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                                    title="Limpar filtros"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2.5 pb-4 pt-4 bg-transparent custom-scrollbar">
                        {filteredTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center mt-20 text-slate-400">
                                {statusFilter === 'archived' ? (
                                    <>
                                        <Archive className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="text-sm font-medium">Nenhuma tarefa arquivada.</p>
                                    </>
                                ) : searchQuery || activeFilterCount > 0 ? (
                                    <>
                                        <Filter className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="text-sm font-medium">Nenhum resultado para o filtro.</p>
                                        <button
                                            onClick={() => { setStatusFilter('all'); setAssigneeFilter('all'); setTagFilter('all'); setPriorityFilter('all'); setSearchQuery(''); }}
                                            className="mt-2 text-xs text-indigo-600 font-bold hover:underline"
                                        >
                                            Limpar filtros
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="text-sm font-medium">Nenhuma tarefa aberta.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredTasks.map((task, index) => {
                                    const currentAssigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);

                                    return (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            messageCount={props.allMessages.filter(m => m.taskId === task.id && m.contextType === 'TASK_INTERNAL').length}
                                            onClick={() => handleSelectTask(task)}
                                            assignees={props.teamMembers.filter(m => currentAssigneeIds.includes(m.id))}
                                            onUpdateTask={props.onUpdateTask}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <KanbanBoard
                    tasks={filteredTasks}
                    allMessages={props.allMessages}
                    teamMembers={props.teamMembers}
                    onUpdateTask={props.onUpdateTask}
                    onSelectTask={handleSelectTask}
                    onManualCreate={props.onManualCreate}
                />
            )}
        </div>
    );
};
