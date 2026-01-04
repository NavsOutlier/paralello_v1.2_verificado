/**
 * WhatsApp Domain Types
 */

/**
 * WhatsApp Instance Interface
 */
export interface WhatsAppInstance {
    id: string;
    organizationId: string;
    name: string;
    status: 'connected' | 'conectado' | 'disconnected' | 'desconectado' | 'connecting' | 'error' | 'waiting_scan';
    qrCode?: string;
    instanceApiId?: string;
    instanceApiToken?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * WhatsApp Message Interface
 */
export interface WhatsAppMessage {
    id: string;
    instanceId: string;
    remoteJid: string;
    direction: 'inbound' | 'outbound';
    content: string;
    status: string;
    uazapiId?: string;
    createdAt: Date;
}
