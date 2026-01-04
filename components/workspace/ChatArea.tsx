import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageRepository } from '../../lib/repositories/MessageRepository';
import { sendWhatsAppText } from '../../lib/api/whatsapp-api';
import { Message } from '../../types';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface ChatAreaProps {
    clientId: string;
    clientName: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ clientId, clientName }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const { showToast } = useToast();

    // Load messages on mount and when client changes
    useEffect(() => {
        loadMessages();
        const subscription = subscribeToMessages();

        return () => {
            subscription?.unsubscribe();
        };
    }, [clientId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        setIsLoading(true);
        try {
            const msgs = await MessageRepository.findByClient(clientId);
            setMessages(msgs);
        } catch (error) {
            console.error('Error loading messages:', error);
            showToast('Erro ao carregar mensagens', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`messages:${clientId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `client_id=eq.${clientId}`
            }, (payload) => {
                const newMessage = mapDBMessageToMessage(payload.new as any);
                setMessages(prev => [...prev, newMessage]);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `client_id=eq.${clientId}`
            }, (payload) => {
                const updatedMessage = mapDBMessageToMessage(payload.new as any);
                setMessages(prev => prev.map(msg =>
                    msg.id === updatedMessage.id ? updatedMessage : msg
                ));
            })
            .subscribe();

        return channel;
    };

    const mapDBMessageToMessage = (dbMsg: any): Message => {
        return {
            id: dbMsg.id,
            senderType: dbMsg.sender_type,
            senderId: dbMsg.sender_id,
            text: dbMsg.text,
            timestamp: new Date(dbMsg.created_at),
            contextType: dbMsg.context_type,
            clientId: dbMsg.client_id,
            taskId: dbMsg.task_id,
            dmChannelId: dbMsg.dm_channel_id,
            isInternal: dbMsg.is_internal,
            linkedMessageId: dbMsg.linked_message_id,
            direction: dbMsg.direction,
            uazapiId: dbMsg.uazapi_id
        };
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!inputText.trim() || isSending) return;

        setIsSending(true);
        const textToSend = inputText;
        setInputText(''); // Clear immediately for better UX

        try {
            await sendWhatsAppText({
                organizationId: user.organizationId,
                clientId,
                senderId: user.id,
                text: textToSend
            });
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Erro ao enviar mensagem', 'error');
            setInputText(textToSend); // Restore text on error
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

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">{clientName}</h2>
                <p className="text-sm text-slate-500">WhatsApp</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-400">Nenhuma mensagem ainda. Inicie a conversa!</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isOwn = message.senderType === 'MEMBER' && message.senderId === user.id;

                        return (
                            <div
                                key={message.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isOwn
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-slate-900 border border-slate-200'
                                    }`}>
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                        {message.text}
                                    </p>
                                    <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isOwn ? 'text-indigo-200' : 'text-slate-400'
                                        }`}>
                                        <span>{formatTime(message.timestamp)}</span>
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
                <div className="flex items-end gap-2">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Digite sua mensagem..."
                        disabled={isSending}
                        rows={1}
                        className="flex-1 resize-none border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            minHeight: '48px',
                            maxHeight: '120px'
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isSending}
                        className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    Pressione Enter para enviar, Shift+Enter para quebra de linha
                </p>
            </div>
        </div>
    );
};
