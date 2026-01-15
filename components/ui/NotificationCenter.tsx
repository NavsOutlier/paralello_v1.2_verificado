import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Inbox, MessageSquare, ListTodo, AlertTriangle, Info, Clock, ExternalLink } from 'lucide-react';
import { ViewState } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

    const getIcon = (type: string) => {
        switch (type) {
            case 'dm': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'client_message': return <MessageSquare className="w-4 h-4 text-green-500" />;
            case 'task': return <ListTodo className="w-4 h-4 text-purple-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-slate-500" />;
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'all') return true;
        if (activeTab === 'dm') return n.type === 'dm' || n.type === 'message'; // Backwards compatibility
        if (activeTab === 'feed') return n.type === 'client_message';
        if (activeTab === 'task') return n.type === 'task';
        return true;
    });

    const tabs = [
        { id: 'all', label: 'Todas' },
        { id: 'dm', label: 'DMs' },
        { id: 'feed', label: 'Feed' },
        { id: 'task', label: 'Tarefas' },
    ];

    return (
        <div className="relative" ref={containerRef}>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-all duration-300 ${isOpen
                    ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-100'
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
                    <Bell className="w-6 h-6" />
                </motion.div>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                        {unreadCount > 9 ? '+9' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: -20 }}
                        className="absolute right-auto bottom-full left-16 mb-2 w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] origin-bottom-left"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Inbox className="w-4 h-4 text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Notificações</h3>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead()}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 uppercase tracking-tight"
                                >
                                    <CheckCheck className="w-3 h-3" />
                                    Ler Tudo
                                </button>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-50 px-2 pt-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wide transition-colors relative ${activeTab === tab.id
                                        ? 'text-indigo-600'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Notifications List */}
                        <div className="h-[400px] overflow-y-auto custom-scrollbar bg-slate-50/10">
                            {loading && notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-medium italic">Buscando atualizações...</span>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-medium">Nenhuma notificação nesta aba.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {filteredNotifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => {
                                                if (!n.read) markAsRead(n.id);
                                                if (n.link) {
                                                    // Smart Navigation

                                                    // 1. If we are NOT in the workspace, we must switch first
                                                    if (currentView !== ViewState.WORKSPACE && onViewChange) {
                                                        onViewChange(ViewState.WORKSPACE);

                                                        // Brief delay to allow view transition before pushing state
                                                        setTimeout(() => {
                                                            window.history.pushState({}, '', n.link);
                                                            window.dispatchEvent(new Event('pushstate'));
                                                        }, 100);
                                                    }
                                                    // 2. If we are ALREADY in workspace, just update internal state via URL
                                                    else if (window.location.pathname === '/workspace' || currentView === ViewState.WORKSPACE) {
                                                        window.history.pushState({}, '', n.link);
                                                        window.dispatchEvent(new Event('pushstate'));
                                                    }
                                                    // 3. Fallback for external links or hard reloads
                                                    else {
                                                        window.location.href = n.link;
                                                    }
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className={`p-4 flex gap-3 transition-colors cursor-pointer group hover:bg-white relative ${!n.read ? 'bg-indigo-50/40' : 'bg-white'
                                                }`}
                                        >
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm border border-slate-100 transition-transform group-hover:scale-110`}>
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-xs font-bold truncate ${!n.read ? 'text-slate-900' : 'text-slate-600'}`}>
                                                        {n.title}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-[9px] text-slate-400 whitespace-nowrap">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {formatDistanceToNow(n.created_at, { addSuffix: true, locale: ptBR })}
                                                    </div>
                                                </div>
                                                <p className={`text-xs leading-relaxed mt-0.5 line-clamp-2 ${!n.read ? 'text-slate-700' : 'text-slate-400'}`}>
                                                    {n.message}
                                                </p>
                                                {n.link && (
                                                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 group-hover:underline">
                                                        Ver detalhes
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                    </div>
                                                )}
                                            </div>
                                            {!n.read && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-sm" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                            <span className="text-[9px] uppercase tracking-widest text-slate-400">
                                Paralello AgencyOS
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
