import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Message, Task, DiscussionDraft, User as UIUser } from '../types';
import { EntityList } from '../components/EntityList';
import { ChatArea, TaskManager } from '../components/workspace';
import { Loader2 } from 'lucide-react';

export const Workspace: React.FC = () => {
  const { organizationId, user: currentUser } = useAuth();
  const [clients, setClients] = useState<UIUser[]>([]);
  const [team, setTeam] = useState<UIUser[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction State
  const [discussionDraft, setDiscussionDraft] = useState<DiscussionDraft | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Derived state based on the "Channel ID" pattern
  const selectedEntity = [...clients, ...team].find(e => e.id === selectedEntityId) || null;
  const currentChatMessages = allMessages.filter(m => m.channelId === selectedEntityId);
  const currentEntityTasks = allTasks.filter(t => t.clientId === selectedEntityId);

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const [clientsRes, teamRes, messagesRes, tasksRes] = await Promise.all([
        supabase.from('clients').select('*').eq('organization_id', organizationId).is('deleted_at', null),
        supabase.from('team_members').select('*, profile:profiles!team_members_profile_id_fkey(*)').eq('organization_id', organizationId).is('deleted_at', null),
        supabase.from('messages').select('*').eq('organization_id', organizationId).order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').eq('organization_id', organizationId)
      ]);

      const mappedClients: UIUser[] = (clientsRes.data || []).map(c => ({
        id: c.id,
        name: c.name,
        avatar: c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
        role: 'client',
        status: 'online', // Mocked status as it's not in DB yet
        lastMessage: '' // Populate if needed
      }));

      const mappedTeam: UIUser[] = (teamRes.data || [])
        .filter(tm => tm.profile_id !== currentUser?.id) // Remove current user from team list
        .map(tm => ({
          id: tm.profile_id,
          name: tm.profile?.name || 'Membro',
          avatar: tm.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tm.profile?.name || 'M')}&background=random`,
          role: 'team',
          status: 'online'
        }));

      setClients(mappedClients);
      setTeam(mappedTeam);
      setAllMessages((messagesRes.data || []).filter(m => {
        if (m.context_type === 'DIRECT_MESSAGE') {
          return m.sender_id === currentUser?.id || m.dm_channel_id === currentUser?.id;
        }
        return true;
      }).map(m => {
        const mapped = {
          ...m,
          channelId: m.channel_id || m.client_id || m.task_id || m.dm_channel_id,
          timestamp: new Date(m.created_at)
        };
        if (m.context_type === 'DIRECT_MESSAGE') {
          mapped.channelId = m.sender_id === currentUser?.id ? m.dm_channel_id : m.sender_id;
        }
        return mapped;
      }));
      setAllTasks((tasksRes.data || []).map(t => ({
        ...t,
        clientId: t.client_id,
        assigneeId: t.assignee_id,
        createdAt: new Date(t.created_at)
      })));

      if (mappedClients.length > 0 && !selectedEntityId) {
        setSelectedEntityId(mappedClients[0].id);
      }
    } catch (error) {
      console.error('Error fetching workspace data:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, selectedEntityId]);

  useEffect(() => {
    fetchData();

    if (!organizationId) return;

    // Realtime Subscriptions
    const channel = supabase
      .channel(`workspace-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;

            // Privacy check for DMs
            if (newMsg.context_type === 'DIRECT_MESSAGE' &&
              newMsg.sender_id !== currentUser?.id &&
              newMsg.dm_channel_id !== currentUser?.id) {
              return;
            }

            setAllMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              const mapped = {
                ...newMsg,
                channelId: newMsg.channel_id || newMsg.client_id || newMsg.task_id,
                timestamp: new Date(newMsg.created_at)
              };
              if (newMsg.context_type === 'DIRECT_MESSAGE') {
                mapped.channelId = newMsg.sender_id === currentUser?.id ? newMsg.dm_channel_id : newMsg.sender_id;
              }
              return [...prev, mapped];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as any;
            setAllMessages(prev => prev.map(m => m.id === updatedMsg.id ? {
              ...updatedMsg,
              channelId: updatedMsg.channel_id || updatedMsg.client_id || updatedMsg.task_id || (updatedMsg.context_type === 'DIRECT_MESSAGE' ? (updatedMsg.sender_id === currentUser?.id ? updatedMsg.dm_channel_id : updatedMsg.sender_id) : undefined),
              timestamp: new Date(updatedMsg.created_at)
            } : m));
          } else if (payload.eventType === 'DELETE') {
            setAllMessages(prev => prev.filter(m => m.id === payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as any;
            setAllTasks(prev => {
              if (prev.some(t => t.id === newTask.id)) return prev;
              return [...prev, { ...newTask, createdAt: new Date(newTask.created_at) }];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as any;
            setAllTasks(prev => prev.map(t => t.id === updatedTask.id ? {
              ...updatedTask,
              clientId: updatedTask.client_id,
              assigneeId: updatedTask.assignee_id,
              createdAt: new Date(updatedTask.created_at)
            } : t));
          } else if (payload.eventType === 'DELETE') {
            setAllTasks(prev => prev.filter(t => t.id === payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchData(); // Simplest way for clients/team as they involve profile joins
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, organizationId]);

  const handleSendMessage = async (text: string) => {
    if (!selectedEntity || !text.trim() || !organizationId || !currentUser) return;

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
    } else {
      newMsgPayload.context_type = 'DIRECT_MESSAGE';
      newMsgPayload.dm_channel_id = selectedEntity.id; // Alvo
    }

    try {
      const { data, error } = await supabase.from('messages').insert(newMsgPayload).select().single();
      if (error) throw error;
      if (data) {
        setAllMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            ...data,
            channelId: data.channel_id || data.client_id || data.dm_channel_id,
            timestamp: new Date(data.created_at)
          }];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!organizationId) return;

    try {
      const payload: any = {};
      if (updates.status) payload.status = updates.status;
      if (updates.priority) payload.priority = updates.priority;
      if (updates.title) payload.title = updates.title;
      if (updates.assigneeId !== undefined) payload.assignee_id = updates.assigneeId;

      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', taskId);

      if (error) throw error;

      // Updates will be reflected via Realtime
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCreateTask = async (title: string, priority: 'low' | 'medium' | 'high') => {
    if (!selectedEntityId || !discussionDraft || !organizationId) return;

    try {
      // 1. Create Task
      const { data: taskData, error: taskError } = await supabase.from('tasks').insert({
        organization_id: organizationId,
        title,
        status: 'todo',
        priority,
        client_id: selectedEntityId
      }).select().single();

      if (taskError) throw taskError;

      // 2. Create Context Message
      const { data: msgData, error: msgError } = await supabase.from('messages').insert({
        organization_id: organizationId,
        task_id: taskData.id,
        context_type: 'TASK_INTERNAL',
        sender_id: currentUser?.id,
        sender_type: 'MEMBER',
        text: `Tarefa criada a partir da mensagem: "${discussionDraft.sourceMessage.text.substring(0, 30)}..."`,
        is_internal: true,
        linked_message_id: discussionDraft.sourceMessage.id
      }).select().single();

      if (msgError) throw msgError;

      setAllTasks(prev => [...prev, { ...taskData, createdAt: new Date(taskData.created_at) }]);
      setAllMessages(prev => [...prev, {
        ...msgData,
        channelId: msgData.task_id,
        timestamp: new Date(msgData.created_at)
      }]);
      setDiscussionDraft(null);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleAttachTask = async (taskId: string) => {
    if (!discussionDraft || !organizationId || !currentUser) return;

    try {
      const { data, error } = await supabase.from('messages').insert({
        organization_id: organizationId,
        task_id: taskId,
        context_type: 'TASK_INTERNAL',
        sender_id: currentUser.id,
        sender_type: 'MEMBER',
        text: `Mensagem adicionada à discussão: "${discussionDraft.sourceMessage.text}"`,
        is_internal: true,
        linked_message_id: discussionDraft.sourceMessage.id
      }).select().single();

      if (error) throw error;

      setAllMessages(prev => [...prev, {
        ...data,
        channelId: data.task_id,
        timestamp: new Date(data.created_at)
      }]);
      setDiscussionDraft(null);
    } catch (error) {
      console.error('Error attaching message to task:', error);
    }
  };

  const handleAddTaskComment = async (taskId: string, text: string): Promise<void> => {
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

      setAllMessages(prev => [...prev, {
        ...data,
        channelId: data.task_id,
        timestamp: new Date(data.created_at)
      }]);
    } catch (error) {
      console.error('Error adding task comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      <div className="w-[280px] flex-shrink-0">
        <EntityList
          clients={clients}
          team={team}
          selectedId={selectedEntityId}
          onSelect={setSelectedEntityId}
        />
      </div>

      <div className="flex-1 border-r border-slate-200 min-w-[350px]">
        <ChatArea
          entity={selectedEntity}
          messages={currentChatMessages}
          teamMembers={team}
          onSendMessage={handleSendMessage}
          onInitiateDiscussion={(msg) => setDiscussionDraft({ sourceMessage: msg, mode: 'new' })}
          highlightedMessageId={highlightedMessageId}
        />
      </div>

      <div className="w-[350px] flex-shrink-0 bg-slate-50">
        {selectedEntityId ? (
          <TaskManager
            tasks={currentEntityTasks}
            allMessages={allMessages}
            teamMembers={team}
            discussionDraft={discussionDraft}
            onCancelDraft={() => setDiscussionDraft(null)}
            onCreateTaskFromDraft={handleCreateTask}
            onAttachTaskFromDraft={handleAttachTask}
            onNavigateToMessage={(id) => setHighlightedMessageId(id)}
            onAddTaskComment={handleAddTaskComment}
            onUpdateTask={handleUpdateTask}
          />
        ) : (
          <div className="p-10 text-center text-slate-400">Selecione um cliente para ver tarefas.</div>
        )}
      </div>
    </div>
  );
};