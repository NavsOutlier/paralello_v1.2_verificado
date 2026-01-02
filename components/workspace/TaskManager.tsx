import React, { useState } from 'react';
import { Plus, CheckCircle2, ChevronDown, Folder } from 'lucide-react';
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

export const TaskManager: React.FC<TaskManagerProps> = (props) => {
    const { isSuperAdmin, permissions } = useAuth();
    const canManage = isSuperAdmin || permissions?.can_manage_tasks;
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
    const currentTask = selectedTask ? props.tasks.find(t => t.id === selectedTask.id) || selectedTask : null;

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
        />;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/20">
            {/* Redesigned Header */}
            <div className="h-[56px] flex items-center justify-between px-5 bg-white border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                        <Folder className="w-4 h-4" />
                    </div>
                    <h3 className="text-[16px] font-black text-slate-800 tracking-tight">Tasks do Projeto</h3>
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

            {/* Filter Bar - Modern Tighter Pill Style */}
            <div className="px-5 py-2.5 flex gap-2 overflow-x-auto no-scrollbar scrollbar-hide">
                <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200/60 rounded-full text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all whitespace-nowrap shadow-sm shadow-black/[0.01]">
                    Status <ChevronDown className="w-3 h-3 opacity-30" />
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200/60 rounded-full text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all whitespace-nowrap shadow-sm shadow-black/[0.01]">
                    Responsável <ChevronDown className="w-3 h-3 opacity-30" />
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200/60 rounded-full text-[11px] font-bold text-slate-700 hover:border-slate-300 transition-all whitespace-nowrap shadow-sm shadow-black/[0.01]">
                    Etiqueta <ChevronDown className="w-3 h-3 opacity-30" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2.5 pb-4 pt-3">
                {props.tasks.length === 0 ? (
                    <div className="text-center mt-10 text-slate-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma tarefa aberta para este cliente.</p>
                    </div>
                ) : (
                    props.tasks.map((t, index) => {
                        const count = props.allMessages.filter(m => m.channelId === t.id).length;
                        const assignee = props.teamMembers.find(m => m.id === t.assigneeId);
                        return (
                            <TaskCard
                                key={t.id}
                                task={t}
                                messageCount={count}
                                assignee={assignee}
                                notificationCount={index === 0 ? 2 : 0}
                                onClick={() => setSelectedTask(t)}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};
