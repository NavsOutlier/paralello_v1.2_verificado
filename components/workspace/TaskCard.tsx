import React from 'react';
import { MessageSquare, Calendar, CheckSquare, ChevronDown } from 'lucide-react';
import { Task, User as UIUser } from '../../types';

interface TaskCardProps {
    task: Task;
    messageCount: number;
    onClick: () => void;
    assignee?: UIUser;
    notificationCount?: number;
}

const statusConfig = {
    'done': { label: 'APROVADO', color: 'bg-emerald-500', bg: 'bg-emerald-50/50', text: 'text-emerald-600' },
    'in-progress': { label: 'EM PROGRESSO', color: 'bg-blue-500', bg: 'bg-blue-50/50', text: 'text-blue-600' },
    'todo': { label: 'PENDENTE', color: 'bg-amber-500', bg: 'bg-amber-50/50', text: 'text-amber-600' },
    'review': { label: 'REVISÃO', color: 'bg-indigo-500', bg: 'bg-indigo-50/50', text: 'text-indigo-600' },
};

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

export const TaskCard: React.FC<TaskCardProps> = ({ task, messageCount, onClick, assignee, notificationCount = 0 }) => {
    const config = statusConfig[task.status] || statusConfig.todo;

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        const day = d.getDate();
        const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
    };

    return (
        <div
            onClick={onClick}
            className="group relative bg-white p-3 pt-4 rounded-[18px] border border-slate-100 mb-2 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-300"
        >
            {/* Notification Badge - Positioned at top right outside padding */}
            {notificationCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-md z-10 transition-transform group-hover:scale-110">
                    {notificationCount}
                </div>
            )}

            {/* Top Info: Status and Date Row */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-100/80 rounded-full shadow-sm">
                    <div className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
                    <span className="text-[9px] font-black text-slate-600 tracking-tight uppercase">{config.label}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-300" />
                </div>
                <span className="text-[10px] font-black text-slate-300 tracking-tight">
                    {formatDate(task.createdAt)}
                </span>
            </div>

            {/* Content: Title & Tags */}
            <div className="mb-3">
                <h4 className="text-[14.5px] font-black text-slate-800 leading-tight mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">
                    {task.title}
                </h4>

                {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {task.tags.map(tag => {
                            const color = getTagColor(tag);
                            return (
                                <span
                                    key={tag}
                                    className={`text-[8px] px-2 py-0.5 rounded-md font-bold ${color.bg} ${color.text} border border-black/5 uppercase tracking-tighter`}
                                >
                                    {tag}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Horizontal Divider - Ultra Light */}
            <div className="h-[1px] w-full bg-slate-50/60 mb-3" />

            {/* Bottom Row: Metrics & Avatars */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {task.deadline && (
                        <div className="flex items-center gap-1.5 h-6.5 px-2 bg-[#fff5f5] text-[#e03131] text-[9.5px] font-extrabold rounded-lg border border-[#ffc9c9]/40">
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.deadline).toLowerCase()}
                        </div>
                    )}

                    {assignee ? (
                        <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-100 ring-1 ring-slate-100 shrink-0">
                            <img src={assignee.avatar} alt={assignee.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm bg-indigo-500 flex items-center justify-center text-[7px] text-white font-black shrink-0">
                            PN
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 h-6.5 px-1.5 bg-slate-50/50 rounded-lg border border-slate-100 text-[9.5px] font-extrabold text-slate-400">
                        <CheckSquare className="w-3 h-3 text-indigo-400" />
                        <span>1/3</span>
                    </div>

                    <div className="flex items-center gap-1 h-6 text-[9.5px] font-black text-slate-300">
                        <MessageSquare className="w-3.5 h-3.5 opacity-40 shrink-0" />
                        <span>{messageCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
