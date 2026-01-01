import React, { useState, useRef, useEffect } from 'react';
import { CornerDownRight, CheckCircle2, Circle, Clock, AlertCircle, User as UserIcon, Loader2 } from 'lucide-react';
import { Task, Message, User as UIUser } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { Badge, Button } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

interface TaskDetailProps {
    task: Task;
    messages: Message[];
    onBack: () => void;
    onNavigateToMessage: (msgId: string) => void;
    onAddComment: (text: string) => Promise<void>;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    teamMembers: UIUser[];
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
    task,
    messages,
    onBack,
    onNavigateToMessage,
    onAddComment,
    onUpdateTask,
    teamMembers
}) => {
    const { user: currentUser } = useAuth();
    const [comment, setComment] = useState('');
    const [isAddingComment, setIsAddingComment] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async () => {
        if (comment && !isAddingComment) {
            try {
                setIsAddingComment(true);
                await onAddComment(comment);
                setComment('');
            } catch (error) {
                console.error('Failed to add comment:', error);
            } finally {
                setIsAddingComment(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="h-14 flex items-center px-4 bg-white border-b border-slate-200">
                <button onClick={onBack} className="mr-3 text-slate-500 hover:text-indigo-600">
                    <CornerDownRight className="w-5 h-5 rotate-180" />
                </button>
                <span className="text-sm font-bold text-slate-800 truncate">Detalhes da Tarefa</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6">
                    <div className="flex items-start justify-between mb-2">
                        <h2 className="text-lg font-bold text-slate-800">{task.title}</h2>
                        <Badge
                            variant={task.status === 'done' ? 'success' : task.status === 'todo' ? 'default' : 'warning'}
                            size="sm"
                        >
                            {task.status.toUpperCase()}
                        </Badge>
                    </div>
                    <span className="text-xs text-slate-400">ID: {task.id}</span>
                </div>

                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Chat da Tarefa</h3>
                <div className="space-y-3 mb-6">
                    {messages.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma mensagem nesta tarefa.</p>}
                    {messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isMe={msg.senderId === currentUser?.id}
                            senderName={teamMembers.find(t => t.id === msg.senderId)?.name || 'Membro'}
                            onNavigateToLinked={onNavigateToMessage}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex flex-col space-y-2">
                    <textarea
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-20 disabled:opacity-75"
                        placeholder={isAddingComment ? "Enviando..." : "Escreva uma atualização..."}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                        disabled={isAddingComment}
                    />
                    <Button
                        onClick={handleSubmit}
                        disabled={!comment.trim() || isAddingComment}
                        size="md"
                        className="self-end"
                    >
                        {isAddingComment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Enviar
                    </Button>
                </div>
            </div>
        </div>
    );
};
