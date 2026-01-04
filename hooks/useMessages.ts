import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MessageRepository } from '../lib/repositories/MessageRepository';
import { Message } from '../types';

/**
 * Hook to manage messages for a specific chat context (Client or Team Member).
 * Fetches messages on demand and listens for realtime updates for that context only.
 */
export const useMessages = (selectedEntityId: string | null) => {
    const { organizationId, user: currentUser } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMessages = useCallback(async () => {
        if (!organizationId || !selectedEntityId) {
            setMessages([]);
            return;
        }

        try {
            setLoading(true);

            // 1. Fetch messages for the specific channel
            // In our system, channelId is either clientId or dmChannelId/senderId
            const fetched = await MessageRepository.findByChannel(organizationId, selectedEntityId);

            setMessages(fetched);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    }, [organizationId, selectedEntityId]);

    useEffect(() => {
        fetchMessages();

        if (!organizationId || !selectedEntityId) return;

        // Optimized Realtime: Only listen to messages relevant to this org
        // (RLS handles security, but we filter at the channel level for efficiency)
        const channel = supabase
            .channel(`chat-${selectedEntityId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `organization_id=eq.${organizationId}`
            }, (payload) => {
                const newMsg = payload.new as any;

                // Only add if it belongs to current chat context
                const isRelevant =
                    newMsg.client_id === selectedEntityId ||
                    newMsg.dm_channel_id === selectedEntityId ||
                    (newMsg.context_type === 'DIRECT_MESSAGE' && newMsg.sender_id === selectedEntityId);

                if (isRelevant) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, MessageRepository.mapToMessage(newMsg, currentUser?.id)];
                    });
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `organization_id=eq.${organizationId}`
            }, (payload) => {
                const updatedMsg = payload.new as any;
                setMessages(prev => prev.map(m =>
                    m.id === updatedMsg.id ? MessageRepository.mapToMessage(updatedMsg, currentUser?.id) : m
                ));
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'messages',
                filter: `organization_id=eq.${organizationId}`
            }, (payload) => {
                setMessages(prev => prev.filter(m => m.id !== payload.old.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchMessages, organizationId, selectedEntityId, currentUser?.id]);

    // Helper for linked tasks mapping
    const linkedTaskMap = useMemo(() => {
        const map: Record<string, string> = {};
        messages.forEach(m => {
            if (m.linkedMessageId && m.taskId && m.contextType === 'TASK_INTERNAL') {
                map[m.linkedMessageId] = m.taskId;
            }
        });
        return map;
    }, [messages]);

    return {
        messages,
        loading,
        linkedTaskMap,
        refreshMessages: fetchMessages
    };
};
