import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Inbox, MessageSquare, ListTodo, AlertTriangle, Info, Clock, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotificationCenter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
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
            case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'task': return <ListTodo className="w-4 h-4 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-indigo-500" />;
        }
    };

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
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 bottom-14 md:bottom-auto md:top-0 md:left-20 w-[350px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
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

                        {/* Notifications List */}
                        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                            {loading && notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-medium italic">Buscando atualizações...</span>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-medium">Tudo limpo por aqui!</p>
                                    <p className="text-xs">Nenhuma notificação nova no momento.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => !n.read && markAsRead(n.id)}
                                            className={`p-4 flex gap-3 transition-colors cursor-pointer group hover:bg-slate-50 relative ${!n.read ? 'bg-indigo-50/30' : ''
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
                                                <p className={`text-xs leading-relaxed mt-0.5 ${!n.read ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                                                    {n.message}
                                                </p>
                                                {n.link && (
                                                    <a
                                                        href={n.link}
                                                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                                                    >
                                                        Ver detalhes
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                )}
                                            </div>
                                            {!n.read && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* View All Button */}
                        <div className="p-3 bg-slate-50/30 border-t border-slate-50 text-center">
                            <button className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
                                Ver Hitórico Completo
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
