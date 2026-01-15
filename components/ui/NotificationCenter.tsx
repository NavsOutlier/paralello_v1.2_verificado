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

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ currentView, onViewChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'dm' | 'feed' | 'task'>('all');
    const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
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

    const getNotificationState = (type: string, message: string) => {
        const lowerMsg = message.toLowerCase();

        switch (type) {
            case 'dm':
            case 'message':
                return {
                    label: 'INTERNO',
                    className: 'bg-slate-100 text-slate-600',
                    icon: <User className="w-2.5 h-2.5" />,
                    iconBg: 'bg-slate-500'
                };
            case 'client_message':
                if (lowerMsg.includes('anexo')) {
                    return {
                        label: 'CLIENTE',
                        className: 'bg-blue-50 text-blue-600',
                        icon: <Paperclip className="w-2.5 h-2.5" />,
                        iconBg: 'bg-blue-500'
                    };
                }
                return {
                    label: 'CLIENTE',
                    className: 'bg-blue-50 text-blue-600',
                    icon: <MessageSquare className="w-2.5 h-2.5" />,
                    iconBg: 'bg-blue-500'
                };
            case 'task':
                if (lowerMsg.includes('mencionou')) {
                    return {
                        label: 'MENÇÃO',
                        className: 'bg-orange-50 text-orange-600',
                        icon: <AtSign className="w-2.5 h-2.5" />,
                        iconBg: 'bg-orange-500'
                    };
                }
                return {
                    label: 'TAREFA',
                    className: 'bg-purple-50 text-purple-600',
                    icon: <ListTodo className="w-2.5 h-2.5" />,
                    iconBg: 'bg-purple-500'
                };
            default:
                return {
                    label: 'INFO',
                    className: 'bg-slate-50 text-slate-500',
                    icon: <Info className="w-2.5 h-2.5" />,
                    iconBg: 'bg-slate-400'
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
        <div className="relative" ref={containerRef}>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-all duration-300 ${isOpen
                    ? 'bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
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
                    <Bell className="w-5 h-5" />
                </motion.div>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center">
                        {unreadCount > 9 ? '+9' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: -10, y: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: -10, y: 10 }}
                        className="absolute left-16 bottom-0 mb-2 w-[400px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[100] origin-bottom-left"
                    >
                        {/* Header */}
                        <div className="px-5 py-5 flex items-center justify-between border-b border-slate-50 bg-white">
                            <h3 className="text-[17px] font-black text-slate-900 tracking-tight">Notificações</h3>
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                            >
                                Marcar todas como lidas
                            </button>
                        </div>

                        {/* Tabs Integration - Subtle */}
                        <div className="flex px-4 pt-2 gap-4 border-b border-slate-50 bg-white">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`pb-3 text-[11px] font-black uppercase tracking-widest relative transition-colors ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTabNote"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Notifications List */}
                        <div className="h-[420px] overflow-y-auto custom-scrollbar bg-white">
                            {loading && notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-40">Sincronizando...</span>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <Bell className="w-8 h-8 text-slate-200" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Tudo limpo por aqui</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50/60">
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
                                                        setIsOpen(false);
                                                    }
                                                }}
                                                className={`p-5 flex gap-4 transition-all cursor-pointer relative group hover:bg-slate-50/50 ${!n.read ? 'bg-indigo-50/10' : 'bg-white'}`}
                                            >
                                                {/* Left Side: Avatar + Icon Badge */}
                                                <div className="relative flex-shrink-0">
                                                    <Avatar name={n.title} size="md" className="shadow-sm border border-slate-100" />
                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm ${state.iconBg}`}>
                                                        {state.icon}
                                                    </div>
                                                </div>

                                                {/* Right Side: Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${state.className} tracking-widest uppercase`}>
                                                            {state.label}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {formatTimestamp(n.created_at)}
                                                        </span>
                                                    </div>
                                                    <h4 className={`text-[13px] font-bold truncate leading-none mb-1.5 ${!n.read ? 'text-slate-900' : 'text-slate-600'}`}>
                                                        {n.title}
                                                    </h4>
                                                    <p className={`text-[12px] font-medium leading-relaxed line-clamp-2 ${!n.read ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {n.message}
                                                    </p>
                                                </div>

                                                {/* Unread Indicator */}
                                                {!n.read && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <button className="w-full py-4 bg-slate-50/80 border-t border-slate-100 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 group">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                                Ver histórico completo
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
