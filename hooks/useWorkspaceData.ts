import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Message, Task, User as UIUser, ChecklistTemplate, ChecklistItem, DiscussionDraft, WhatsAppInstance } from '../types';

export const useWorkspaceData = () => {
    const { organizationId, user: currentUser } = useAuth();
    const [clients, setClients] = useState<UIUser[]>([]);
    const [team, setTeam] = useState<UIUser[]>([]);
    const [allTeamMembers, setAllTeamMembers] = useState<UIUser[]>([]);
    const [allMessages, setAllMessages] = useState<Message[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
    const [whatsappInstances, setWhatsappInstances] = useState<WhatsAppInstance[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const [clientsRes, teamRes, messagesRes, tasksRes, assignmentsRes, templatesRes, instancesRes] = await Promise.all([
                supabase.from('clients').select('*').eq('organization_id', organizationId).is('deleted_at', null),
                supabase.from('team_members').select('*, profile:profiles!team_members_profile_id_fkey(*)').eq('organization_id', organizationId).is('deleted_at', null),
                supabase.from('messages').select('*').eq('organization_id', organizationId).order('created_at', { ascending: true }),
                supabase.from('tasks').select('*').eq('organization_id', organizationId),
                supabase.from('client_assignments').select('client_id, team_member_id').eq('organization_id', organizationId),
                supabase.from('checklist_templates').select('*'),
                supabase.from('instances').select('*').eq('organization_id', organizationId)
            ]);

            // Get current user's team_member record
            const currentTeamMember = (teamRes.data || []).find(tm => tm.profile_id === currentUser?.id);

            // Filter clients based on assignments (unless user is manager/admin)
            let filteredClients = clientsRes.data || [];
            if (currentTeamMember && currentTeamMember.role !== 'manager') {
                const assignedClientIds = new Set(
                    (assignmentsRes.data || [])
                        .filter(a => a.team_member_id === currentTeamMember.id)
                        .map(a => a.client_id)
                );
                filteredClients = filteredClients.filter(c => assignedClientIds.has(c.id));
            }

            const mappedClients: UIUser[] = filteredClients.map(c => ({
                id: c.id,
                name: c.name,
                avatar: c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
                role: 'client',
                status: 'online',
                whatsappGroupId: c.whatsapp_group_id,
                lastMessage: ''
            }));

            // Create efficient lookup map for team member assignments
            const assignmentsMap = new Map<string, string[]>();
            (assignmentsRes.data || []).forEach((a: any) => {
                const list = assignmentsMap.get(a.team_member_id) || [];
                list.push(a.client_id);
                assignmentsMap.set(a.team_member_id, list);
            });

            const mappedTeam: UIUser[] = (teamRes.data || [])
                .filter(tm => tm.profile_id !== currentUser?.id)
                .map(tm => ({
                    id: tm.profile_id,
                    name: tm.profile?.name || 'Membro',
                    avatar: tm.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tm.profile?.name || 'M')}&background=random`,
                    role: 'team',
                    status: 'online',
                    jobTitle: tm.job_title,
                    assignedClientIds: assignmentsMap.get(tm.id) || []
                }));

            const allMappedTeam: UIUser[] = (teamRes.data || [])
                .map(tm => ({
                    id: tm.profile_id,
                    name: tm.profile?.name || 'Membro',
                    avatar: tm.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tm.profile?.name || 'M')}&background=random`,
                    role: 'team',
                    status: 'online',
                    jobTitle: tm.job_title,
                    assignedClientIds: assignmentsMap.get(tm.id) || []
                }));

            setClients(mappedClients);
            setTeam(mappedTeam);
            setAllTeamMembers(allMappedTeam);
            setChecklistTemplates((templatesRes.data || []).map(t => ({
                id: t.id,
                name: t.name,
                items: t.items,
                organizationId: t.organization_id,
                createdAt: t.created_at
            })));
            setWhatsappInstances((instancesRes.data || []).map(inst => ({
                id: inst.id,
                organizationId: inst.organization_id,
                name: inst.name,
                status: inst.status,
                qrCode: inst.qr_code,
                instanceApiId: inst.instance_api_id,
                instanceApiToken: inst.instance_api_token,
                createdAt: new Date(inst.created_at),
                updatedAt: new Date(inst.updated_at)
            })));

            setAllMessages((messagesRes.data || []).filter(m => {
                if (m.context_type === 'DIRECT_MESSAGE') {
                    return m.sender_id === currentUser?.id || m.dm_channel_id === currentUser?.id;
                }
                return true;
            }).map(m => {
                const mapped: Message = {
                    id: m.id,
                    contextType: m.context_type,
                    senderType: m.sender_type,
                    senderId: m.sender_id,
                    text: m.text,
                    timestamp: new Date(m.created_at),
                    isInternal: m.is_internal,
                    linkedMessageId: m.linked_message_id,
                    taskId: m.task_id,
                    clientId: m.client_id,
                    dmChannelId: m.dm_channel_id,
                    direction: m.direction,
                    uazapiId: m.uazapi_id,
                    channelId: m.task_id || m.client_id ||
                        (m.context_type === 'DIRECT_MESSAGE'
                            ? (m.sender_id === currentUser?.id ? m.dm_channel_id : m.sender_id)
                            : undefined)
                };
                return mapped;
            }));

            setAllTasks((tasksRes.data || []).map(t => ({
                ...t,
                clientId: t.client_id,
                assigneeId: t.assignee_id,
                assigneeIds: t.assignee_ids || (t.assignee_id ? [t.assignee_id] : []),
                checklist: t.checklist || [],
                archivedAt: t.archived_at ? new Date(t.archived_at) : undefined,
                createdAt: new Date(t.created_at)
            })));

        } catch (error) {
            console.error('Error fetching workspace data:', error);
        } finally {
            setLoading(false);
        }
    }, [organizationId, currentUser]);

    useEffect(() => {
        fetchData();

        if (!organizationId) return;

        const channel = supabase
            .channel(`workspace-${organizationId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages', filter: `organization_id=eq.${organizationId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newMsg = payload.new as any;
                        if (newMsg.context_type === 'DIRECT_MESSAGE' &&
                            newMsg.sender_id !== currentUser?.id &&
                            newMsg.dm_channel_id !== currentUser?.id) {
                            return;
                        }

                        setAllMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            const mapped: Message = {
                                id: newMsg.id,
                                contextType: newMsg.context_type,
                                senderType: newMsg.sender_type,
                                senderId: newMsg.sender_id,
                                text: newMsg.text,
                                timestamp: new Date(newMsg.created_at),
                                isInternal: newMsg.is_internal,
                                linkedMessageId: newMsg.linked_message_id,
                                taskId: newMsg.task_id,
                                clientId: newMsg.client_id,
                                dmChannelId: newMsg.dm_channel_id,
                                direction: newMsg.direction,
                                uazapiId: newMsg.uazapi_id,
                                channelId: newMsg.task_id || newMsg.client_id ||
                                    (newMsg.context_type === 'DIRECT_MESSAGE'
                                        ? (newMsg.sender_id === currentUser?.id ? newMsg.dm_channel_id : newMsg.sender_id)
                                        : undefined)
                            };
                            return [...prev, mapped];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedMsg = payload.new as any;
                        setAllMessages(prev => prev.map(m => m.id === updatedMsg.id ? {
                            id: updatedMsg.id,
                            contextType: updatedMsg.context_type,
                            senderType: updatedMsg.sender_type,
                            senderId: updatedMsg.sender_id,
                            text: updatedMsg.text,
                            timestamp: new Date(updatedMsg.created_at),
                            isInternal: updatedMsg.is_internal,
                            linkedMessageId: updatedMsg.linked_message_id,
                            taskId: updatedMsg.task_id,
                            clientId: updatedMsg.client_id,
                            dmChannelId: updatedMsg.dm_channel_id,
                            direction: updatedMsg.direction,
                            uazapiId: updatedMsg.uazapi_id,
                            channelId: updatedMsg.task_id || updatedMsg.client_id ||
                                (updatedMsg.context_type === 'DIRECT_MESSAGE'
                                    ? (updatedMsg.sender_id === currentUser?.id ? updatedMsg.dm_channel_id : updatedMsg.sender_id)
                                    : undefined)
                        } : m));
                    } else if (payload.eventType === 'DELETE') {
                        setAllMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `organization_id=eq.${organizationId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newTask = payload.new as any;
                        setAllTasks(prev => {
                            if (prev.some(t => t.id === newTask.id)) return prev;
                            return [...prev, {
                                ...newTask,
                                clientId: newTask.client_id,
                                assigneeId: newTask.assignee_id,
                                assigneeIds: newTask.assignee_ids || (newTask.assignee_id ? [newTask.assignee_id] : []),
                                checklist: newTask.checklist || [],
                                archivedAt: newTask.archived_at ? new Date(newTask.archived_at) : undefined,
                                createdAt: new Date(newTask.created_at)
                            }];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedTask = payload.new as any;
                        setAllTasks(prev => prev.map(t => t.id === updatedTask.id ? {
                            ...updatedTask,
                            clientId: updatedTask.client_id,
                            assigneeId: updatedTask.assignee_id,
                            assigneeIds: updatedTask.assignee_ids || (updatedTask.assignee_id ? [updatedTask.assignee_id] : []),
                            checklist: updatedTask.checklist || [],
                            archivedAt: updatedTask.archived_at ? new Date(updatedTask.archived_at) : undefined,
                            createdAt: new Date(updatedTask.created_at)
                        } : t));
                    } else if (payload.eventType === 'DELETE') {
                        setAllTasks(prev => prev.filter(t => t.id === payload.old.id));
                    }
                }
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `organization_id=eq.${organizationId}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `organization_id=eq.${organizationId}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `organization_id=eq.${organizationId}` }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, organizationId, currentUser]);

    // Mutation helpers
    const sendMessage = async (text: string, selectedEntity: UIUser) => {
        if (!text.trim() || !organizationId || !currentUser) return;
        const isClient = selectedEntity.role === 'client';
        const newMsgPayload: any = {
            organization_id: organizationId,
            text,
            sender_id: currentUser.id,
            sender_type: 'MEMBER',
            is_internal: false
        };

        if (isClient) {
            newMsgPayload.context_type = 'WHATSAPP_FEED';
            newMsgPayload.client_id = selectedEntity.id;
            newMsgPayload.direction = 'outbound'; // Members sending to clients are always outbound
        } else {
            newMsgPayload.context_type = 'DIRECT_MESSAGE';
            newMsgPayload.dm_channel_id = selectedEntity.id;
        }

        try {
            // 1. Save to Supabase for internal history
            const { data: savedMsg, error: saveError } = await supabase.from('messages').insert(newMsgPayload).select().single();
            if (saveError) throw saveError;

            // 2. If it's a client message, relay to WhatsApp via Proxy
            if (isClient && selectedEntity.whatsappGroupId) {
                const connectedInstance = whatsappInstances.find(inst => inst.status === 'connected');

                if (connectedInstance) {
                    const { data: { session } } = await supabase.auth.getSession();

                    // We don't await this to avoid blocking the UI, but we log errors
                    const { data: proxyResult, error: proxyError } = await supabase.functions.invoke('whatsapp-proxy-v2', {
                        body: {
                            action: 'send_message',
                            instance_id: connectedInstance.id,
                            to: selectedEntity.whatsappGroupId,
                            text: text.trim(),
                            organization_id: organizationId
                        },
                        headers: {
                            Authorization: `Bearer ${session?.access_token}`
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const updateTask = async (taskId: string, updates: Partial<Task>) => {
        if (!organizationId) return;
        try {
            const payload: any = {};
            // Using a loop or object traversal would be cleaner but keeping it explicit for now
            if (updates.status) payload.status = updates.status;
            if (updates.priority) payload.priority = updates.priority;
            if (updates.title) payload.title = updates.title;
            if (updates.assigneeId !== undefined) payload.assignee_id = updates.assigneeId;
            if (updates.assigneeIds !== undefined) payload.assignee_ids = updates.assigneeIds;
            if (updates.checklist !== undefined) payload.checklist = updates.checklist;
            if (updates.archivedAt !== undefined) payload.archived_at = updates.archivedAt;
            if (updates.tags) payload.tags = updates.tags;
            if (updates.description !== undefined) payload.description = updates.description;
            if (updates.deadline !== undefined) payload.deadline = updates.deadline;

            const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
            if (error) throw error;
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const createChecklistTemplate = async (name: string, items: ChecklistItem[]) => {
        if (!organizationId) return;
        try {
            const { data, error } = await supabase
                .from('checklist_templates')
                .insert({ name, items, organization_id: organizationId })
                .select()
                .single();
            if (error) throw error;
            if (data) {
                setChecklistTemplates(prev => [...prev, {
                    id: data.id,
                    name: data.name,
                    items: data.items,
                    organizationId: data.organization_id,
                    createdAt: data.created_at
                }]);
            }
        } catch (error) {
            console.error('Error creating checklist template:', error);
        }
    };

    const deleteChecklistTemplate = async (templateId: string) => {
        try {
            const { error } = await supabase
                .from('checklist_templates')
                .delete()
                .eq('id', templateId);
            if (error) throw error;
            setChecklistTemplates(prev => prev.filter(t => t.id !== templateId));
        } catch (error) {
            console.error('Error deleting checklist template:', error);
        }
    };

    const addTaskComment = async (taskId: string, text: string) => {
        if (!organizationId || !currentUser) return;
        try {
            const { data, error } = await supabase.from('messages').insert({
                organization_id: organizationId,
                task_id: taskId,
                context_type: 'TASK_INTERNAL',
                sender_id: currentUser.id,
                sender_type: 'MEMBER',
                text,
                is_internal: true
            }).select().single();
            if (error) throw error;
        } catch (error) {
            console.error('Error adding task comment:', error);
        }
    };

    const createTask = async (payload: any) => {
        const { data, error } = await supabase.from('tasks').insert(payload).select().single();
        if (error) throw error;
        return data;
    }

    const createContextMessage = async (payload: any) => {
        const { data, error } = await supabase.from('messages').insert(payload).select().single();
        if (error) throw error;
        return data;
    }

    const manualUpdateState = (type: 'tasks' | 'messages', item: any) => {
        if (type === 'tasks') {
            setAllTasks(prev => {
                if (prev.some(t => t.id === item.id)) return prev;
                return [...prev, item];
            });
        }
        if (type === 'messages') {
            setAllMessages(prev => {
                if (prev.some(m => m.id === item.id)) return prev;
                return [...prev, item];
            });
        }
    }

    const notifyTaskCreated = async (task: Task) => {
        if (!organizationId || !currentUser) return;
        try {
            const { data, error } = await supabase.from('messages').insert({
                organization_id: organizationId,
                client_id: task.clientId,
                context_type: 'WHATSAPP_FEED',
                sender_id: currentUser.id,
                sender_type: 'MEMBER',
                text: `Tarefa Criada: ${task.title}`,
                is_internal: true,
                task_id: task.id
            }).select().single();

            if (error) throw error;

            // Optimistic update
            manualUpdateState('messages', {
                id: data.id,
                channelId: task.clientId,
                taskId: task.id,
                contextType: 'WHATSAPP_FEED',
                senderType: 'MEMBER',
                senderId: currentUser.id,
                text: data.text,
                timestamp: new Date(data.created_at),
                isInternal: true,
                linkedMessageId: null
            });
            return data;
        } catch (error) {
            console.error('Error notifying task creation:', error);
        }
    };

    return {
        clients,
        team,
        allTeamMembers,
        allMessages,
        allTasks,
        checklistTemplates,
        whatsappInstances,
        loading,
        sendMessage,
        updateTask,
        createChecklistTemplate,
        deleteChecklistTemplate,
        addTaskComment,
        createTask,
        createContextMessage,
        manualUpdateState,
        notifyTaskCreated // Exported
    };
};
