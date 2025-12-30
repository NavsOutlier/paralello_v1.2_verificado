import React, { useState } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { Task, Message, DiscussionDraft } from '../../types';
import { TaskCard } from './TaskCard';
import { TaskDetail } from './TaskDetail';
import { TaskCreation } from './TaskCreation';

interface TaskManagerProps {
    tasks: Task[];
    allMessages: Message[];
    discussionDraft: DiscussionDraft | null;
    onCancelDraft: () => void;
    onCreateTaskFromDraft: (title: string, priority: 'low' | 'medium' | 'high') => void;
    onAttachTaskFromDraft: (taskId: string) => void;
    onNavigateToMessage: (id: string) => void;
    onAddTaskComment: (taskId: string, text: string) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = (props) => {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    if (props.discussionDraft) {
        return <TaskCreation
            draft={props.discussionDraft}
            existingTasks={props.tasks}
            onCancel={props.onCancelDraft}
            onCreate={props.onCreateTaskFromDraft}
            onAttach={props.onAttachTaskFromDraft}
        />;
    }

    if (selectedTask) {
        // Filter messages for this task specifically
        const taskMessages = props.allMessages.filter(m => m.channelId === selectedTask.id);

        return <TaskDetail
            task={selectedTask}
            messages={taskMessages}
            onBack={() => setSelectedTask(null)}
            onNavigateToMessage={props.onNavigateToMessage}
            onAddComment={(text) => props.onAddTaskComment(selectedTask.id, text)}
        />;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
            <div className="h-16 flex items-center justify-between px-4 bg-white border-b border-slate-200">
                <h3 className="font-bold text-slate-800">Tarefas</h3>
                <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full">
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {props.tasks.length === 0 ? (
                    <div className="text-center mt-10 text-slate-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma tarefa aberta para este cliente.</p>
                    </div>
                ) : (
                    props.tasks.map(t => {
                        const count = props.allMessages.filter(m => m.channelId === t.id).length;
                        return <TaskCard key={t.id} task={t} messageCount={count} onClick={() => setSelectedTask(t)} />
                    })
                )}
            </div>
        </div>
    );
};
