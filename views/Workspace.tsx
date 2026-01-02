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
  const [allTeamMembers, setAllTeamMembers] = useState<UIUser[]>([]); // All members for task assignment
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction State
  const [discussionDraft, setDiscussionDraft] = useState<DiscussionDraft | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 380 && newWidth < 600) {
        setRightSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize]);

  // Derived state based on the "Channel ID" pattern
  const selectedEntity = [...clients, ...team].find(e => e.id === selectedEntityId) || null;
  const currentChatMessages = allMessages.filter(m => m.channelId === selectedEntityId);
  const currentEntityTasks = allTasks.filter(t => t.clientId === selectedEntityId);

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const [clientsRes, teamRes, messagesRes, tasksRes, assignmentsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('organization_id', organizationId).is('deleted_at', null),
        supabase.from('team_members').select('*, profile:profiles!team_members_profile_id_fkey(*)').eq('organization_id', organizationId).is('deleted_at', null),
        supabase.from('messages').select('*').eq('organization_id', organizationId).order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').eq('organization_id', organizationId),
        supabase.from('client_assignments').select('client_id, team_member_id').eq('organization_id', organizationId)
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
        status: 'online', // Mocked status as it's not in DB yet
        lastMessage: '' // Populate if needed
      }));


      // Create efficient lookup map for team member assignments
      const assignmentsMap = new Map<string, string[]>();
      (assignmentsRes.data || []).forEach((a: any) => {
        const list = assignmentsMap.get(a.team_member_id) || [];
        list.push(a.client_id);
        assignmentsMap.set(a.team_member_id, list);
      });

      const mappedTeam: UIUser[] = (teamRes.data || [])
        .filter(tm => tm.profile_id !== currentUser?.id) // Remove current user from team list
        .map(tm => ({
          id: tm.profile_id,
          name: tm.profile?.name || 'Membro',
          avatar: tm.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tm.profile?.name || 'M')}&background=random`,
          role: 'team',
          status: 'online',
          jobTitle: tm.job_title,
          assignedClientIds: assignmentsMap.get(tm.id) || []
        }));

      // All team members including current user (for task assignment)
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
      setAllMessages((messagesRes.data || []).filter(m => {
        if (m.context_type === 'DIRECT_MESSAGE') {
          return m.sender_id === currentUser?.id || m.dm_channel_id === currentUser?.id;
        }
        return true;
      }).map(m => {
        // Properly construct Message object from database
        const mapped: Message = {
          id: m.id,
          contextType: m.context_type,
          senderType: m.sender_type,
          senderId: m.sender_id,
          text: m.text,
          timestamp: new Date(m.created_at),
          isInternal: m.is_internal,
          linkedMessageId: m.linked_message_id,
          // Polymorphic fields
          taskId: m.task_id,
          clientId: m.client_id,
          dmChannelId: m.dm_channel_id,
          // Channel routing
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

              // Properly construct Message object from realtime payload
              const mapped: Message = {
                id: newMsg.id,
                contextType: newMsg.context_type,
                senderType: newMsg.sender_type,
                senderId: newMsg.sender_id,
                text: newMsg.text,
                timestamp: new Date(newMsg.created_at),
                isInternal: newMsg.is_internal,
                linkedMessageId: newMsg.linked_message_id,
                // Polymorphic fields
                taskId: newMsg.task_id,
                clientId: newMsg.client_id,
                dmChannelId: newMsg.dm_channel_id,
                // Channel routing
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
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
            senderId: data.sender_id,
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
      if (updates.assigneeIds !== undefined) payload.assignee_ids = updates.assigneeIds;
      if (updates.checklist !== undefined) payload.checklist = updates.checklist;
      if (updates.archivedAt !== undefined) payload.archived_at = updates.archivedAt;
      if (updates.tags) payload.tags = updates.tags;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.deadline !== undefined) payload.deadline = updates.deadline;

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

  const handleCreateTaskFromDraft = async (data: {
    title: string;
    status: 'todo' | 'in-progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high';
    assigneeId?: string;
    deadline?: string;
    tags?: string[];
    description?: string;
  }, comment?: string) => {
    if (!organizationId || !discussionDraft || !selectedEntityId || !currentUser) return;

    try {
      // 1. Create Task
      const taskPayload: any = {
        organization_id: organizationId,
        title: data.title,
        status: data.status,
        priority: data.priority,
        client_id: selectedEntityId
      };

      if (data.assigneeId) taskPayload.assignee_id = data.assigneeId;
      if (data.deadline) taskPayload.deadline = data.deadline;
      if (data.tags) taskPayload.tags = data.tags;
      if (data.description) taskPayload.description = data.description;

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert(taskPayload)
        .select()
        .single();

      if (taskError) throw taskError;

      // 2. Create Context Message
      const messageText = comment?.trim() || "Discussão iniciada a partir desta mensagem";

      // 3. Create Context Message
      const { data: msgData, error: msgError } = await supabase.from('messages').insert({
        organization_id: organizationId,
        task_id: taskData.id,
        context_type: 'TASK_INTERNAL',
        sender_id: currentUser?.id,
        sender_type: 'MEMBER',
        text: messageText,
        is_internal: true,
        linked_message_id: discussionDraft.sourceMessage.id
      }).select().single();

      if (msgError) throw msgError;

      setAllTasks(prev => {
        if (prev.some(t => t.id === taskData.id)) return prev;
        return [...prev, {
          ...taskData,
          clientId: taskData.client_id,
          assigneeId: taskData.assignee_id,
          createdAt: new Date(taskData.created_at)
        }];
      });
      setAllMessages(prev => {
        if (prev.some(m => m.id === msgData.id)) return prev;
        return [...prev, {
          id: msgData.id,
          channelId: msgData.task_id,
          taskId: msgData.task_id,
          contextType: msgData.context_type,
          senderType: msgData.sender_type,
          senderId: msgData.sender_id,
          text: msgData.text,
          timestamp: new Date(msgData.created_at),
          isInternal: msgData.is_internal,
          linkedMessageId: msgData.linked_message_id
        }];
      });
      setDiscussionDraft(null);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleAttachTaskFromDraft = async (taskId: string, comment?: string) => {
    if (!discussionDraft || !organizationId || !currentUser) return;

    try {
      const messageText = comment?.trim() || "Mensagem vinculada à discussão";

      const { data, error } = await supabase.from('messages').insert({
        organization_id: organizationId,
        task_id: taskId,
        context_type: 'TASK_INTERNAL',
        sender_id: currentUser.id,
        sender_type: 'MEMBER',
        text: messageText,
        is_internal: true,
        linked_message_id: discussionDraft.sourceMessage.id
      }).select().single();

      if (error) throw error;

      setAllMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, {
          id: data.id,
          channelId: data.task_id,
          taskId: data.task_id,
          contextType: data.context_type,
          senderType: data.sender_type,
          senderId: data.sender_id,
          text: data.text,
          timestamp: new Date(data.created_at),
          isInternal: data.is_internal,
          linkedMessageId: data.linked_message_id
        }];
      });
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

      // Properly construct Message object from database response
      const newMessage: Message = {
        id: data.id,
        channelId: taskId,
        taskId: taskId,
        contextType: 'TASK_INTERNAL',
        senderType: 'MEMBER',
        senderId: data.sender_id,
        text: data.text,
        timestamp: new Date(data.created_at),
        isInternal: true
      };

      setAllMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Error adding task comment:', error);
    }
  };

  const handleManualCreateTask = () => {
    if (!selectedEntityId || !organizationId || !currentUser) return;
    setDiscussionDraft({
      sourceMessage: {
        id: 'manual',
        content: '',
        senderId: currentUser.id,
        timestamp: new Date(),
        channelId: selectedEntityId,
        organization_id: organizationId,
        context_type: 'TASK_DISCUSSION'
      } as any,
      mode: 'new'
    });
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
      <div className="w-[260px] flex-shrink-0">
        <EntityList
          clients={clients}
          team={team}
          selectedId={selectedEntityId}
          onSelect={setSelectedEntityId}
        />
      </div>

      <div className="flex-1 min-w-[350px]">
        <ChatArea
          entity={selectedEntity}
          messages={currentChatMessages}
          teamMembers={team}
          onSendMessage={handleSendMessage}
          onInitiateDiscussion={(msg) => setDiscussionDraft({ sourceMessage: msg, mode: 'new' })}
          highlightedMessageId={highlightedMessageId}
        />
      </div>

      {/* Resizer Handle */}
      <div
        onMouseDown={startResizing}
        className={`w-1.5 h-full cursor-col-resize hover:bg-indigo-400/30 transition-colors flex-shrink-0 z-10 -ml-0.5 border-l border-r border-slate-200 ${isResizing ? 'bg-indigo-400/50' : ''}`}
      />

      <div
        style={{ width: `${rightSidebarWidth}px` }}
        className="flex-shrink-0 bg-slate-50"
      >
        {selectedEntityId ? (
          <TaskManager
            tasks={currentEntityTasks}
            allMessages={allMessages}
            teamMembers={allTeamMembers}
            discussionDraft={discussionDraft}
            onCancelDraft={() => setDiscussionDraft(null)}
            onCreateTaskFromDraft={handleCreateTaskFromDraft}
            onAttachTaskFromDraft={handleAttachTaskFromDraft}
            onNavigateToMessage={(id) => setHighlightedMessageId(id)}
            onAddTaskComment={handleAddTaskComment}
            onUpdateTask={handleUpdateTask}
            onManualCreate={handleManualCreateTask}
          />
        ) : (
          <div className="p-10 text-center text-slate-400">Selecione um cliente para ver tarefas.</div>
        )}
      </div>
    </div>
  );
};