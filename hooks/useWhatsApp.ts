import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { WhatsAppInstance, WhatsAppMessage } from '../types';

export const useWhatsApp = (instanceId?: string, config?: { agentId?: string; onlyOrg?: boolean }) => {
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
        agentId: data.agent_id,
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

        let query = supabase
            .from('instances')
            .select('*')
            .eq('organization_id', organizationId);

        // Apply filters
        if (config?.agentId) {
            query = query.eq('agent_id', config.agentId);
        } else if (config?.onlyOrg) {
            query = query.is('agent_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (!error && data) {
            setInstances(data.map(mapInstance));
        }
    }, [organizationId, config?.agentId, config?.onlyOrg]);

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
        let filter = `organization_id=eq.${organizationId}`;
        if (config?.agentId) {
            filter += `&agent_id=eq.${config.agentId}`;
        } else if (config?.onlyOrg) {
            filter += `&agent_id=is.null`;
        }

        const instancesChannel = supabase
            .channel(`whatsapp-instances-${organizationId}-${config?.agentId || 'org'}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'instances',
                filter: filter
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
    }, [organizationId, fetchInstances, config?.agentId, config?.onlyOrg]);

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

            // Step 1: Check if an instance with this name already exists for this org
            const { data: existingInstance } = await supabase
                .from('instances')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('name', name.trim())
                .maybeSingle();

            let instanceId = existingInstance?.id;

            // Step 2: If no instance exists, INSERT a new one with status 'connecting'
            if (!instanceId) {
                const { data: newInstance, error: insertError } = await supabase
                    .from('instances')
                    .insert({
                        organization_id: organizationId,
                        name: name.trim(),
                        status: 'connecting',
                        client_id: metadata?.client_id || null,
                        agent_id: metadata?.agent_id || null
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('Error creating instance in DB:', insertError);
                    return { error: insertError };
                }
                instanceId = newInstance.id;
            } else {
                // If instance exists, update status to 'connecting' to trigger QR refresh
                await supabase
                    .from('instances')
                    .update({ status: 'connecting', qr_code: null })
                    .eq('id', instanceId);
            }

            // Step 3: Call n8n to generate QR Code (n8n will UPDATE this instance)
            const { data, error } = await supabase.functions.invoke('whatsapp-proxy-v2', {
                body: {
                    action: customAction || 'create_instance',
                    instance_id: instanceId, // Pass the DB instance ID so n8n can UPDATE it
                    name: name.trim(),
                    organization_id: organizationId,
                    client_id: metadata?.client_id,
                    agent_id: metadata?.agent_id,
                    ...metadata
                },
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });

            return { data: { ...data, instanceId }, error };
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

        // Use different action for worker vs organization groups
        const action = agentId ? 'create_group_worker' : 'create_group';

        const { data, error } = await supabase.functions.invoke('whatsapp-proxy-v2', {
            body: {
                action,
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
