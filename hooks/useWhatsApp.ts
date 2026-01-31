import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { WhatsAppInstance, WhatsAppMessage } from '../types';

export const useWhatsApp = (instanceId?: string) => {
    const { organizationId } = useAuth();
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const mapInstance = (data: any): WhatsAppInstance => ({
        id: data.id,
        organizationId: data.organization_id,
        name: data.name,
        status: data.status,
        qrCode: data.qr_code,
        instanceApiId: data.instance_api_id,
        instanceApiToken: data.instance_api_token,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
    });

    const mapMessage = (data: any): WhatsAppMessage => ({
        id: data.id,
        instanceId: data.instance_id,
        remoteJid: data.remote_jid,
        direction: data.direction,
        content: data.content,
        status: data.status,
        uazapiId: data.uazapi_id,
        createdAt: new Date(data.created_at)
    });

    const fetchInstances = useCallback(async () => {
        if (!organizationId) return;
        const { data, error } = await supabase
            .from('instances')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setInstances(data.map(mapInstance));
        }
    }, [organizationId]);

    const fetchMessages = useCallback(async (instId: string) => {
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('instance_id', instId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (!error && data) {
            setMessages(data.map(mapMessage));
        }
    }, []);

    useEffect(() => {
        if (!organizationId) return;

        fetchInstances().then(() => setLoading(false));

        // Realtime for Instances
        const instancesChannel = supabase
            .channel('whatsapp-instances')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'instances',
                filter: `organization_id=eq.${organizationId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setInstances(prev => [mapInstance(payload.new), ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setInstances(prev => prev.map(inst => inst.id === payload.new.id ? mapInstance(payload.new) : inst));
                } else if (payload.eventType === 'DELETE') {
                    setInstances(prev => prev.filter(inst => inst.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(instancesChannel);
        };
    }, [organizationId, fetchInstances]);

    useEffect(() => {
        if (!instanceId) return;

        fetchMessages(instanceId);

        // Realtime for Messages
        const messagesChannel = supabase
            .channel(`whatsapp-messages-${instanceId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'whatsapp_messages',
                filter: `instance_id=eq.${instanceId}`
            }, (payload) => {
                setMessages(prev => [mapMessage(payload.new), ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messagesChannel);
        };
    }, [instanceId, fetchMessages]);

    const createInstance = async (name: string, customAction?: string, metadata?: Record<string, any>) => {
        if (!organizationId) {
            return { error: new Error('No organization') };
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const { data, error } = await supabase.functions.invoke('whatsapp-proxy-v2', {
                body: {
                    action: customAction || 'create_instance',
                    name: name.trim(),
                    organization_id: organizationId,
                    client_id: metadata?.client_id,
                    agent_id: metadata?.agent_id,
                    ...metadata  // Spread metadata to allow additional fields if needed
                },
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });

            return { data, error };
        } catch (err: any) {
            return { error: err };
        }
    };

    const sendMessage = async (instId: string, to: string, text: string) => {
        const { data: { session } } = await supabase.auth.getSession();

        const { data, error } = await supabase.functions.invoke('whatsapp-proxy-v2', {
            body: {
                action: 'send_message',
                instance_id: instId,
                to,
                text
            },
            headers: {
                Authorization: `Bearer ${session?.access_token}`
            }
        });

        return { data, error };
    };

    const createGroup = async (clientName: string, clientId: string, phone?: string, agentId?: string) => {
        if (!organizationId) return { error: new Error('No organization') };
        const { data: { session } } = await supabase.auth.getSession();

        const { data, error } = await supabase.functions.invoke('whatsapp-proxy-v2', {
            body: {
                action: 'create_group',
                name: clientName,
                client_id: clientId,
                agent_id: agentId,
                phone: phone,
                organization_id: organizationId
            },
            headers: {
                Authorization: `Bearer ${session?.access_token}`
            }
        });

        return { data, error };
    };

    const deleteInstance = async (instId: string) => {
        try {
            // 1. Fetch metadata before deletion
            const { data: instance } = await supabase
                .from('instances')
                .select('*')
                .eq('id', instId)
                .single();

            if (instance) {
                // 2. Call proxy to cleanup remotely (n8n)
                const { data: result, error: proxyError } = await supabase.functions.invoke('whatsapp-proxy-v2', {
                    body: {
                        action: 'delete_instance',
                        instance_id: instId,
                        instance_api_id: instance.instance_api_id,
                        instance_api_token: instance.instance_api_token,
                        organization_id: organizationId
                    }
                });

                if (proxyError || result?.error) {
                    const errorMsg = proxyError?.message || result?.error;
                    console.error('Remote cleanup failed:', errorMsg);
                    return { error: new Error(`Não foi possível remover no WhatsApp: ${errorMsg}`) };
                }
            }

            // 3. Delete from DB only after remote success
            const { error } = await supabase
                .from('instances')
                .delete()
                .eq('id', instId);

            return { error };
        } catch (err: any) {
            console.error('Error deleting instance:', err);
            return { error: err };
        }
    };

    return {
        instances,
        messages,
        loading,
        createInstance,
        createGroup,
        sendMessage,
        deleteInstance,
        refreshInstances: fetchInstances,
    };
};
