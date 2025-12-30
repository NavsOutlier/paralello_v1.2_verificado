import React, { useState } from 'react';
import { CLIENTS, TEAM, INITIAL_MESSAGES, INITIAL_TASKS } from '../constants';
import { Message, Task, DiscussionDraft } from '../types';
import { EntityList } from '../components/EntityList';
import { ChatArea, TaskManager } from '../components/workspace';

export const Workspace: React.FC = () => {
  const [selectedEntityId, setSelectedEntityId] = useState<string>('c1');
  const [allMessages, setAllMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [allTasks, setAllTasks] = useState<Task[]>(INITIAL_TASKS);

  // Interaction State
  const [discussionDraft, setDiscussionDraft] = useState<DiscussionDraft | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const selectedEntity = CLIENTS.find(c => c.id === selectedEntityId) || TEAM.find(t => t.id === selectedEntityId) || null;

  // Derived state based on the "Channel ID" pattern
  const currentChatMessages = allMessages.filter(m => m.channelId === selectedEntityId);
  const currentEntityTasks = allTasks.filter(t => t.clientId === selectedEntityId);

  const handleSendMessage = (text: string) => {
    if (!selectedEntityId || !text.trim()) return;

    const newMsg: Message = {
      id: `m${Date.now()}`,
      channelId: selectedEntityId, // Linked to the Client Channel
      contextType: 'WHATSAPP_FEED',
      senderId: 'current-user-id',
      senderType: 'MEMBER',
      text,
      timestamp: new Date(),
      isInternal: false
    };

    setAllMessages(prev => [...prev, newMsg]);
  };

  const handleCreateTask = (title: string, priority: 'low' | 'medium' | 'high') => {
    if (!selectedEntityId || !discussionDraft) return;

    const newTaskId = `t${Date.now()}`;
    const newTask: Task = {
      id: newTaskId,
      title,
      status: 'todo',
      priority,
      clientId: selectedEntityId,
      createdAt: new Date(),
    };

    // Create the first message in the Task Channel (which links back to the original message)
    const newContextMsg: Message = {
      id: `tm${Date.now()}`,
      channelId: newTaskId, // Linked to the Task Channel
      contextType: 'TASK_INTERNAL',
      senderId: 'current-user-id',
      senderType: 'MEMBER',
      text: `Tarefa criada a partir da mensagem: "${discussionDraft.sourceMessage.text.substring(0, 30)}..."`,
      timestamp: new Date(),
      isInternal: true,
      linkedMessageId: discussionDraft.sourceMessage.id
    };

    setAllTasks(prev => [...prev, newTask]);
    setAllMessages(prev => [...prev, newContextMsg]);
    setDiscussionDraft(null);
  };

  const handleAttachTask = (taskId: string) => {
    if (!discussionDraft) return;

    const newContextMsg: Message = {
      id: `tm${Date.now()}`,
      channelId: taskId, // Linked to the Task Channel
      contextType: 'TASK_INTERNAL',
      senderId: 'current-user-id',
      senderType: 'MEMBER',
      text: `Mensagem adicionada à discussão: "${discussionDraft.sourceMessage.text}"`,
      timestamp: new Date(),
      isInternal: true,
      linkedMessageId: discussionDraft.sourceMessage.id
    };

    setAllMessages(prev => [...prev, newContextMsg]);
    setDiscussionDraft(null);
  };

  const handleAddTaskComment = (taskId: string, text: string) => {
    const newMsg: Message = {
      id: `tm${Date.now()}`,
      channelId: taskId, // Linked to the Task Channel
      contextType: 'TASK_INTERNAL',
      senderId: 'current-user-id',
      senderType: 'MEMBER',
      text,
      timestamp: new Date(),
      isInternal: true
    };
    setAllMessages(prev => [...prev, newMsg]);
  };

  return (
    <div className="flex h-full w-full">
      <div className="w-[280px] flex-shrink-0">
        <EntityList
          clients={CLIENTS}
          team={TEAM}
          selectedId={selectedEntityId}
          onSelect={setSelectedEntityId}
        />
      </div>

      <div className="flex-1 border-r border-slate-200 min-w-[350px]">
        <ChatArea
          entity={selectedEntity}
          messages={currentChatMessages}
          onSendMessage={handleSendMessage}
          onInitiateDiscussion={(msg) => setDiscussionDraft({ sourceMessage: msg, mode: 'new' })}
          highlightedMessageId={highlightedMessageId}
        />
      </div>

      <div className="w-[350px] flex-shrink-0 bg-slate-50">
        {selectedEntityId ? (
          <TaskManager
            tasks={currentEntityTasks}
            allMessages={allMessages} // Pass all messages so task detail can filter by its own ID
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