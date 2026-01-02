import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle2, ChevronDown, Folder, Search, X, Archive, Filter } from 'lucide-react';
import { Task, Message, DiscussionDraft, User as UIUser } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { TaskCard } from './TaskCard';
import { TaskDetail } from './TaskDetail';
import { TaskCreation } from './TaskCreation';

interface TaskManagerProps {
    tasks: Task[];
    allMessages: Message[];
    discussionDraft: DiscussionDraft | null;
    onCancelDraft: () => void;
    onCreateTaskFromDraft: (data: {
        title: string;
        priority: 'low' | 'medium' | 'high';
        assigneeId?: string;
        status: 'todo' | 'in-progress' | 'review' | 'done';
        deadline?: string;
        tags?: string[];
        description?: string;
    }) => void;
    onAttachTaskFromDraft: (taskId: string) => void;
    onNavigateToMessage: (id: string) => void;
    onAddTaskComment: (taskId: string, text: string) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onManualCreate: () => void;
    teamMembers: UIUser[];
}

type StatusFilter = 'all' | 'todo' | 'in-progress' | 'review' | 'done' | 'archived';

export const TaskManager: React.FC<TaskManagerProps> = (props) => {
    const { isSuperAdmin, permissions } = useAuth();
    const canManage = isSuperAdmin || permissions?.can_manage_tasks;
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');
    const [tagFilter, setTagFilter] = useState<string | 'all'>('all');

    // Dropdown visibility state
    const [openFilter, setOpenFilter] = useState<'status' | 'assignee' | 'tag' | null>(null);

    if (props.discussionDraft) {
        return <TaskCreation
            draft={props.discussionDraft}
            existingTasks={props.tasks}
            teamMembers={props.teamMembers}
            onCancel={props.onCancelDraft}
            onCreate={props.onCreateTaskFromDraft}
            onAttach={props.onAttachTaskFromDraft}
        />;
    }

    // Reactivity: Use task from props if available so real-time updates reflect in detail view
    const currentTask = selectedTask ? props.tasks.find(t => t.id === selectedTask.id) || (selectedTask.archivedAt ? selectedTask : null) : null;

    if (currentTask) {
        return <TaskDetail
            task={currentTask}
            messages={props.allMessages.filter(m => m.taskId === currentTask.id)}
            onBack={() => setSelectedTask(null)}
            onNavigateToMessage={props.onNavigateToMessage}
            onAddComment={(text) => props.onAddTaskComment(currentTask.id, text)}
            onUpdateTask={props.onUpdateTask}
            teamMembers={props.teamMembers}
            allTasks={props.tasks}
            allContextMessages={props.allMessages}
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

        return true;
    });

    const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (assigneeFilter !== 'all' ? 1 : 0) + (tagFilter !== 'all' ? 1 : 0);

    return (
        <div className="flex flex-col h-full bg-slate-50/20">
            {/* Header */}
            <div className="h-[56px] flex items-center justify-between px-5 bg-white border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                        <Folder className="w-4 h-4" />
                    </div>
                    <h3 className="text-[16px] font-black text-slate-800 tracking-tight">Tasks do Projeto</h3>
                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                        {filteredTasks.length}
                    </span>
                </div>
                {canManage && (
                    <button
                        onClick={props.onManualCreate}
                        className="flex items-center gap-2 bg-black text-white px-3.5 py-1.5 rounded-full font-bold text-[11.5px] hover:bg-black/80 transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Nova Task
                    </button>
                )}
            </div>

            {/* Enhanced Filter Bar - 2 Rows */}
            <div className="flex flex-col bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-50 shadow-sm relative">
                {/* Row 1: Search */}
                <div className="px-5 py-2 border-b border-slate-50/50">
                    <div className="relative group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar tasks..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 placeholder:text-slate-400 transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-3 h-3 text-slate-400" />
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
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[11px] font-bold transition-all whitespace-nowrap shadow-sm ${statusFilter !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200/60 text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {statusFilter === 'all' ? 'Status' : statusFilter === 'archived' ? 'Arquivadas' : statusFilter.toUpperCase()}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                        {openFilter === 'status' && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                                <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="py-1">
                                        <button onClick={() => { setStatusFilter('all'); setOpenFilter(null); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${statusFilter === 'all' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Todos</button>
                                        <div className="h-px bg-slate-100 my-1" />
                                        <button onClick={() => { setStatusFilter('todo'); setOpenFilter(null); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${statusFilter === 'todo' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Pendente</button>
                                        <button onClick={() => { setStatusFilter('in-progress'); setOpenFilter(null); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${statusFilter === 'in-progress' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Em Progresso</button>
                                        <button onClick={() => { setStatusFilter('review'); setOpenFilter(null); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${statusFilter === 'review' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Revisão</button>
                                        <button onClick={() => { setStatusFilter('done'); setOpenFilter(null); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${statusFilter === 'done' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Concluído</button>
                                        <div className="h-px bg-slate-100 my-1" />
                                        <button onClick={() => { setStatusFilter('archived'); setOpenFilter(null); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${statusFilter === 'archived' ? 'font-bold text-rose-600' : 'text-slate-600'}`}>
                                            <Archive className="w-3 h-3" /> Arquivadas
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
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[11px] font-bold transition-all whitespace-nowrap shadow-sm ${assigneeFilter !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200/60 text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {assigneeFilter === 'all' ? 'Responsável' : props.teamMembers.find(m => m.id === assigneeFilter)?.name.split(' ')[0] || 'Unknown'}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                        {openFilter === 'assignee' && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="max-h-64 overflow-y-auto py-1">
                                        <button onClick={() => { setAssigneeFilter('all'); setOpenFilter(null); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${assigneeFilter === 'all' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Todos</button>
                                        {props.teamMembers.map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => { setAssigneeFilter(member.id); setOpenFilter(null); }}
                                                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${assigneeFilter === member.id ? 'font-bold text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                                            >
                                                <div className="w-4 h-4 rounded-full bg-slate-200 overflow-hidden">
                                                    {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : null}
                                                </div>
                                                {member.name}
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
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[11px] font-bold transition-all whitespace-nowrap shadow-sm ${tagFilter !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200/60 text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {tagFilter === 'all' ? 'Etiqueta' : `#${tagFilter}`}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                        {openFilter === 'tag' && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                                <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="max-h-64 overflow-y-auto py-1">
                                        <button onClick={() => { setTagFilter('all'); setOpenFilter(null); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${tagFilter === 'all' ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>Todas</button>
                                        {uniqueTags.map(tag => (
                                            <button
                                                key={tag as string}
                                                onClick={() => { setTagFilter(tag as string); setOpenFilter(null); }}
                                                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${tagFilter === tag ? 'font-bold text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
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
                            onClick={() => { setStatusFilter('all'); setAssigneeFilter('all'); setTagFilter('all'); setSearchQuery(''); }}
                            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                            title="Limpar filtros"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2.5 pb-4 pt-3 bg-slate-50/50">
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
                                    onClick={() => { setStatusFilter('all'); setAssigneeFilter('all'); setTagFilter('all'); setSearchQuery(''); }}
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
                        {filteredTasks.map((t, index) => {
                            const count = props.allMessages.filter(m => m.channelId === t.id).length;
                            const assignee = props.teamMembers.find(m => m.id === t.assigneeId);

                            return (
                                <TaskCard
                                    key={t.id}
                                    task={t}
                                    messageCount={count}
                                    assignee={assignee}
                                    notificationCount={index === 0 ? 0 : 0}
                                    onClick={() => setSelectedTask(t)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
