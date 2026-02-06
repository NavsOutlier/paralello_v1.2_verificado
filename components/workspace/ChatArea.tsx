import React, { useState, useEffect, useRef } from 'react';
import { Message, User, Client } from '../../types';
import { Send, Loader2, MessageSquarePlus, ExternalLink, MessageSquare, Search, Plus, User2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatTime } from '../../lib/utils/formatting';
import { MessageBubble } from '../MessageBubble';
import { DistortionCanvas } from './DistortionCanvas';
import { ClientInfoDrawer } from './ClientInfoDrawer';
import { Atom, LayoutGrid } from 'lucide-react';

interface ChatAreaProps {
    entity: User | null;
    messages: Message[];
    teamMembers: User[];
    onSendMessage: (text: string) => void;
    onInitiateDiscussion?: (msg: Message) => void;
    highlightSignal?: { id: string; ts: number } | null;
    onNavigateToTask?: (taskId: string) => void;
    linkedTaskMap?: Record<string, string>;
    distortionPositions?: Record<string, { x: number, y: number }>;
    setDistortionPositions?: (positions: Record<string, { x: number, y: number }>) => void;
    distortionLabels?: any[];
    setDistortionLabels?: (labels: any[]) => void;
    whatsappStatus?: string;
    rightPanelWidth?: number;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
    entity,
    messages,
    teamMembers,
    onSendMessage,
    onInitiateDiscussion,
    highlightSignal,
    onNavigateToTask,
    linkedTaskMap = {},
    distortionPositions = {},
    setDistortionPositions,
    distortionLabels = [],
    setDistortionLabels,
    whatsappStatus = 'online',
    rightPanelWidth = 440
}) => {
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const highlightedRef = useRef<HTMLDivElement>(null);
    const { user: currentUser } = useAuth();
    const [viewMode, setViewMode] = useState<'standard' | 'distortion'>('standard');
    const [showClientInfo, setShowClientInfo] = useState(false);

    // Convert User entity to Client format for the drawer
    const clientForDrawer: Client | null = entity && entity.role === 'client' ? {
        id: entity.id,
        organizationId: '',
        name: entity.name,
        status: 'active',
        whatsappGroupId: entity.whatsappGroupId,
        createdAt: new Date(),
        updatedAt: new Date()
    } : null;

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (!highlightSignal) {
            scrollToBottom();
        }
    }, [messages, highlightSignal]);

    // Scroll to highlighted message
    useEffect(() => {
        if (highlightSignal && highlightedRef.current) {
            highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightSignal]);

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
            <div className="flex-1 flex items-center justify-center bg-transparent text-slate-500">
                Selecione um contato para carregar a conversa.
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full bg-transparent relative">
                {/* Header - Standardized */}
                <div className="flex-shrink-0 bg-slate-900/40 backdrop-blur-xl border-b border-cyan-500/10 px-6 py-4 flex items-center justify-between relative z-20 shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 border border-white/10">
                            <span className="text-[15px] font-black">{entity.name.slice(0, 1).toUpperCase()}</span>
                        </div>
                        <div>
                            <h2 className="text-[15px] font-black text-white tracking-tight leading-none mb-1">{entity.name}</h2>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${whatsappStatus === 'conectado' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${whatsappStatus === 'conectado' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {entity.role === 'client'
                                        ? `WhatsApp ${whatsappStatus === 'conectado' ? 'Conectado' : (whatsappStatus || 'Desconectado')}`
                                        : entity.jobTitle || 'Equipe'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Perspective Toggle - Disruptive Style */}
                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center p-1 bg-slate-800/50 backdrop-blur-md border border-cyan-500/10 rounded-full shadow-inner ring-1 ring-white/5">
                        <button
                            onClick={() => setViewMode('standard')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 ${viewMode === 'standard'
                                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black tracking-widest uppercase">Padrão</span>
                        </button>
                        <button
                            onClick={() => setViewMode('distortion')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 ${viewMode === 'distortion'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <Atom className={`w-3.5 h-3.5 ${viewMode === 'distortion' ? 'animate-spin-slow' : ''}`} />
                            <span className="text-[10px] font-black tracking-widest uppercase">Distorção</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {entity?.role === 'client' && (
                            <button
                                onClick={() => setShowClientInfo(true)}
                                className="p-2 hover:bg-cyan-500/10 rounded-full transition-all text-slate-400 hover:text-cyan-400 group"
                                title="Informações do Cliente"
                            >
                                <User2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                        )}
                        <button className="p-2 hover:bg-slate-100/50 rounded-full transition-colors text-slate-400">
                            <Search className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-slate-100/50 rounded-full transition-colors text-slate-400">
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages Area - Conditional Rendering */}
                <div className={`flex-1 min-h-0 overflow-hidden relative z-10 ${viewMode === 'standard' ? 'overflow-y-auto' : ''}`}>
                    {/* Mesh Gradient Background Blobs - Now inside scrollable area */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                    <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                    {viewMode === 'standard' ? (
                        <div className="p-4 md:p-8 pt-0 space-y-12 scroll-smooth custom-scrollbar">
                            {/* Sticky Column Headers */}
                            <div className="sticky top-0 z-30 grid grid-cols-1 md:grid-cols-3 gap-4 py-3 items-center bg-slate-900/60 backdrop-blur-md border-b border-white/5">
                                <div className="hidden md:flex flex-col items-start px-2">
                                    <span className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase">CLIENTE</span>
                                </div>
                                <div className="hidden md:flex flex-col items-center px-2">
                                    <span className="text-[10px] font-black tracking-[0.2em] text-indigo-400 uppercase">EQUIPE</span>
                                </div>
                                <div className="hidden md:flex flex-col items-end px-2">
                                    <span className="text-[10px] font-black tracking-[0.2em] text-cyan-400 uppercase">EU</span>
                                </div>
                            </div>
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-40 grayscale mt-20">
                                    <MessageSquare className="w-12 h-12 mb-4 text-indigo-200" />
                                    <p className="text-slate-400 text-sm font-medium">Inicie uma revolução nesta conversa...</p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isMe = message.senderId === currentUser?.id && !message.isInternal;
                                    const isClient = message.senderType === 'CLIENT';
                                    const isSystem = message.isInternal || message.text?.toLowerCase().includes('tarefa criada');
                                    const isOtherMember = !isMe && !isClient && !isSystem;

                                    const isHighlighted = highlightSignal?.id === message.id;
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
                                            className={`grid grid-cols-1 md:grid-cols-3 w-full gap-4 transition-all duration-500 ${isHighlighted ? 'scale-[1.01] bg-white/5 backdrop-blur-sm rounded-2xl p-2' : ''}`}
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
                                                        colorScheme="blue"
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
                    ) : (
                        <DistortionCanvas
                            messages={messages}
                            currentUser={currentUser}
                            teamMembers={teamMembers}
                            entity={entity!}
                            onInitiateDiscussion={onInitiateDiscussion}
                            onNavigateToTask={onNavigateToTask}
                            positions={distortionPositions}
                            setPositions={setDistortionPositions}
                            labels={distortionLabels}
                            setLabels={setDistortionLabels}
                        />
                    )}
                </div>

                {/* Floating Input Area (Pill Style) */}
                <div className={`relative z-20 px-6 pb-6 ${viewMode === 'distortion' ? 'pt-2' : 'pt-6'}`}>
                    <div className="max-w-4xl mx-auto">
                        <div className="relative group">
                            {/* Shadow and Background Glow */}
                            <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />

                            <div className="relative bg-slate-800/60 backdrop-blur-2xl border border-white/5 shadow-2xl shadow-black/40 rounded-[2rem] p-2 flex items-end gap-2 ring-1 ring-white/10">
                                <button className="flex items-center justify-center w-11 h-11 text-slate-500 hover:text-cyan-400 transition-colors rounded-full hover:bg-white/5">
                                    <Plus className="w-5 h-5" />
                                </button>

                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Fale com o cliente de forma assertiva..."
                                    disabled={isSending}
                                    rows={1}
                                    className="flex-1 bg-transparent border-none focus:ring-0 py-3 text-[14px] font-medium text-slate-200 placeholder:text-slate-500 resize-none max-h-40 scrollbar-hide"
                                    style={{
                                        minHeight: '44px',
                                    }}
                                />

                                <button
                                    onClick={handleSend}
                                    disabled={!inputText.trim() || isSending}
                                    className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 ${!inputText.trim() || isSending
                                        ? 'bg-slate-700 text-slate-500'
                                        : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95'
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

            {/* Client Info Drawer */}
            <ClientInfoDrawer
                isOpen={showClientInfo}
                onClose={() => setShowClientInfo(false)}
                client={clientForDrawer}
                width={rightPanelWidth}
            />
        </>
    );
};
