/**
 * Messaging Domain Types
 */

/**
 * Message Interface (Unified Message Type)
 */
export interface Message {
    id: string;

    // Channel-based routing
    channelId?: string;

    // Polymorphic Foreign Keys
    contextType: 'WHATSAPP_FEED' | 'TASK_INTERNAL' | 'DIRECT_MESSAGE';
    taskId?: string;
    clientId?: string;
    dmChannelId?: string;

    senderType: 'CLIENT' | 'MEMBER';
    senderId: string;

    text: string;
    timestamp: Date;

    // Metadata
    isInternal?: boolean;
    linkedMessageId?: string;
    direction?: 'inbound' | 'outbound';
    uazapiId?: string;
    position?: { x: number; y: number };
}

/**
 * Discussion Draft Interface
 */
export interface DiscussionDraft {
    sourceMessage: Message;
    mode: 'new' | 'attach';
}
