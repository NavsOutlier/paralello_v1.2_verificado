import { useState, useEffect, useCallback } from 'react';
import { notificationRepository, Notification } from '../lib/repositories/NotificationRepository';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const useNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
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

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };
};
