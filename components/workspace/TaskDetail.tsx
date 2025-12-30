import React, { useState, useRef, useEffect } from 'react';
import { CornerDownRight } from 'lucide-react';
import { Task, Message } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { Badge, Button } from '../ui';
import { CURRENT_USER_ID, TEAM } from '../../constants';

interface TaskDetailProps {
    task: Task;
    messages: Message[];
    onBack: () => void;
    onNavigateToMessage: (msgId: string) => void;
    onAddComment: (text: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
    task,
    messages,
    onBack,
    onNavigateToMessage,
    onAddComment
}) => {
    const [comment, setComment] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = () => {
        if (comment) {
            onAddComment(comment);
            setComment('');
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
                    <h2 className="text-lg font-bold text-slate-800 mb-2">{task.title}</h2>
                    <div className="flex items-center space-x-2 mb-4">
                        <Badge variant="default" size="sm">
                            {task.status}
                        </Badge>
                        <span className="text-xs text-slate-400">ID: {task.id}</span>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Chat da Tarefa</h3>
                <div className="space-y-3 mb-6">
                    {messages.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma mensagem nesta tarefa.</p>}
                    {messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isMe={msg.senderId === CURRENT_USER_ID}
                            senderName={TEAM.find(t => t.id === msg.senderId)?.name || 'Membro'}
                            onNavigateToLinked={onNavigateToMessage}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex flex-col space-y-2">
                    <textarea
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-20"
                        placeholder="Escreva uma atualização..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    />
                    <Button
                        onClick={handleSubmit}
                        disabled={!comment}
                        size="md"
                        className="self-end"
                    >
                        Enviar
                    </Button>
                </div>
            </div>
        </div>
    );
};
