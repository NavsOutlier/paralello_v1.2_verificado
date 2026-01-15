import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from './useTeam';
import { TaskRepository } from '../lib/repositories/TaskRepository';
import { MessageRepository } from '../lib/repositories/MessageRepository';
import { sendWhatsAppText } from '../lib/api/whatsapp-api';
import { notificationRepository } from '../lib/repositories/NotificationRepository';
import { Task, ChecklistItem, User as UIUser } from '../types';

/**
 * Hook to handle all mutating actions in the Workspace.
 * Centralizes logic previously in useWorkspaceData.
 */
export const useWorkspaceActions = () => {
    const { organizationId, user: currentUser } = useAuth();
    const { allMembers } = useTeam();

    const currentUserMember = useMemo(() =>
        allMembers.find(m => m.id === currentUser?.id),
        [allMembers, currentUser?.id]);

    const sendMessage = useCallback(async (text: string, selectedEntity: UIUser) => {
        if (!text.trim() || !organizationId || !currentUser) return;

        const isClient = selectedEntity.role === 'client';

        try {
            if (isClient) {
                // Use the secure Edge Function via the API wrapper
                await sendWhatsAppText({
                    organizationId,
                    clientId: selectedEntity.id,
                    senderId: currentUser.id,
                    senderName: currentUserMember?.name || currentUser.email || 'Membro',
                    senderJobTitle: currentUserMember?.jobTitle,
                    text: text.trim()
                });
            } else {
                // Internal DM - Save directly to repository
                await MessageRepository.receiveFromClient({
                    organizationId,
                    contextType: 'DIRECT_MESSAGE',
                    dmChannelId: selectedEntity.id,
                    senderId: currentUser.id,
                    senderType: 'MEMBER',
                    text: text.trim()
                });

                // Trigger Notification for the recipient
                await notificationRepository.createNotification({
                    organization_id: organizationId,
                    user_id: selectedEntity.id,
                    title: 'Nova Mensagem',
                    message: `${currentUserMember?.name || 'Um membro'} enviou uma mensagem direta.`,
                    type: 'message'
                });
            }
        } catch (error) {
            console.error('Error in sendMessage action:', error);
            throw error;
        }
    }, [organizationId, currentUser, currentUserMember]);

    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        if (!organizationId) return;
        // Transform UI Task to DB mapping happens in repository
        await TaskRepository.updateDetails(taskId, updates as any);
    }, [organizationId]);

    const addTaskComment = useCallback(async (taskId: string, text: string) => {
        if (!organizationId || !currentUser) return;
        await MessageRepository.receiveFromClient({
            organizationId,
            task_id: taskId,
            contextType: 'TASK_INTERNAL',
            senderId: currentUser.id,
            senderType: 'MEMBER',
            text,
            isInternal: true
        });
    }, [organizationId, currentUser]);

    const createTask = useCallback(async (payload: any) => {
        const newTask = await TaskRepository.createNewTask(payload);

        // Notify assignees
        if (newTask && organizationId && payload.assignee_ids) {
            const assigneeIds = Array.isArray(payload.assignee_ids) ? payload.assignee_ids : [payload.assignee_id];

            for (const assigneeId of assigneeIds) {
                if (assigneeId && assigneeId !== currentUser?.id) {
                    await notificationRepository.createNotification({
                        organization_id: organizationId,
                        user_id: assigneeId,
                        title: 'Nova Tarefa Atribuída',
                        message: `Você foi atribuído à tarefa: ${newTask.title}`,
                        type: 'task',
                        link: `/workspace?task=${newTask.id}`
                    });
                }
            }
        }

        return newTask;
    }, [organizationId, currentUser?.id]);

    const createContextMessage = useCallback(async (payload: any) => {
        // This is used for linking tasks to messages
        return await MessageRepository.receiveFromClient({
            organizationId: payload.organization_id,
            senderId: payload.sender_id,
            senderType: payload.sender_type,
            text: payload.text,
            contextType: payload.context_type,
            task_id: payload.task_id,
            clientId: payload.client_id,
            dmChannelId: payload.dm_channel_id,
            isInternal: payload.is_internal,
            linked_message_id: payload.linked_message_id
        });
    }, []);

    const notifyTaskCreated = useCallback(async (task: Task) => {
        if (!organizationId || !currentUser) return;

        return await MessageRepository.receiveFromClient({
            organizationId,
            clientId: task.clientId,
            contextType: 'WHATSAPP_FEED',
            senderId: currentUser.id,
            senderType: 'MEMBER',
            text: `Tarefa Criada: ${task.title}`,
            isInternal: true,
            task_id: task.id
        });
    }, [organizationId, currentUser]);

    return {
        sendMessage,
        updateTask,
        addTaskComment,
        createTask,
        createContextMessage,
        notifyTaskCreated
    };
};
