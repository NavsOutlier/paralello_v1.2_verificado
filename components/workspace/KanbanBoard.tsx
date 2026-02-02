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

const COLUMNS: { id: Task['status']; label: string; bg: string; border: string; dot: string; shadow: string }[] = [
    { id: 'todo', label: 'PENDENTE', bg: 'bg-amber-500/5', border: 'border-amber-500/20', dot: 'bg-amber-500', shadow: 'shadow-amber-500/10' },
    { id: 'in-progress', label: 'EM PROGRESSO', bg: 'bg-blue-500/5', border: 'border-blue-500/20', dot: 'bg-blue-500', shadow: 'shadow-blue-500/10' },
    { id: 'review', label: 'REVISÃO', bg: 'bg-violet-500/5', border: 'border-violet-500/20', dot: 'bg-violet-500', shadow: 'shadow-violet-500/10' },
    { id: 'done', label: 'CONCLUÍDO', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', dot: 'bg-emerald-500', shadow: 'shadow-emerald-500/10' },
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
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-transparent p-4 min-h-0 custom-scrollbar">
            <div className="flex h-full gap-5 w-max min-w-full">
                {COLUMNS.map(column => {
                    const columnTasks = tasks.filter(t => t.status === column.id);
                    const isOver = dragOverColumn === column.id;

                    return (
                        <div
                            key={column.id}
                            className={`flex flex-col w-[320px] flex-shrink-0 h-full rounded-[24px] transition-all duration-300 border backdrop-blur-sm ${isOver
                                ? `bg-slate-900/80 ${column.border} ring-2 ring-opacity-30 shadow-2xl scale-[1.01]`
                                : 'bg-slate-900/20 border-white/5 hover:bg-slate-900/30'
                                }`}
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            {/* Column Header */}
                            <div className={`p-4 flex items-center justify-between border-b ${isOver ? column.border : 'border-white/5'} transition-colors`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${column.dot} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                                    <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${isOver ? 'text-white' : 'text-slate-400'}`}>
                                        {column.label}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/5 ${column.bg} text-white`}>
                                        {columnTasks.length}
                                    </span>
                                </div>
                                {column.id === 'todo' && (
                                    <button
                                        onClick={onManualCreate}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-slate-500 hover:text-white"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                {columnTasks.map(task => {
                                    const currentAssigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onDragEnd={handleDragEnd}
                                            className={`transition-all duration-300 cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-30 scale-95 rotate-3 grayscale' : 'opacity-100 hover:scale-[1.02]'}`}
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
                                    <div className={`h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl m-2 opacity-30 transition-colors ${isOver ? column.border : 'border-slate-800'}`}>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sem Atividades</span>
                                        <div className={`w-1 h-1 rounded-full ${column.dot}`} />
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
