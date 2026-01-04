/**
 * WhatsApp API Integration
 * 
 * Secure relay for WhatsApp messaging using Supabase Edge Functions.
 */

import { MessageRepository } from '../repositories/MessageRepository';
import { WhatsAppRepository } from '../repositories/WhatsAppRepository';
import { ClientRepository } from '../repositories/ClientRepository';
import { supabase } from '../supabase';

/**
 * Send text message to WhatsApp client via secure Edge Function
 */
export async function sendWhatsAppText(params: {
    organizationId: string;
    clientId: string;
    senderId: string;
    senderName: string;
    senderJobTitle?: string;
    text: string;
}): Promise<{ messageId: string; success: boolean }> {
    try {
        // 1. Save to database first (optimistic UI)
        const message = await MessageRepository.sendToClient(params);

        // 2. Fetch active WhatsApp instance and client data
        const [activeInstance, client] = await Promise.all([
            WhatsAppRepository.findActiveInstance(params.organizationId),
            ClientRepository.findById(params.clientId)
        ]);

        // 3. Call Supabase Edge Function (Proxy)
        // This is much safer as it hides n8n URLs and validates auth via JWT automatically
        const { data: result, error: proxyError } = await supabase.functions.invoke('whatsapp-proxy-v2', {
            body: {
                action: 'send_message',
                organization_id: params.organizationId,
                client_id: params.clientId,
                instance_id: activeInstance?.id, // Pass database instance UUID
                whatsapp_group_id: client?.whatsapp_group_id, // Pass WhatsApp Group ID if it exists
                sender_name: params.senderName, // Pass sender name for logging/context
                sender_role: params.senderJobTitle, // Pass sender job title/role
                message_id: message.id,
                text: params.text
            }
        });

        if (proxyError) {
            console.error('Proxy relay error:', proxyError);
            // We don't throw here to allow the UI to show the message as "sent to DB" 
            // but we could mark it as failed in DB if we had status tracking enabled.
            throw new Error(`Failed to relay message to WhatsApp: ${proxyError.message}`);
        }

        // 3. Update with UAZAPI ID if provided by the proxy
        if (result?.uazapiId) {
            await MessageRepository.linkUazapiId(message.id, result.uazapiId);
        }

        return {
            messageId: message.id,
            success: true
        };

    } catch (error) {
        console.error('Error in sendWhatsAppText:', error);
        throw error;
    }
}
