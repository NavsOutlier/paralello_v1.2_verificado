import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../../types';
import { Send, Loader2, MessageSquarePlus, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatTime } from '../../lib/utils/formatting';

interface ChatAreaProps {
    entity: User | null;
    messages: Message[];
    teamMembers: User[];
    onSendMessage: (text: string) => void;
    onInitiateDiscussion?: (msg: Message) => void;
    highlightedMessageId?: string | null;
    onNavigateToTask?: (taskId: string) => void;
    linkedTaskMap?: Record<string, string>;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
    entity,
    messages,
    teamMembers,
    onSendMessage,
    onInitiateDiscussion,
    highlightedMessageId,
    onNavigateToTask,
    linkedTaskMap = {}
}) => {
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const highlightedRef = useRef<HTMLDivElement>(null);
    const { user: currentUser } = useAuth();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (!highlightedMessageId) {
            scrollToBottom();
        }
    }, [messages, highlightedMessageId]);

    // Scroll to highlighted message
    useEffect(() => {
        if (highlightedMessageId && highlightedRef.current) {
            highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightedMessageId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!inputText.trim() || isSending) return;

        setIsSending(true);
        try {
            await onSendMessage(inputText.trim());
            setInputText('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getSenderName = (message: Message) => {
        if (message.senderType === 'CLIENT') return entity?.name || 'Cliente';
        const member = teamMembers.find(m => m.id === message.senderId);
        return member?.name || (message.senderId === currentUser?.id ? 'Você' : 'Membro');
    };

    if (!entity) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
                Selecione um contato para carregar a conversa.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">{entity.name}</h2>
                    <p className="text-sm text-slate-500 capitalize">
                        {entity.role === 'client' ? 'WhatsApp' : entity.jobTitle || 'Equipe'}
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-400">Nenhuma mensagem ainda. Inicie a conversa!</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isOwn = message.senderType === 'MEMBER' && message.senderId === currentUser?.id;
                        const isHighlighted = highlightedMessageId === message.id;
                        const linkedTaskId = linkedTaskMap[message.id];

                        return (
                            <div
                                key={message.id}
                                ref={isHighlighted ? highlightedRef : null}
                                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${isHighlighted ? 'bg-indigo-50/50 -mx-6 px-6 py-2 rounded-lg' : ''}`}
                            >
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {getSenderName(message)}
                                    </span>
                                </div>

                                <div className="flex items-start gap-2 group max-w-[85%]">
                                    {/* Action buttons (only for client messages) */}
                                    {!isOwn && onInitiateDiscussion && (
                                        <button
                                            onClick={() => onInitiateDiscussion(message)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-200 transition-all self-center order-2 ml-2"
                                            title="Iniciar discussão/tarefa"
                                        >
                                            <MessageSquarePlus className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className={`relative rounded-2xl px-4 py-3 ${isOwn
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                        : 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                            {message.text}
                                        </p>

                                        <div className={`flex items-center justify-end gap-1.5 mt-2 text-[10px] ${isOwn ? 'text-indigo-200' : 'text-slate-400'
                                            }`}>
                                            <span>{formatTime(message.timestamp)}</span>
                                        </div>

                                        {/* Linked Task Indicator */}
                                        {linkedTaskId && (
                                            <button
                                                onClick={() => onNavigateToTask?.(linkedTaskId)}
                                                className={`mt-2 w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${isOwn
                                                        ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                    }`}
                                            >
                                                <span className="truncate">Ver Tarefa Vinculada</span>
                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200 p-4">
                <div className="flex items-end gap-3 max-w-5xl mx-auto">
                    <div className="flex-1 relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Digite sua mensagem..."
                            disabled={isSending}
                            rows={1}
                            className="w-full resize-none border border-slate-200 rounded-2xl px-5 py-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 disabled:opacity-50 text-sm"
                            style={{
                                minHeight: '52px',
                                maxHeight: '150px'
                            }}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isSending}
                        className="bg-indigo-600 text-white p-3.5 rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center shrink-0"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 translate-x-0.5 -translate-y-0.5" />
                        )}
                    </button>
                </div>
                <div className="max-w-5xl mx-auto flex justify-between items-center mt-2 px-2">
                    <p className="text-[10px] text-slate-400">
                        Pressione <span className="font-semibold">Enter</span> para enviar
                    </p>
                </div>
            </div>
        </div>
    );
};
