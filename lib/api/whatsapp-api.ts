/**
 * WhatsApp API Integration
 * 
 * Handles communication with n8n webhooks for WhatsApp messaging.
 */

import { MessageRepository } from '../repositories/MessageRepository';

const N8N_BASE_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

/**
 * Send text message to WhatsApp client
 */
export async function sendWhatsAppText(params: {
    organizationId: string;
    clientId: string;
    senderId: string;
    text: string;
}): Promise<{ messageId: string; success: boolean }> {
    try {
        // 1. Save to database first (optimistic UI)
        const message = await MessageRepository.sendToClient(params);

        // 2. Call n8n webhook to send via UAZAPI
        const response = await fetch(`${N8N_BASE_URL}/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messageId: message.id,
                organizationId: params.organizationId,
                clientId: params.clientId,
                text: params.text
            })
        });

        if (!response.ok) {
            // Mark as failed if n8n call fails
            await MessageRepository.updateStatus(message.id, 'failed');
            throw new Error(`n8n webhook failed: ${response.statusText}`);
        }

        const result = await response.json();

        // 3. Update with UAZAPI ID if provided
        if (result.uazapiId) {
            await MessageRepository.linkUazapiId(message.id, result.uazapiId);
        }

        return {
            messageId: message.id,
            success: true
        };

    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
}

/**
 * Get n8n webhook URLs for configuration
 */
export function getWebhookUrls() {
    return {
        send: `${N8N_BASE_URL}/send-message`,
        receive: `${N8N_BASE_URL}/whatsapp-incoming`
    };
}
