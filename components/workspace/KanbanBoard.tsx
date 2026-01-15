import React, { useState } from 'react';
import { Task, User as UIUser, Message } from '../../types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
    tasks: Task[];
    allMessages: Message[];
    teamMembers: UIUser[];
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onSelectTask: (task: Task) => void;
    onManualCreate: () => void;
}

const COLUMNS: { id: Task['status']; label: string; bg: string; border: string; dot: string }[] = [
    { id: 'todo', label: 'PENDENTE', bg: 'bg-amber-50/50', border: 'border-amber-200/50', dot: 'bg-amber-400' },
    { id: 'in-progress', label: 'EM PROGRESSO', bg: 'bg-blue-50/50', border: 'border-blue-200/50', dot: 'bg-blue-400' },
    { id: 'review', label: 'REVISÃO', bg: 'bg-indigo-50/50', border: 'border-indigo-200/50', dot: 'bg-indigo-400' },
    { id: 'done', label: 'CONCLUÍDO', bg: 'bg-emerald-50/50', border: 'border-emerald-200/50', dot: 'bg-emerald-400' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
    tasks,
    allMessages,
    teamMembers,
    onUpdateTask,
    onSelectTask,
    onManualCreate
}) => {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', taskId);
        // Effect ease
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedTaskId(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e: React.DragEvent, status: Task['status']) => {
        e.preventDefault();
        if (dragOverColumn !== status) {
            setDragOverColumn(status);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Prevent clearing if moving to a child element
        if (e.currentTarget.contains(e.relatedTarget as Node)) {
            return;
        }
        setDragOverColumn(null);
    };

    const handleDrop = (e: React.DragEvent, status: Task['status']) => {
        e.preventDefault();
        setDragOverColumn(null);
        setDraggedTaskId(null);

        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== status) {
            onUpdateTask(taskId, { status });
        }
    };

    return (
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-50/50 p-4">
            <div className="flex h-full gap-4 min-w-[1000px]">
                {COLUMNS.map(column => {
                    const columnTasks = tasks.filter(t => t.status === column.id);
                    const isOver = dragOverColumn === column.id;

                    return (
                        <div
                            key={column.id}
                            className={`flex flex-col flex-1 h-full rounded-2xl transition-colors duration-200 ${isOver ? 'bg-indigo-50/80 ring-2 ring-indigo-200 ring-inset' : 'bg-slate-100/50'
                                }`}
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            {/* Column Header */}
                            <div className={`p-3 flex items-center justify-between border-b ${column.border} ${column.bg} rounded-t-2xl`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${column.dot}`} />
                                    <span className="text-[11px] font-black tracking-widest text-slate-700 uppercase">
                                        {column.label}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-1.5 py-0.5 rounded-full">
                                        {columnTasks.length}
                                    </span>
                                </div>
                                {column.id === 'todo' && (
                                    <button
                                        onClick={onManualCreate}
                                        className="p-1 hover:bg-white/60 rounded-full transition-colors text-slate-400 hover:text-indigo-600"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {columnTasks.map(task => {
                                    const currentAssigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onDragEnd={handleDragEnd}
                                            className={`transition-opacity duration-200 cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-40' : 'opacity-100'}`}
                                        >
                                            <TaskCard
                                                task={task}
                                                messageCount={allMessages.filter(m => m.taskId === task.id && m.contextType === 'TASK_INTERNAL').length}
                                                onClick={() => onSelectTask(task)}
                                                assignees={teamMembers.filter(m => currentAssigneeIds.includes(m.id))}
                                                onUpdateTask={onUpdateTask}
                                            />
                                        </div>
                                    );
                                })}
                                {columnTasks.length === 0 && (
                                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl m-2 opacity-50">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vazio</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
