import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../../types';
import { Send, Loader2, MessageSquarePlus, ExternalLink, MessageSquare, Search, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatTime } from '../../lib/utils/formatting';
import { MessageBubble } from '../MessageBubble';

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
        <div className="flex flex-col h-full bg-[#fdfdff] relative overflow-hidden">
            {/* Mesh Gradient Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-emerald-50/40 rounded-full blur-[100px] pointer-events-none" />

            {/* Header - Glassmorphism */}
            <div className="bg-white/70 backdrop-blur-md border-b border-white/20 px-6 py-3 flex items-center justify-between relative z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <span className="text-[14px] font-black">{entity.name.slice(0, 1).toUpperCase()}</span>
                    </div>
                    <div>
                        <h2 className="text-[15px] font-black text-slate-900 tracking-tight leading-none mb-1">{entity.name}</h2>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {entity.role === 'client' ? 'WhatsApp Online' : entity.jobTitle || 'Equipe'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Centralized Title Badge - Premium Style */}
                <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 px-3 py-1 bg-white/40 backdrop-blur-sm border border-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] rounded-full">
                    <MessageSquarePlus className="w-3 h-3 text-indigo-500" />
                    <span className="text-[9px] font-black text-slate-600 tracking-[0.2em] uppercase">Feed do Cliente</span>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-slate-100/50 rounded-full transition-colors text-slate-400">
                        <Search className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-slate-100/50 rounded-full transition-colors text-slate-400">
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area - Enhanced Spacing and Entry */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth relative z-10 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 grayscale">
                        <MessageSquare className="w-12 h-12 mb-4 text-indigo-200" />
                        <p className="text-slate-400 text-sm font-medium">Inicie uma revolução nesta conversa...</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isMe = message.senderId === currentUser?.id && !message.isInternal;
                        const isClient = message.senderType === 'CLIENT';
                        const isSystem = message.isInternal || message.text?.toLowerCase().includes('tarefa criada');
                        const isOtherMember = !isMe && !isClient && !isSystem;

                        const isHighlighted = highlightedMessageId === message.id;
                        const linkedTaskId = linkedTaskMap[message.id];

                        const linkedMessage = message.linkedMessageId
                            ? messages.find(m => m.id === message.linkedMessageId)
                            : undefined;

                        const senderMember = teamMembers.find(m => m.id === message.senderId);
                        const senderName = message.senderType === 'CLIENT'
                            ? (entity?.name || 'Cliente')
                            : (senderMember?.name || 'Sistema');

                        const senderJobTitle = message.senderType === 'CLIENT'
                            ? 'Contratante'
                            : senderMember?.jobTitle;

                        const linkedMessageSender = linkedMessage
                            ? (linkedMessage.senderType === 'CLIENT'
                                ? (entity?.name || 'Cliente')
                                : (teamMembers.find(m => m.id === linkedMessage.senderId)?.name || 'Membro'))
                            : undefined;

                        return (
                            <div
                                key={message.id}
                                ref={isHighlighted ? highlightedRef : null}
                                className={`grid grid-cols-1 md:grid-cols-3 w-full gap-4 transition-all duration-500 ${isHighlighted ? 'scale-[1.01] bg-indigo-50/20 rounded-2xl p-2' : ''}`}
                            >
                                {/* Column 1: Client */}
                                <div className="flex flex-col items-start w-full">
                                    {isClient && (
                                        <MessageBubble
                                            msg={message}
                                            isMe={false}
                                            senderName={senderName}
                                            senderJobTitle={senderJobTitle}
                                            onInitiateDiscussion={onInitiateDiscussion}
                                            onNavigateToLinked={(id) => {
                                                if (linkedTaskId) onNavigateToTask?.(linkedTaskId);
                                                else if (message.linkedMessageId) {
                                                    const el = document.getElementById(`msg-${id}`);
                                                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }}
                                            linkedTaskId={linkedTaskId}
                                            linkedMessage={linkedMessage}
                                            linkedMessageSenderName={linkedMessageSender}
                                            colorScheme="green"
                                        />
                                    )}
                                </div>

                                {/* Column 2: System / Other Members */}
                                <div className="flex flex-col items-center w-full">
                                    {(isOtherMember || isSystem) && (
                                        <MessageBubble
                                            msg={message}
                                            isMe={false} // Middle is never "Me" vibrant style
                                            senderName={senderName}
                                            senderJobTitle={senderJobTitle}
                                            onInitiateDiscussion={onInitiateDiscussion}
                                            onNavigateToLinked={(id) => {
                                                if (linkedTaskId) onNavigateToTask?.(linkedTaskId);
                                                else if (message.linkedMessageId) {
                                                    const el = document.getElementById(`msg-${id}`);
                                                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }}
                                            linkedTaskId={linkedTaskId}
                                            linkedMessage={linkedMessage}
                                            linkedMessageSenderName={linkedMessageSender}
                                            colorScheme="indigo"
                                        />
                                    )}
                                </div>

                                {/* Column 3: Me (Current User) */}
                                <div className="flex flex-col items-end w-full">
                                    {isMe && (
                                        <MessageBubble
                                            msg={message}
                                            isMe={true}
                                            senderName={senderName}
                                            senderJobTitle={senderJobTitle}
                                            onInitiateDiscussion={onInitiateDiscussion}
                                            onNavigateToLinked={(id) => {
                                                if (linkedTaskId) onNavigateToTask?.(linkedTaskId);
                                                else if (message.linkedMessageId) {
                                                    const el = document.getElementById(`msg-${id}`);
                                                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }}
                                            linkedTaskId={linkedTaskId}
                                            linkedMessage={linkedMessage}
                                            linkedMessageSenderName={linkedMessageSender}
                                            colorScheme="indigo"
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Floating Input Area (Pill Style) */}
            <div className="p-6 relative z-20">
                <div className="max-w-4xl mx-auto">
                    <div className="relative group">
                        {/* Shadow and Background Glow */}
                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />

                        <div className="relative bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-2 flex items-end gap-2 ring-1 ring-black/[0.03]">
                            <button className="flex items-center justify-center w-11 h-11 text-slate-400 hover:text-indigo-500 transition-colors rounded-full hover:bg-slate-50">
                                <Plus className="w-5 h-5" />
                            </button>

                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Fale com o cliente de forma assertiva..."
                                disabled={isSending}
                                rows={1}
                                className="flex-1 bg-transparent border-none focus:ring-0 py-3 text-[14px] font-medium placeholder:text-slate-400/80 resize-none max-h-40 scrollbar-hide"
                                style={{
                                    minHeight: '44px',
                                }}
                            />

                            <button
                                onClick={handleSend}
                                disabled={!inputText.trim() || isSending}
                                className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 ${!inputText.trim() || isSending
                                    ? 'bg-slate-100 text-slate-300'
                                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                {isSending ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 translate-x-0.5 -translate-y-0.5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
