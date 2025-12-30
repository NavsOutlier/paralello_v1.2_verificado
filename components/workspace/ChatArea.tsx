import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, MoreVertical } from 'lucide-react';
import { User, Message, User as UIUser } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { useAuth } from '../../contexts/AuthContext';

interface ChatAreaProps {
    entity: User | null;
    messages: Message[];
    onSendMessage: (text: string) => void;
    onInitiateDiscussion: (msg: Message) => void;
    highlightedMessageId: string | null;
    teamMembers: UIUser[];
}

export const ChatArea: React.FC<ChatAreaProps> = ({
    entity,
    messages,
    onSendMessage,
    onInitiateDiscussion,
    highlightedMessageId,
    teamMembers // Adding this as well to resolve member names in chat
}) => {
    const { user: currentUser } = useAuth();
    const [text, setText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (highlightedMessageId && messageRefs.current[highlightedMessageId]) {
            messageRefs.current[highlightedMessageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageRefs.current[highlightedMessageId]?.classList.add('ring-2', 'ring-yellow-400', 'ring-offset-2');
            setTimeout(() => {
                messageRefs.current[highlightedMessageId]?.classList.remove('ring-2', 'ring-yellow-400', 'ring-offset-2');
            }, 2000);
        }
    }, [highlightedMessageId]);

    if (!entity) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
                Selecione um contato
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#efeae2] relative">
            {/* Header */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
                <div className="flex items-center space-x-3">
                    <img src={entity.avatar} className="w-9 h-9 rounded-full" alt="" />
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">{entity.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center">
                            {entity.role === 'client' ? 'WhatsApp Business' : 'Chat Interno'} • {entity.status}
                        </p>
                    </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-5 h-5" /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isMe={msg.senderId === currentUser?.id}
                        senderName={
                            msg.senderId === entity.id
                                ? entity.name
                                : teamMembers.find(t => t.id === msg.senderId)?.name || 'Membro'
                        }
                        onInitiateDiscussion={onInitiateDiscussion}
                        messageRef={(el) => messageRefs.current[msg.id] = el}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex items-center space-x-4">
                    <button className="text-slate-400 hover:text-slate-600"><Paperclip className="w-5 h-5" /></button>
                    <input
                        type="text"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="Digite uma mensagem..."
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { onSendMessage(text); setText(''); } }}
                    />
                    <button
                        onClick={() => { onSendMessage(text); setText(''); }}
                        className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
