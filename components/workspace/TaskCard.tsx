import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Task } from '../../types';
import { Badge } from '../ui';

interface TaskCardProps {
    task: Task;
    messageCount: number;
    onClick: () => void;
}

const statusVariantMap = {
    'done': 'success' as const,
    'in-progress': 'primary' as const,
    'todo': 'default' as const,
    'review': 'warning' as const,
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

export const TaskCard: React.FC<TaskCardProps> = ({ task, messageCount, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-3 cursor-pointer hover:border-indigo-300 transition-all"
    >
        <div className="flex justify-between items-start mb-2">
            <Badge variant={statusVariantMap[task.status]}>
                {task.status}
            </Badge>
            <span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-green-500'}`} />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 leading-tight mb-2">{task.title}</h4>

        {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
                {task.tags.map(tag => {
                    const color = getTagColor(tag);
                    return (
                        <span
                            key={tag}
                            className={`text-[9px] px-1.5 py-0.5 ${color.bg} ${color.text} rounded-md font-bold border border-black/5`}
                        >
                            #{tag.toUpperCase()}
                        </span>
                    );
                })}
            </div>
        )}

        <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="flex items-center"><MessageSquarePlus className="w-3 h-3 mr-1" /> {messageCount}</span>
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
        </div>
    </div>
);
