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
    deleted_at?: string;
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
    public mapToMessage(dbMsg: DBMessage, currentUserId?: string): Message {
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
            uazapiId: dbMsg.uazapi_id,

            // Channel ID logic for UI routing
            channelId: dbMsg.task_id || dbMsg.client_id ||
                (dbMsg.context_type === 'DIRECT_MESSAGE'
                    ? (dbMsg.sender_id === currentUserId ? dbMsg.dm_channel_id : dbMsg.sender_id)
                    : undefined)
        };
    }

    /**
     * Find messages for a specific channel (Client, Task, or DM)
     */
    async findByChannel(organizationId: string, channelId: string, limit: number = 100): Promise<Message[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('organization_id', organizationId)
            .or(`client_id.eq.${channelId},task_id.eq.${channelId},dm_channel_id.eq.${channelId},sender_id.eq.${channelId}`)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching channel messages:', error);
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

        const latestMap = new Map<string, Message>();
        data?.forEach(msg => {
            if (msg.client_id && !latestMap.has(msg.client_id)) {
                latestMap.set(msg.client_id, this.mapToMessage(msg));
            }
        });

        return latestMap;
    }

    /**
     * Create/Save a message from any source (frontend, webhook, etc.)
     */
    async receiveFromClient(params: {
        organizationId: string;
        senderId: string;
        senderType: 'CLIENT' | 'MEMBER';
        text: string;
        contextType: 'WHATSAPP_FEED' | 'TASK_INTERNAL' | 'DIRECT_MESSAGE';
        clientId?: string;
        task_id?: string;
        dmChannelId?: string;
        direction?: 'inbound' | 'outbound';
        uazapiId?: string;
        isInternal?: boolean;
        linked_message_id?: string;
    }): Promise<Message> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert({
                organization_id: params.organizationId,
                sender_id: params.senderId,
                sender_type: params.senderType,
                text: params.text,
                context_type: params.contextType,
                client_id: params.clientId,
                task_id: params.task_id,
                dm_channel_id: params.dmChannelId,
                direction: params.direction,
                uazapi_id: params.uazapiId,
                is_internal: params.isInternal,
                linked_message_id: params.linked_message_id
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving message:', error);
            throw new Error('Failed to save message');
        }

        return this.mapToMessage(data);
    }

    /**
     * Specific helper for member-to-client outbound messages
     */
    async sendToClient(params: {
        organizationId: string;
        clientId: string;
        senderId: string;
        text: string;
    }): Promise<Message> {
        return this.receiveFromClient({
            ...params,
            senderType: 'MEMBER',
            contextType: 'WHATSAPP_FEED',
            direction: 'outbound',
            isInternal: false
        });
    }

    /**
     * Link UAZAPI ID after successful send
     */
    async linkUazapiId(messageId: string, uazapiId: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({
                uazapi_id: uazapiId,
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId);

        if (error) {
            console.error('Error linking UAZAPI ID:', error);
            throw new Error('Failed to link UAZAPI ID');
        }
    }
}

export const MessageRepository = new MessageRepositoryClass();
