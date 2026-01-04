import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChecklistItem, Message } from '../types';
import { EntityList } from '../components/EntityList';
import { ChatArea, TaskManager } from '../components/workspace';
import { Loader2 } from 'lucide-react';

// New Modular Hooks
import { useClients } from '../hooks/useClients';
import { useTeam } from '../hooks/useTeam';
import { useMessages } from '../hooks/useMessages';
import { useTasks } from '../hooks/useTasks';
import { useChecklists } from '../hooks/useChecklists';
import { useWorkspaceActions } from '../hooks/useWorkspaceActions';
import { useResizableSidebar } from '../hooks/useResizableSidebar';

export const Workspace: React.FC = () => {
  const { organizationId, user: currentUser } = useAuth();

  // UI State
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Discussion state
  const [discussionDraft, setDiscussionDraft] = useState<{
    sourceMessage: Message;
    mode: 'new' | 'attach';
  } | null>(null);

  // Modular Data Hook Instances
  const { clients, loading: loadingClients } = useClients();
  const { team, allMembers: allTeamMembers } = useTeam();
  const { messages, loading: loadingMessages, linkedTaskMap, refreshMessages } = useMessages(selectedEntityId);
  const { messages: taskMessages, refreshMessages: refreshTaskMessages } = useMessages(selectedTaskId);
  const { tasks, refreshTasks } = useTasks(selectedEntityId); // Fetch tasks for selected client/member
  const { templates: checklistTemplates, createTemplate, deleteTemplate } = useChecklists();
  const {
    sendMessage,
    updateTask,
    addTaskComment,
    createTask,
    createContextMessage,
    notifyTaskCreated
  } = useWorkspaceActions();

  // UI Hooks
  const { width: rightSidebarWidth, isResizing, startResizing } = useResizableSidebar(440, 440, 800);

  // Auto-select first client if none selected
  useEffect(() => {
    if (clients.length > 0 && !selectedEntityId && !loadingClients) {
      setSelectedEntityId(clients[0].id);
    }
  }, [clients, selectedEntityId, loadingClients]);

  // Derived state
  const selectedEntity = [...clients, ...team].find(e => e.id === selectedEntityId) || null;
  const selectedTask = (tasks || []).find(t => t.id === selectedTaskId) || null;

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
    if (!organizationId || !discussionDraft || !selectedEntityId || !currentUser || isCreatingTask) return;

    try {
      setIsCreatingTask(true);

      // 1. Create Task via repository (through action hook)
      const taskData = await createTask({
        organization_id: organizationId,
        title: data.title,
        status: data.status,
        priority: data.priority,
        client_id: selectedEntityId,
        assignee_id: data.assigneeId,
        assignee_ids: data.assigneeIds,
        deadline: data.deadline,
        tags: data.tags,
        description: data.description,
        checklist: data.checklist
      });

      // 2. Create Context Message to link task to source message
      const messageText = comment?.trim() || "Discussão iniciada a partir desta mensagem";
      await createContextMessage({
        organization_id: organizationId,
        task_id: taskData.id,
        client_id: selectedEntityId, // Crucial for showing linkage in client feed
        context_type: 'TASK_INTERNAL',
        sender_id: currentUser?.id,
        sender_type: 'MEMBER',
        text: messageText,
        is_internal: true,
        linked_message_id: discussionDraft.sourceMessage.id
      });

      // Refresh data (realtime will also catch it, but this is faster for same-user experience)
      refreshTasks();
      refreshMessages();
      setDiscussionDraft(null);

    } catch (error) {
      console.error('Error creating task from draft:', error);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleAttachTaskFromDraft = async (taskId: string, comment?: string) => {
    if (!discussionDraft || !organizationId || !currentUser) return;

    try {
      const messageText = comment?.trim() || "Mensagem vinculada à discussão";
      await createContextMessage({
        organization_id: organizationId,
        task_id: taskId,
        client_id: selectedEntityId, // Crucial for linkage
        context_type: 'TASK_INTERNAL',
        sender_id: currentUser.id,
        sender_type: 'MEMBER',
        text: messageText,
        is_internal: true,
        linked_message_id: discussionDraft.sourceMessage.id
      });

      refreshMessages();
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
        text: '',
        senderId: currentUser.id,
        timestamp: new Date(),
        channelId: selectedEntityId,
        contextType: 'TASK_INTERNAL'
      } as any,
      mode: 'new'
    });
  };

  if (loadingClients && !clients.length) {
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
          messages={messages}
          teamMembers={allTeamMembers}
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
            tasks={tasks}
            allMessages={[...messages, ...taskMessages]}
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
            onCreateChecklistTemplate={createTemplate}
            onDeleteChecklistTemplate={deleteTemplate}
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
