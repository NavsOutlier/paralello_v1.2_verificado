import React, { useState, useRef, useEffect } from 'react';
import {
    Bell,
    CheckCheck,
    Inbox,
    MessageSquare,
    ListTodo,
    AlertTriangle,
    Info,
    Clock,
    AtSign,
    User,
    Paperclip,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { ViewState } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../hooks/useNotifications';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar } from './Avatar';

interface NotificationCenterProps {
    currentView?: ViewState;
    onViewChange?: (view: ViewState) => void;
}

interface NotificationCenterTriggerProps {
    unreadCount: number;
    isOpen: boolean;
    onToggle: () => void;
}

export const NotificationCenterTrigger: React.FC<NotificationCenterTriggerProps> = ({ unreadCount, isOpen, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className={`relative p-2 rounded-2xl transition-all duration-300 group ${isOpen
                ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5'
                }`}
        >
            <motion.div
                animate={unreadCount > 0 ? {
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1]
                } : {}}
                transition={{
                    duration: 0.5,
                    repeat: unreadCount > 0 ? Infinity : 0,
                    repeatDelay: 2
                }}
            >
                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </motion.div>
            {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-emerald-500 text-white text-[8px] font-black rounded-full border border-slate-900 flex items-center justify-center shadow-lg">
                    {unreadCount > 9 ? '+9' : unreadCount}
                </span>
            )}
        </button>
    );
};

interface NotificationCenterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentView?: ViewState;
    onViewChange?: (view: ViewState) => void;
}

export const NotificationCenterPanel: React.FC<NotificationCenterPanelProps> = ({ isOpen, onClose, currentView, onViewChange }) => {
    const [activeTab, setActiveTab] = useState<'all' | 'dm' | 'feed' | 'task'>('all');
    const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

    const getNotificationState = (type: string, message: string) => {
        const lowerMsg = message.toLowerCase();

        switch (type) {
            case 'dm':
            case 'message':
                return {
                    label: 'INTERNO',
                    className: 'text-slate-400 border-slate-400',
                    icon: <User className="w-2.5 h-2.5" />,
                    iconBg: 'bg-slate-600'
                };
            case 'client_message':
                if (lowerMsg.includes('anexo')) {
                    return {
                        label: 'COMERCIAL',
                        className: 'text-emerald-400 border-emerald-400',
                        icon: <Paperclip className="w-2.5 h-2.5" />,
                        iconBg: 'bg-emerald-500'
                    };
                }
                return {
                    label: 'COMERCIAL',
                    className: 'text-emerald-400 border-emerald-400',
                    icon: <MessageSquare className="w-2.5 h-2.5" />,
                    iconBg: 'bg-emerald-500'
                };
            case 'task':
                return {
                    label: 'TAREFA',
                    className: 'text-amber-400 border-amber-400',
                    icon: <ListTodo className="w-2.5 h-2.5" />,
                    iconBg: 'bg-amber-500'
                };
            default:
                return {
                    label: 'INFO',
                    className: 'text-cyan-400 border-cyan-400',
                    icon: <Info className="w-2.5 h-2.5" />,
                    iconBg: 'bg-cyan-500'
                };
        }
    };

    const formatTimestamp = (date: Date) => {
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Ontem';
        return format(date, 'dd/MM');
    };

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'all') return true;
        if (activeTab === 'dm') return n.type === 'dm' || n.type === 'message';
        if (activeTab === 'feed') return n.type === 'client_message';
        if (activeTab === 'task') return n.type === 'task';
        return true;
    });

    const tabs = [
        { id: 'all', label: 'Todas' },
        { id: 'dm', label: 'Interno' },
        { id: 'feed', label: 'Clientes' },
        { id: 'task', label: 'Tarefas' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 420, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="h-full bg-slate-900/95 backdrop-blur-3xl border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-[200] flex flex-col overflow-hidden whitespace-nowrap"
                >
                    <div className="w-[420px] h-full flex flex-col">
                        {/* Header */}
                        <div className="p-8 pb-6 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <Bell className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-widest uppercase">Notificações</h3>
                            </div>
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 hover:underline transition-all"
                            >
                                Limpar Tudo
                            </button>
                        </div>

                        {/* Tabs Integration */}
                        <div className="flex px-6 pt-2 gap-6 border-b border-white/5 bg-white/0">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] relative transition-colors ${activeTab === tab.id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTabNote"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] rounded-full"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/0">
                            {loading && notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                                    <Loader2 className="w-10 h-10 animate-spin text-emerald-500/50" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Sincronizando Neural...</span>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 px-10 text-center">
                                    <div className="w-20 h-20 bg-slate-800/30 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
                                        <Inbox className="w-10 h-10 text-slate-700" />
                                    </div>
                                    <p className="text-[12px] font-black uppercase tracking-[0.2em] opacity-30">Sistema Limpo de Pendências</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {filteredNotifications.map((n) => {
                                        const state = getNotificationState(n.type, n.message);
                                        return (
                                            <div
                                                key={n.id}
                                                onClick={() => {
                                                    if (!n.read) markAsRead(n.id);
                                                    if (n.link) {
                                                        if (currentView !== ViewState.WORKSPACE && onViewChange) {
                                                            onViewChange(ViewState.WORKSPACE);
                                                            setTimeout(() => {
                                                                window.history.pushState({}, '', n.link);
                                                                window.dispatchEvent(new Event('pushstate'));
                                                            }, 100);
                                                        } else {
                                                            window.history.pushState({}, '', n.link);
                                                            window.dispatchEvent(new Event('pushstate'));
                                                        }
                                                        onClose();
                                                    }
                                                }}
                                                className={`p-6 flex gap-5 transition-all cursor-pointer relative group hover:bg-white/[0.02] ${!n.read ? 'bg-emerald-500/5' : 'bg-transparent'}`}
                                            >
                                                {/* Left Side: Avatar + Icon Badge */}
                                                <div className="relative flex-shrink-0">
                                                    <Avatar name={n.title} size="md" rounded="rounded-xl" className="shadow-lg border border-white/10" />
                                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-slate-900 flex items-center justify-center text-white shadow-xl ${state.iconBg}`}>
                                                        {state.icon}
                                                    </div>
                                                </div>

                                                {/* Right Side: Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border border-current tracking-widest uppercase ${state.className.replace('bg-', 'text-').replace('text-', 'border-')}`}>
                                                            {state.label}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 opacity-40">
                                                            <Clock className="w-3 h-3" />
                                                            <span className="text-[10px] font-bold">
                                                                {formatTimestamp(n.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <h4 className={`text-[14px] font-black tracking-tight leading-none mb-2 ${!n.read ? 'text-white' : 'text-slate-400'}`}>
                                                        {n.title}
                                                    </h4>
                                                    <p className={`text-[12px] font-medium leading-relaxed line-clamp-2 ${!n.read ? 'text-slate-300' : 'text-slate-500'}`}>
                                                        {n.message}
                                                    </p>
                                                </div>

                                                {/* Unread Indicator */}
                                                {!n.read && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,1)]" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-slate-900/50">
                            <button className="w-full py-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 group">
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-white transition-colors">
                                    Histórico Geral
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ currentView, onViewChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { unreadCount } = useNotifications();
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef}>
            <NotificationCenterTrigger
                unreadCount={unreadCount}
                isOpen={isOpen}
                onToggle={() => setIsOpen(!isOpen)}
            />
            <div className="fixed left-[130px] top-0 bottom-0 z-[200]">
                <NotificationCenterPanel
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    currentView={currentView}
                    onViewChange={onViewChange}
                />
            </div>
        </div>
    );
};
