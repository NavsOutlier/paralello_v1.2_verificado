import { BaseRepository } from './BaseRepository';

export interface Notification {
    id: string;
    organization_id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'message';
    link?: string;
    read: boolean;
    created_at: Date;
}

export class NotificationRepository extends BaseRepository<Notification> {
    constructor() {
        super('notifications');
    }

    async findByUser(userId: string): Promise<Notification[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }

        return (data || []).map(n => ({
            ...n,
            created_at: new Date(n.created_at)
        }));
    }

    async markAsRead(notificationId: string): Promise<boolean> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }

        return true;
    }

    async markAllAsRead(userId: string): Promise<boolean> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            return false;
        }

        return true;
    }

    async createNotification(notification: Partial<Notification>): Promise<Notification | null> {
        return this.create(notification);
    }
}

export const notificationRepository = new NotificationRepository();
