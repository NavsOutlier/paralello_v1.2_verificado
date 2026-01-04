import { BaseRepository } from './BaseRepository';
import { Message } from '../../types';

/**
 * Database representation of Message
 */
interface DBMessage {
    id: string;
    organization_id: string;
    sender_id: string;
    sender_type: 'CLIENT' | 'MEMBER';
    text: string;

    // Context (polymorphic)
    context_type: 'WHATSAPP_FEED' | 'TASK_INTERNAL' | 'DIRECT_MESSAGE';
    client_id?: string;
    task_id?: string;
    dm_channel_id?: string;
    related_task_id?: string;

    // WhatsApp specific
    direction?: 'inbound' | 'outbound';
    uazapi_id?: string;
    status?: string;

    //Metadata
    is_internal?: boolean;
    linked_message_id?: string;

    created_at: string;
    updated_at?: string;
}

/**
 * Message Repository
 * 
 * Handles all database operations for messages (WhatsApp, tasks, DMs).
 */
class MessageRepositoryClass extends BaseRepository<DBMessage> {
    constructor() {
        super('messages');
    }

    /**
     * Map database message to UI Message type
     */
    private mapToMessage(dbMsg: DBMessage): Message {
        return {
            id: dbMsg.id,
            senderType: dbMsg.sender_type,
            senderId: dbMsg.sender_id,
            text: dbMsg.text,
            timestamp: new Date(dbMsg.created_at),

            // Context
            contextType: dbMsg.context_type,
            clientId: dbMsg.client_id,
            taskId: dbMsg.task_id,
            dmChannelId: dbMsg.dm_channel_id,

            // Metadata
            isInternal: dbMsg.is_internal,
            linkedMessageId: dbMsg.linked_message_id,
            direction: dbMsg.direction,
            uazapiId: dbMsg.uazapi_id
        };
    }

    /**
     * Find messages for a WhatsApp client conversation
     */
    async findByClient(clientId: string, limit: number = 50): Promise<Message[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('client_id', clientId)
            .eq('context_type', 'WHATSAPP_FEED')
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching client messages:', error);
            return [];
        }

        return (data || []).map(msg => this.mapToMessage(msg));
    }

    /**
     * Find messages for a task (internal discussions)
     */
    async findByTask(taskId: string, limit: number = 50): Promise<Message[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('task_id', taskId)
            .eq('context_type', 'TASK_INTERNAL')
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching task messages:', error);
            return [];
        }

        return (data || []).map(msg => this.mapToMessage(msg));
    }

    /**
     * Get latest message for each client (for client list preview)
     */
    async getLatestByClients(organizationId: string): Promise<Map<string, Message>> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('organization_id', organizationId)
            .eq('context_type', 'WHATSAPP_FEED')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching latest messages:', error);
            return new Map();
        }

        // Group by client_id and get latest
        const latestMap = new Map<string, Message>();
        data?.forEach(msg => {
            if (msg.client_id && !latestMap.has(msg.client_id)) {
                latestMap.set(msg.client_id, this.mapToMessage(msg));
            }
        });

        return latestMap;
    }

    /**
     * Send a text message to WhatsApp client
     */
    async sendToClient(params: {
        organizationId: string;
        clientId: string;
        senderId: string;
        text: string;
    }): Promise<Message> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert({
                organization_id: params.organizationId,
                client_id: params.clientId,
                sender_id: params.senderId,
                sender_type: 'MEMBER',
                text: params.text,
                context_type: 'WHATSAPP_FEED',
                direction: 'outbound',
                is_internal: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            throw new Error('Failed to send message');
        }

        return this.mapToMessage(data);
    }

    /**
     * Save incoming WhatsApp message (from webhook)
     */
    async receiveFromClient(params: {
        organizationId: string;
        clientId: string;
        text: string;
        uazapiId?: string;
    }): Promise<Message> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert({
                organization_id: params.organizationId,
                client_id: params.clientId,
                sender_id: params.clientId, // Client is sender
                sender_type: 'CLIENT',
                text: params.text,
                context_type: 'WHATSAPP_FEED',
                direction: 'inbound',
                uazapi_id: params.uazapiId,
                is_internal: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error receiving message:', error);
            throw new Error('Failed to save incoming message');
        }

        return this.mapToMessage(data);
    }

    /**
     * Update message status (sent, delivered, read, failed)
     */
    async updateStatus(messageId: string, status: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId);

        if (error) {
            console.error('Error updating message status:', error);
            throw new Error('Failed to update message status');
        }
    }

    /**
     * Link UAZAPI ID after successful send
     */
    async linkUazapiId(messageId: string, uazapiId: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({
                uazapi_id: uazapiId,
                status: 'sent',
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId);

        if (error) {
            console.error('Error linking UAZAPI ID:', error);
            throw new Error('Failed to link UAZAPI ID');
        }
    }
}

// Export singleton instance
export const MessageRepository = new MessageRepositoryClass();
