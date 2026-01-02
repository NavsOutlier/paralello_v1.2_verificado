import React from 'react';
import { MessageSquare, Calendar, CheckSquare, Plus, X, ChevronDown } from 'lucide-react';
import { Task, User as UIUser } from '../../types';

interface TaskCardProps {
    task: Task;
    messageCount: number;
    onClick: () => void;
    assignees: UIUser[];
    notificationCount?: number;
    onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
}

const TAG_COLORS = [
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
];

const getTagColor = (tag: string) => {
    const hash = tag.toLowerCase().split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return TAG_COLORS[hash % TAG_COLORS.length];
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, messageCount, onClick, assignees = [], notificationCount = 0, onUpdateTask }) => {

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        const day = d.getDate();
        const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        return `${day} de ${month.toLowerCase()}.`;
    };

    const statusStyles = {
        'done': { label: 'APROVADO', bg: 'bg-emerald-50/50', border: 'border-emerald-200/60', badge: 'bg-emerald-100 text-emerald-700' },
        'in-progress': { label: 'EM PROGRESSO', bg: 'bg-blue-50/50', border: 'border-blue-200/60', badge: 'bg-blue-100 text-blue-700' },
        'todo': { label: 'PENDENTE', bg: 'bg-amber-50/50', border: 'border-amber-200/60', badge: 'bg-amber-100 text-amber-700' },
        'review': { label: 'REVISÃO', bg: 'bg-indigo-50/50', border: 'border-indigo-200/60', badge: 'bg-indigo-100 text-indigo-700' },
    };

    const isArchived = !!task.archivedAt;
    const statusConfig = isArchived
        ? { label: 'ARQUIVADO', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-500' }
        : statusStyles[task.status] || statusStyles.todo;

    // Checklist stats
    const totalChecklist = task.checklist?.length || 0;
    const completedChecklist = task.checklist?.filter(i => i.completed).length || 0;

    const [isStatusOpen, setIsStatusOpen] = React.useState(false);
    const statusRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
                setIsStatusOpen(false);
            }
        };

        if (isStatusOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isStatusOpen]);

    const handleStatusClick = (e: React.MouseEvent, newStatus: Task['status']) => {
        e.stopPropagation();
        if (onUpdateTask) {
            onUpdateTask(task.id, { status: newStatus });
        }
        setIsStatusOpen(false);
    };

    const toggleStatus = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsStatusOpen(!isStatusOpen);
    };

    const statusOptions: { value: Task['status'], label: string, dot: string }[] = [
        { value: 'todo', label: 'PENDENTE', dot: 'bg-amber-400' },
        { value: 'in-progress', label: 'EM PROGRESSO', dot: 'bg-blue-400' },
        { value: 'review', label: 'REVISÃO', dot: 'bg-indigo-400' },
        { value: 'done', label: 'APROVADO', dot: 'bg-emerald-400' },
    ];

    return (
        <div
            onClick={onClick}
            className={`group relative p-4 rounded-[16px] border cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 ${statusConfig.bg} ${statusConfig.border} ${isArchived ? 'opacity-60 grayscale-[0.5]' : 'hover:border-indigo-300'}`}
        >
            {/* Notification Badge */}
            {notificationCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10">
                    {notificationCount}
                </div>
            )}

            {/* Title & Status Row */}
            <div className="mb-2.5 flex items-start justify-between gap-3">
                <h4 className="text-[15px] font-black text-slate-800 leading-tight tracking-tight group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {task.title}
                </h4>

                <div className="relative flex-shrink-0" ref={statusRef}>
                    <button
                        onClick={toggleStatus}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase transition-colors hover:bg-white/50 border border-transparent hover:border-black/5 ${statusConfig.badge} flex items-center gap-1`}
                    >
                        {statusConfig.label}
                        <ChevronDown className="w-3 h-3 opacity-50 stroke-[3]" />
                    </button>

                    {isStatusOpen && (
                        <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-75">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={(e) => handleStatusClick(e, option.value)}
                                    className={`w-full text-left px-3 py-2 text-[10px] font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors ${task.status === option.value ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${option.dot}`} />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Tags Row */}
            <div className="flex flex-wrap gap-2 mb-4">
                {/* Dashed Add Button Placeholder (Visual only) */}
                <div className="h-6 px-2 flex items-center gap-1 rounded-full border border-dashed border-slate-300/50 bg-white/50 text-slate-400">
                    <Plus className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">TAG</span>
                </div>

                {task.tags?.map(tag => {
                    const color = getTagColor(tag);
                    return (
                        <div
                            key={tag}
                            className={`h-6 px-2.5 flex items-center gap-1.5 rounded-full border bg-white/60 ${color.border} ${color.text}`}
                        >
                            <X className="w-3 h-3 opacity-50 cursor-pointer hover:opacity-100" />
                            <span className="text-[10px] font-bold">{tag}</span>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Row: Metadata & Assignees */}
            <div className="flex items-center justify-between pt-3 border-t border-black/5">
                <div className="flex items-center gap-2">
                    {/* Checklist Badge */}
                    {totalChecklist > 0 && (
                        <div className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg border border-indigo-200/50 bg-white/80 shadow-sm">
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[10px] font-bold text-slate-600">
                                Checklist <span className="text-indigo-600">({completedChecklist}/{totalChecklist})</span>
                            </span>
                        </div>
                    )}

                    {/* Deadline Badge */}
                    {task.deadline && (
                        <div className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg border border-red-100 bg-white/80">
                            <Calendar className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-[10px] font-bold text-red-600">
                                {formatDate(task.deadline)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center">
                    {/* Avatar Stack */}
                    <div className="flex items-center -space-x-2">
                        {assignees.slice(0, 3).map((assignee, idx) => (
                            <div
                                key={assignee.id}
                                className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 relative z-[2] shadow-sm overflow-hidden"
                                title={assignee.name}
                            >
                                {assignee.avatar ? (
                                    <img src={assignee.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white text-[9px] font-bold">
                                        {assignee.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        ))}
                        {assignees.length > 3 && (
                            <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 relative z-[1] shadow-sm">
                                +{assignees.length - 3}
                            </div>
                        )}
                    </div>

                    {/* Message Count */}
                    {messageCount > 0 && (
                        <div className="ml-3 flex items-center gap-1 text-slate-400">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">{messageCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
