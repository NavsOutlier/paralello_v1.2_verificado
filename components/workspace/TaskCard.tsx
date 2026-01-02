import React from 'react';
import { MessageSquare, Calendar, CheckSquare, Plus, X } from 'lucide-react';
import { Task, User as UIUser } from '../../types';

interface TaskCardProps {
    task: Task;
    messageCount: number;
    onClick: () => void;
    assignees: UIUser[];
    notificationCount?: number;
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

export const TaskCard: React.FC<TaskCardProps> = ({ task, messageCount, onClick, assignees = [], notificationCount = 0 }) => {

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        const day = d.getDate();
        const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        return `${day} de ${month.toLowerCase()}.`;
    };

    // Checklist stats
    const totalChecklist = task.checklist?.length || 0;
    const completedChecklist = task.checklist?.filter(i => i.completed).length || 0;

    return (
        <div
            onClick={onClick}
            className="group relative bg-white p-4 rounded-[16px] border border-slate-200 cursor-pointer shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200"
        >
            {/* Notification Badge */}
            {notificationCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10">
                    {notificationCount}
                </div>
            )}

            {/* Title */}
            <div className="mb-2.5">
                <h4 className="text-[15px] font-black text-slate-800 leading-tight tracking-tight group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {task.title}
                </h4>
            </div>

            {/* Tags Row */}
            <div className="flex flex-wrap gap-2 mb-4">
                {/* Dashed Add Button Placeholder (Visual only) */}
                <div className="h-6 px-2 flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <Plus className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">TAG</span>
                </div>

                {task.tags?.map(tag => {
                    const color = getTagColor(tag);
                    return (
                        <div
                            key={tag}
                            className={`h-6 px-2.5 flex items-center gap-1.5 rounded-full border ${color.border} ${color.bg} ${color.text}`}
                        >
                            <X className="w-3 h-3 opacity-50 cursor-pointer hover:opacity-100" />
                            <span className="text-[10px] font-bold">{tag}</span>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Row: Metadata & Assignees */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div className="flex items-center gap-2">
                    {/* Checklist Badge */}
                    {totalChecklist > 0 && (
                        <div className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white shadow-sm">
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[10px] font-bold text-slate-600">
                                Checklist <span className="text-indigo-600">({completedChecklist}/{totalChecklist})</span>
                            </span>
                        </div>
                    )}

                    {/* Deadline Badge */}
                    {task.deadline && (
                        <div className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50">
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
