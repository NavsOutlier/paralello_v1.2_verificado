import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DiscussionDraft, ChecklistItem, Message, Task } from '../types';
import { EntityList } from '../components/EntityList';
import { ChatArea, TaskManager } from '../components/workspace';
import { Loader2 } from 'lucide-react';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { useResizableSidebar } from '../hooks/useResizableSidebar';

export const Workspace: React.FC = () => {
  const { organizationId, user: currentUser } = useAuth();

  // Data Hook
  const {
    clients,
    team,
    allTeamMembers,
    allMessages,
    allTasks,
    checklistTemplates,
    loading,
    sendMessage,
    updateTask,
    createChecklistTemplate,
    deleteChecklistTemplate,
    addTaskComment,
    createTask,
    createContextMessage,
    manualUpdateState,
    notifyTaskCreated
  } = useWorkspaceData();

  // UI State
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [discussionDraft, setDiscussionDraft] = useState<DiscussionDraft | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Custom Hooks
  const { width: rightSidebarWidth, isResizing, startResizing } = useResizableSidebar(440, 440, 800);

  // Auto-select first client if none selected
  useEffect(() => {
    if (clients.length > 0 && !selectedEntityId && !loading) {
      setSelectedEntityId(clients[0].id);
    }
  }, [clients, selectedEntityId, loading]);

  // Derived state
  const selectedEntity = [...clients, ...team].find(e => e.id === selectedEntityId) || null;
  const currentChatMessages = allMessages.filter(m => m.channelId === selectedEntityId);
  const currentEntityTasks = allTasks.filter(t => t.clientId === selectedEntityId);
  const selectedTask = allTasks.find(t => t.id === selectedTaskId) || null;

  // Map of Message ID -> Task ID for messages that have been turned into tasks
  const linkedTaskMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    allMessages.forEach(m => {
      if (m.linkedMessageId && m.taskId && m.isInternal) {
        map[m.linkedMessageId] = m.taskId;
      }
    });
    return map;
  }, [allMessages]);

  const handleCreateTaskFromDraft = async (data: {
    title: string;
    status: 'todo' | 'in-progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high';
    assigneeId?: string;
    assigneeIds?: string[];
    deadline?: string;
    tags?: string[];
    description?: string;
    checklist?: ChecklistItem[];
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
      if (data.assigneeIds) taskPayload.assignee_ids = data.assigneeIds;
      if (data.deadline) taskPayload.deadline = data.deadline;
      if (data.tags) taskPayload.tags = data.tags;
      if (data.description) taskPayload.description = data.description;
      if (data.checklist) taskPayload.checklist = data.checklist;

      const taskData = await createTask(taskPayload);

      // 2. Create Context Message
      const messageText = comment?.trim() || "Discussão iniciada a partir desta mensagem";

      const msgData = await createContextMessage({
        organization_id: organizationId,
        task_id: taskData.id,
        context_type: 'TASK_INTERNAL',
        sender_id: currentUser?.id,
        sender_type: 'MEMBER',
        text: messageText,
        is_internal: true,
        linked_message_id: discussionDraft.sourceMessage.id
      });

      // 3. Update Local State via Hook
      manualUpdateState('tasks', {
        ...taskData,
        clientId: taskData.client_id,
        assigneeId: taskData.assignee_id,
        assigneeIds: taskData.assignee_ids || (taskData.assignee_id ? [taskData.assignee_id] : []),
        checklist: taskData.checklist || [],
        createdAt: new Date(taskData.created_at)
      });

      manualUpdateState('messages', {
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
      });

      // 4. Notify in Client Chat (WhatsApp Feed)
      if (taskData) {
        const _ = await notifyTaskCreated({
          ...taskData,
          clientId: taskData.client_id // ensure client_id mapped
        });
      }

      setDiscussionDraft(null);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleAttachTaskFromDraft = async (taskId: string, comment?: string) => {
    if (!discussionDraft || !organizationId || !currentUser) return;

    try {
      const messageText = comment?.trim() || "Mensagem vinculada à discussão";

      const data = await createContextMessage({
        organization_id: organizationId,
        task_id: taskId,
        context_type: 'TASK_INTERNAL',
        sender_id: currentUser.id,
        sender_type: 'MEMBER',
        text: messageText,
        is_internal: true,
        linked_message_id: discussionDraft.sourceMessage.id
      });

      manualUpdateState('messages', {
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
      });

      setDiscussionDraft(null);
    } catch (error) {
      console.error('Error attaching message to task:', error);
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

  if (loading && !clients.length && !team.length) {
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
          onSendMessage={(text) => selectedEntity && sendMessage(text, selectedEntity)}
          onInitiateDiscussion={(msg) => setDiscussionDraft({ sourceMessage: msg, mode: 'new' })}
          highlightedMessageId={highlightedMessageId}
          onNavigateToTask={(taskId) => setSelectedTaskId(taskId)}
          linkedTaskMap={linkedTaskMap}
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
            onAddTaskComment={addTaskComment}
            onUpdateTask={updateTask}
            onManualCreate={handleManualCreateTask}
            checklistTemplates={checklistTemplates}
            onCreateChecklistTemplate={createChecklistTemplate}
            onDeleteChecklistTemplate={deleteChecklistTemplate}
            selectedTask={selectedTask}
            onSelectTask={(t) => setSelectedTaskId(t ? t.id : null)}
          />
        ) : (
          <div className="p-10 text-center text-slate-400">Selecione um cliente para ver tarefas.</div>
        )}
      </div>
    </div>
  );
};