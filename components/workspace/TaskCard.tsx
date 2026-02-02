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
    { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/20' },
    { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
    { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20' },
    { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/20' },
    { bg: 'bg-sky-500/10', text: 'text-sky-300', border: 'border-sky-500/20' },
    { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/20' },
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
        'done': { label: 'APROVADO', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10', badge: 'bg-emerald-500/10 text-emerald-400' },
        'in-progress': { label: 'EM PROGRESSO', bg: 'bg-blue-500/5', border: 'border-blue-500/10', badge: 'bg-blue-500/10 text-blue-400' },
        'todo': { label: 'PENDENTE', bg: 'bg-amber-500/5', border: 'border-amber-500/10', badge: 'bg-amber-500/10 text-amber-400' },
        'review': { label: 'REVISÃO', bg: 'bg-indigo-500/5', border: 'border-indigo-500/10', badge: 'bg-indigo-500/10 text-indigo-400' },
    };

    const isArchived = !!task.archivedAt;
    const statusConfig = isArchived
        ? { label: 'ARQUIVADO', bg: 'bg-slate-800/40', border: 'border-white/5', badge: 'bg-slate-800 text-slate-500' }
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

    const priorityStyles = {
        'high': { bg: 'bg-rose-500/5 hover:bg-rose-500/10', border: 'border-rose-500/10' },
        'medium': { bg: 'bg-amber-500/5 hover:bg-amber-500/10', border: 'border-amber-500/10' },
        'low': { bg: 'bg-emerald-500/5 hover:bg-emerald-500/10', border: 'border-emerald-500/10' },
        'default': { bg: 'bg-slate-900/40 hover:bg-slate-800/60', border: 'border-white/5' }
    };

    const priorityConfig = task.priority ? priorityStyles[task.priority] : priorityStyles.default;

    return (
        <div
            onClick={onClick}
            className={`group relative p-4 rounded-[16px] border cursor-pointer shadow-2xl transition-all duration-300 backdrop-blur-xl ${priorityConfig.bg} ${isStatusOpen ? 'z-50' : 'hover:z-10'} ${isArchived ? 'opacity-60 grayscale-[0.5] border-white/5' : `${priorityConfig.border} hover:border-cyan-500/30 hover:shadow-cyan-500/5 hover:-translate-y-1`}`}
        >
            {/* Notification Badge */}
            {notificationCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10">
                    {notificationCount}
                </div>
            )}

            {/* Title & Status Row */}
            <div className="mb-2.5 flex items-start justify-between gap-3">
                <h4 className="text-[15px] font-black text-white leading-tight tracking-tight group-hover:text-cyan-400 transition-colors line-clamp-2">
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
                        <div className="absolute top-full right-0 mt-1 w-32 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-1 z-20 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={(e) => handleStatusClick(e, option.value)}
                                    className={`w-full text-left px-3 py-2 text-[10px] font-black tracking-widest flex items-center gap-2 hover:bg-white/5 transition-colors uppercase ${task.status === option.value ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400'}`}
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
                <div className="h-6 px-2 flex items-center gap-1 rounded-full border border-dashed border-white/10 bg-white/5 text-slate-500">
                    <Plus className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase">TAG</span>
                </div>

                {task.tags?.map(tag => {
                    const color = getTagColor(tag);
                    return (
                        <div
                            key={tag}
                            className={`h-6 px-2.5 flex items-center gap-1.5 rounded-full border bg-white/5 ${color.border} ${color.text}`}
                        >
                            <X className="w-3 h-3 opacity-50 cursor-pointer hover:opacity-100" />
                            <span className="text-[10px] font-black tracking-wide uppercase">{tag}</span>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Row: Metadata & Assignees */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                    {/* Checklist Badge */}
                    {totalChecklist > 0 && (
                        <div className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 shadow-lg shadow-cyan-500/5">
                            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Checklist <span className="text-cyan-400">({completedChecklist}/{totalChecklist})</span>
                            </span>
                        </div>
                    )}

                    {/* Deadline Badge */}
                    {task.deadline && (
                        <div className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5">
                            <Calendar className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
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
                                className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-800 relative z-[2] shadow-xl overflow-hidden"
                                title={assignee.name}
                            >
                                {assignee.avatar ? (
                                    <img src={assignee.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white text-[9px] font-black">
                                        {assignee.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                        ))}
                        {assignees.length > 3 && (
                            <div className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-400 relative z-[1] shadow-xl">
                                +{assignees.length - 3}
                            </div>
                        )}
                    </div>

                    {/* Message Count */}
                    {messageCount > 0 && (
                        <div className="ml-3 flex items-center gap-1 text-slate-500">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black">{messageCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
