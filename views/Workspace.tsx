import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChecklistItem, Message } from '../types';
import { EntityList } from '../components/EntityList';
import { ChatArea, TaskManager } from '../components/workspace';
import { Loader2, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from 'lucide-react';

// New Modular Hooks
import { useClients } from '../hooks/useClients';
import { useTeam } from '../hooks/useTeam';
import { useMessages } from '../hooks/useMessages';
import { useTasks } from '../hooks/useTasks';
import { useChecklists } from '../hooks/useChecklists';
import { useWorkspaceActions } from '../hooks/useWorkspaceActions';
import { useResizableSidebar } from '../hooks/useResizableSidebar';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { distortionRepository } from '../lib/repositories/DistortionRepository';
import { TaskRepository } from '../lib/repositories/TaskRepository';
import { useNotifications } from '../hooks/useNotifications';
import { MessageRepository } from '../lib/repositories/MessageRepository';

export const Workspace: React.FC = () => {
  const { organizationId, user: currentUser } = useAuth();

  // UI State
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);

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
  const { instances } = useWhatsApp();
  const { notifications, markAsRead } = useNotifications();

  // Mark notifications as read when selecting an entity
  useEffect(() => {
    if (!selectedEntityId || !notifications.length) return;

    notifications.forEach(n => {
      if (!n.read && n.link) {
        const match = n.link.match(/chat=([^&]*)/);
        if (match && match[1] === selectedEntityId) {
          markAsRead(n.id);
        }
      }
    });
  }, [selectedEntityId, notifications, markAsRead]);

  // Latest Messages State for Preview
  const [latestMessagesMap, setLatestMessagesMap] = useState<Map<string, Message>>(new Map());

  // Fetch Latest Messages
  useEffect(() => {
    if (!organizationId) return;
    const fetchLatest = async () => {
      const map = await MessageRepository.getLatestByClients(organizationId);
      setLatestMessagesMap(map);
    };
    fetchLatest();
  }, [organizationId, messages]);

  // Calculate Unread Counts from Notifications
  const unreadMap = useMemo(() => {
    const map = new Map<string, number>();
    notifications.forEach(n => {
      if (!n.read && n.link) {
        // Extract Entity ID from link (e.g. /workspace?chat=UUID) or n.title if needed
        // For now relying on link convention we set in NotificationCenter logic
        const match = n.link.match(/chat=([^&]*)/);
        if (match && match[1]) {
          const entityId = match[1];
          map.set(entityId, (map.get(entityId) || 0) + 1);
        }
      }
    });
    return map;
  }, [notifications]);

  // Enriched Entities with Unread Counts and Last Messages
  const enrichedClients = useMemo(() => clients.map(c => ({
    ...c,
    unreadCount: unreadMap.get(c.id) || 0,
    lastMessage: latestMessagesMap.get(c.id)?.text || ''
  })), [clients, unreadMap, latestMessagesMap]);

  const enrichedTeam = useMemo(() => team.map(t => ({
    ...t,
    unreadCount: unreadMap.get(t.id) || 0,
    lastMessage: latestMessagesMap.get(t.id)?.text || ''
  })), [team, unreadMap, latestMessagesMap]);

  const activeWhatsappStatus = useMemo(() => {
    if (!instances || instances.length === 0) return 'desconectado';
    // Match both 'conectado' and 'connected'
    const active = instances.find(inst => ['connected', 'conectado'].includes(inst.status));
    return active ? 'conectado' : instances[0].status;
  }, [instances]);

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

  // Deep Linking Handler
  useEffect(() => {
    const handleUrlChange = async () => {
      const params = new URLSearchParams(window.location.search);
      const taskId = params.get('task');
      const chatId = params.get('chat');

      if (chatId) {
        setSelectedEntityId(chatId);
      }

      if (taskId) {
        // Fetch task to find out which entity (client) logic context we should be in
        try {
          const task = await TaskRepository.findById(taskId);
          if (task && task.client_id) {
            // IMPORTANT: Change the workspace context to the client who owns this task
            setSelectedEntityId(task.client_id);
            setSelectedTaskId(taskId);
            setRightSidebarVisible(true);
          }
        } catch (err) {
          console.error('Failed to resolve deep link task', err);
        }
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('pushstate', handleUrlChange); // Custom event

    // Check on mount
    handleUrlChange();

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('pushstate', handleUrlChange);
    };
  }, []);

  // Derived state
  const selectedEntity = [...enrichedClients, ...enrichedTeam].find(e => e.id === selectedEntityId) || null;
  const selectedTask = (tasks || []).find(t => t.id === selectedTaskId) || null;

  // Persistent Distortion Canvas State
  const [distortionPositions, setDistortionPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [distortionLabels, setDistortionLabels] = useState<any[]>([]);
  const [isSyncingLayout, setIsSyncingLayout] = useState(false);

  // Load Layout from DB
  useEffect(() => {
    if (!organizationId || !selectedEntityId) return;

    const loadLayout = async () => {
      setIsSyncingLayout(true);
      const layout = await distortionRepository.findByEntity(organizationId, selectedEntityId);
      if (layout) {
        setDistortionPositions(layout.positions || {});
        setDistortionLabels(layout.labels || []);
      } else {
        // Reset if no saved layout
        setDistortionPositions({});
        setDistortionLabels([]);
      }
      setIsSyncingLayout(false);
    };

    loadLayout();
  }, [organizationId, selectedEntityId]);

  // Save Layout to DB (Debounced)
  useEffect(() => {
    if (!organizationId || !selectedEntityId || isSyncingLayout) return;

    // Only save if there's actually something to save
    if (Object.keys(distortionPositions).length === 0 && distortionLabels.length === 0) return;

    const timer = setTimeout(async () => {
      await distortionRepository.upsertLayout({
        organization_id: organizationId,
        entity_id: selectedEntityId,
        positions: distortionPositions,
        labels: distortionLabels
      });
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [distortionPositions, distortionLabels, organizationId, selectedEntityId, isSyncingLayout]);

  // Memoized and Deduped messages for TaskManager
  const allWorkspaceMessages = useMemo(() => {
    const combined = [...messages, ...taskMessages];
    const map = new Map();
    combined.forEach(m => {
      if (m && m.id) map.set(m.id, m);
    });
    return Array.from(map.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages, taskMessages]);

  const clientFeedMessages = useMemo(() => {
    return messages.filter(m => {
      // 1. Show all regular messages (not internal)
      if (!m.isInternal) return true;
      // 2. Show task creation notifications in the main feed
      if (m.text?.toLowerCase().includes('tarefa criada')) return true;
      // 3. Hide everything else that is internal (manual task comments, etc.)
      return false;
    });
  }, [messages]);

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
      // Only attempt to link if we have a valid source message ID (not 'manual')
      const messageText = comment?.trim() || "Discussão iniciada a partir desta mensagem";
      const validLinkedMessageId = discussionDraft.sourceMessage.id === 'manual'
        ? undefined
        : discussionDraft.sourceMessage.id;

      try {
        await createContextMessage({
          organization_id: organizationId,
          task_id: taskData.id,
          client_id: selectedEntityId, // Crucial for showing linkage in client feed
          context_type: 'TASK_INTERNAL',
          sender_id: currentUser?.id,
          sender_type: 'MEMBER',
          text: messageText,
          is_internal: true,
          linked_message_id: validLinkedMessageId
        });
      } catch (msgError) {
        // Log warning but don't fail the whole operation if just the linking message fails
        console.warn('Failed to create context message for new task:', msgError);
      }

      // Refresh data
      refreshTasks();
      refreshMessages();

      // Update UI state to show the new task
      setDiscussionDraft(null);
      if (taskData && taskData.id) {
        setSelectedTaskId(taskData.id);
      }

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
    <div className="flex h-full w-full relative">
      {/* Left Sidebar Toggle - Thin discrete strip */}
      <button
        onClick={() => setLeftSidebarVisible(!leftSidebarVisible)}
        className={`absolute top-1/2 -translate-y-1/2 z-50 w-4 h-12 flex items-center justify-center bg-slate-100/80 hover:bg-indigo-100 border-y border-r border-slate-200/50 hover:border-indigo-200 rounded-r-md opacity-40 hover:opacity-100 transition-all duration-300 ${leftSidebarVisible ? 'left-[260px]' : 'left-0'
          }`}
        title={leftSidebarVisible ? 'Esconder' : 'Mostrar'}
      >
        <span className={`text-slate-500 text-[10px] font-bold transition-transform ${leftSidebarVisible ? '' : 'rotate-180'}`}>‹</span>
      </button>

      {/* Right Sidebar Toggle - Thin discrete strip */}
      <button
        onClick={() => setRightSidebarVisible(!rightSidebarVisible)}
        className={`absolute top-1/2 -translate-y-1/2 z-50 w-4 h-12 flex items-center justify-center bg-slate-100/80 hover:bg-indigo-100 border-y border-l border-slate-200/50 hover:border-indigo-200 rounded-l-md opacity-40 hover:opacity-100 transition-all duration-300 ${rightSidebarVisible ? '' : 'right-0'
          }`}
        style={rightSidebarVisible ? { right: `${rightSidebarWidth}px` } : undefined}
        title={rightSidebarVisible ? 'Esconder' : 'Mostrar'}
      >
        <span className={`text-slate-500 text-[10px] font-bold transition-transform ${rightSidebarVisible ? '' : 'rotate-180'}`}>›</span>
      </button>

      {/* Left Sidebar - EntityList */}
      <div
        className={`flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${leftSidebarVisible ? 'w-[260px]' : 'w-0'
          }`}
      >
        <div className={`w-[260px] h-full transition-transform duration-300 ${leftSidebarVisible ? 'translate-x-0' : '-translate-x-full'
          }`}>
          <EntityList
            clients={enrichedClients}
            team={enrichedTeam}
            selectedId={selectedEntityId}
            onSelect={setSelectedEntityId}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 min-w-[350px] h-full overflow-hidden">
        <ChatArea
          entity={selectedEntity}
          messages={clientFeedMessages}
          teamMembers={allTeamMembers}
          onSendMessage={(text) => selectedEntity && sendMessage(text, selectedEntity)}
          onInitiateDiscussion={(msg) => setDiscussionDraft({ sourceMessage: msg, mode: 'new' })}
          highlightedMessageId={highlightedMessageId}
          onNavigateToTask={(taskId) => setSelectedTaskId(taskId)}
          linkedTaskMap={linkedTaskMap}
          distortionPositions={distortionPositions}
          setDistortionPositions={setDistortionPositions}
          distortionLabels={distortionLabels}
          setDistortionLabels={setDistortionLabels}
          whatsappStatus={activeWhatsappStatus}
        />
      </div>

      {/* Resizer Handle - Only visible when right sidebar is open */}
      {rightSidebarVisible && (
        <div
          onMouseDown={startResizing}
          className={`w-1.5 h-full cursor-col-resize hover:bg-indigo-400/30 transition-colors flex-shrink-0 z-10 -ml-0.5 border-l border-r border-slate-200 ${isResizing ? 'bg-indigo-400/50' : ''}`}
        />
      )}

      {/* Right Sidebar - TaskManager */}
      <div
        style={{ width: rightSidebarVisible ? `${rightSidebarWidth}px` : '0px' }}
        className="flex-shrink-0 bg-slate-50 h-full overflow-hidden transition-all duration-300 ease-in-out"
      >
        <div
          style={{ width: `${rightSidebarWidth}px` }}
          className={`h-full transition-transform duration-300 ${rightSidebarVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          {selectedEntityId ? (
            <TaskManager
              tasks={tasks}
              allMessages={allWorkspaceMessages}
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
    </div>
  );
};
