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
        <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="flex items-center"><MessageSquarePlus className="w-3 h-3 mr-1" /> {messageCount}</span>
            <span>{task.createdAt.toLocaleDateString()}</span>
        </div>
    </div>
);
