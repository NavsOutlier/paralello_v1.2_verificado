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
        supabase.from('team_members').select('*, profile:profiles(*)').eq('organization_id', organizationId).is('deleted_at', null),
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

      const mappedTeam: UIUser[] = (teamRes.data || []).map(tm => ({
        id: tm.profile_id,
        name: tm.profile?.name || 'Membro',
        avatar: tm.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tm.profile?.name || 'M')}&background=random`,
        role: 'team',
        status: 'online'
      }));

      setClients(mappedClients);
      setTeam(mappedTeam);
      setAllMessages((messagesRes.data || []).map(m => ({
        ...m,
        channelId: m.channel_id || m.client_id || m.task_id || m.dm_channel_id,
        timestamp: new Date(m.created_at)
      })));
      setAllTasks((tasksRes.data || []).map(t => ({
        ...t,
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
  }, [fetchData]);

  const handleSendMessage = async (text: string) => {
    if (!selectedEntityId || !text.trim() || !organizationId || !currentUser) return;

    const newMsgPayload = {
      organization_id: organizationId,
      channel_id: selectedEntityId,
      client_id: selectedEntityId, // Assuming for now selectedEntityId in Chat is client
      context_type: 'WHATSAPP_FEED',
      sender_id: currentUser.id,
      sender_type: 'MEMBER',
      text,
      is_internal: false
    };

    try {
      const { data, error } = await supabase.from('messages').insert(newMsgPayload).select().single();
      if (error) throw error;
      if (data) {
        setAllMessages(prev => [...prev, {
          ...data,
          channelId: data.channel_id || data.client_id,
          timestamp: new Date(data.created_at)
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
        channel_id: taskData.id,
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
        channel_id: taskId,
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

  const handleAddTaskComment = async (taskId: string, text: string) => {
    if (!organizationId || !currentUser) return;

    try {
      const { data, error } = await supabase.from('messages').insert({
        organization_id: organizationId,
        task_id: taskId,
        channel_id: taskId,
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
          />
        ) : (
          <div className="p-10 text-center text-slate-400">Selecione um cliente para ver tarefas.</div>
        )}
      </div>
    </div>
  );
};