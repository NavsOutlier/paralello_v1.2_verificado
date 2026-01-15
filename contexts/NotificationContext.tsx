import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { notificationRepository, Notification } from '../lib/repositories/NotificationRepository';

interface NotificationContextProps {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps>({} as NotificationContextProps);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!user?.id) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        // Don't set loading to true here to avoid flickering on realtime updates
        const data = await notificationRepository.findByUser(user.id);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
        setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Real-time subscription
    useEffect(() => {
        if (!user?.id) return;

        const subscription = supabase
            .channel(`notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.id, fetchNotifications]);

    const markAsRead = async (id: string) => {
        const success = await notificationRepository.markAsRead(id);
        if (success) {
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const markAllAsRead = async () => {
        if (!user?.id) return;
        const success = await notificationRepository.markAllAsRead(user.id);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            markAsRead,
            markAllAsRead,
            refresh: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    return useContext(NotificationContext);
};
