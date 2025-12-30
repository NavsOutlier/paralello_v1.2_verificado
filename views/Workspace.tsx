import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, MoreVertical, Plus, MessageSquarePlus, CornerDownRight, CheckCircle2 } from 'lucide-react';
import { CLIENTS, TEAM, INITIAL_MESSAGES, INITIAL_TASKS, CURRENT_USER_ID } from '../constants';
import { User, Message, Task, DiscussionDraft } from '../types';
import { MessageBubble } from '../components/MessageBubble';
import { EntityList } from '../components/EntityList';

// ==================================================================================
// COLUMN 3: CHAT AREA
// ==================================================================================
const ChatArea: React.FC<{
  entity: User | null;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onInitiateDiscussion: (msg: Message) => void;
  highlightedMessageId: string | null;
}> = ({ entity, messages, onSendMessage, onInitiateDiscussion, highlightedMessageId }) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (highlightedMessageId && messageRefs.current[highlightedMessageId]) {
      messageRefs.current[highlightedMessageId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageRefs.current[highlightedMessageId]?.classList.add('ring-2', 'ring-yellow-400', 'ring-offset-2');
      setTimeout(() => {
        messageRefs.current[highlightedMessageId]?.classList.remove('ring-2', 'ring-yellow-400', 'ring-offset-2');
      }, 2000);
    }
  }, [highlightedMessageId]);

  if (!entity) return <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">Selecione um contato</div>;

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative">
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <img src={entity.avatar} className="w-9 h-9 rounded-full" alt="" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">{entity.name}</h3>
            <p className="text-xs text-slate-500 flex items-center">
              {entity.role === 'client' ? 'WhatsApp Business' : 'Chat Interno'} • {entity.status}
            </p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-5 h-5" /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id}
            msg={msg}
            isMe={msg.senderId === CURRENT_USER_ID}
            senderName={msg.senderId === entity.id ? entity.name : 'Team Member'}
            onInitiateDiscussion={onInitiateDiscussion}
            messageRef={(el) => messageRefs.current[msg.id] = el}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center space-x-4">
          <button className="text-slate-400 hover:text-slate-600"><Paperclip className="w-5 h-5" /></button>
          <input
            type="text"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="Digite uma mensagem..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter') { onSendMessage(text); setText(''); } }}
          />
          <button 
            onClick={() => { onSendMessage(text); setText(''); }}
            className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================================================================================
// COLUMN 4: TASK MANAGER (RIGHT BAR)
// ==================================================================================

const TaskCard: React.FC<{ task: Task, messageCount: number, onClick: () => void }> = ({ task, messageCount, onClick }) => (
  <div onClick={onClick} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-3 cursor-pointer hover:border-indigo-300 transition-all">
    <div className="flex justify-between items-start mb-2">
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
        task.status === 'done' ? 'bg-green-100 text-green-700' : 
        task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
      }`}>
        {task.status}
      </span>
      <span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-green-500'}`} />
    </div>
    <h4 className="text-sm font-semibold text-slate-800 leading-tight mb-2">{task.title}</h4>
    <div className="flex justify-between items-center text-xs text-slate-500">
      <span className="flex items-center"><MessageSquarePlus className="w-3 h-3 mr-1" /> {messageCount}</span>
      <span>{task.createdAt.toLocaleDateString()}</span>
    </div>
  </div>
);

const TaskDetail: React.FC<{ 
  task: Task; 
  messages: Message[];
  onBack: () => void;
  onNavigateToMessage: (msgId: string) => void;
  onAddComment: (text: string) => void;
}> = ({ task, messages, onBack, onNavigateToMessage, onAddComment }) => {
  const [comment, setComment] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="h-14 flex items-center px-4 bg-white border-b border-slate-200">
        <button onClick={onBack} className="mr-3 text-slate-500 hover:text-indigo-600">
          <CornerDownRight className="w-5 h-5 rotate-180" />
        </button>
        <span className="text-sm font-bold text-slate-800 truncate">Detalhes da Tarefa</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-2">{task.title}</h2>
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase font-bold">{task.status}</span>
            <span className="text-xs text-slate-400">ID: {task.id}</span>
          </div>
        </div>

        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Chat da Tarefa</h3>
        <div className="space-y-3 mb-6">
          {messages.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma mensagem nesta tarefa.</p>}
          {messages.map((msg) => (
             <MessageBubble 
               key={msg.id}
               msg={msg}
               isMe={msg.senderId === CURRENT_USER_ID}
               senderName={TEAM.find(t=>t.id === msg.senderId)?.name || 'Membro'}
               onNavigateToLinked={onNavigateToMessage}
             />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex flex-col space-y-2">
          <textarea
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-20"
            placeholder="Escreva uma atualização..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddComment(comment); setComment(''); }}}
          />
          <button 
            onClick={() => { if(comment) { onAddComment(comment); setComment(''); } }}
            className="self-end bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskCreation: React.FC<{
  draft: DiscussionDraft;
  existingTasks: Task[];
  onCancel: () => void;
  onCreate: (title: string, priority: 'low'|'medium'|'high') => void;
  onAttach: (taskId: string) => void;
}> = ({ draft, existingTasks, onCancel, onCreate, onAttach }) => {
  const [mode, setMode] = useState<'create' | 'attach'>('create');
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="h-14 flex items-center px-4 bg-indigo-600 text-white shadow-sm">
        <button onClick={onCancel} className="mr-3 hover:bg-white/10 p-1 rounded">
          <CornerDownRight className="w-5 h-5 rotate-180" />
        </button>
        <span className="text-sm font-bold">Discussão Interna</span>
      </div>

      <div className="p-4 bg-yellow-50 border-b border-yellow-100">
        <span className="text-xs font-bold text-yellow-700 uppercase">Mensagem Selecionada</span>
        <p className="text-sm text-slate-700 mt-1 italic line-clamp-3">"{draft.sourceMessage.text}"</p>
      </div>

      <div className="flex p-2 m-4 bg-slate-200 rounded-lg">
        <button 
          onClick={() => setMode('create')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          Nova Tarefa
        </button>
        <button 
          onClick={() => setMode('attach')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'attach' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          Anexar Existente
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {mode === 'create' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Título da Tarefa</label>
              <input 
                autoFocus
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Ex: Ajustar campanha..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Prioridade</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <button 
              disabled={!newTitle}
              onClick={() => onCreate(newTitle, priority)}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              Criar Tarefa
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 mb-2">Selecione uma tarefa para vincular esta mensagem:</p>
            {existingTasks.map(t => (
              <div 
                key={t.id} 
                onClick={() => onAttach(t.id)}
                className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-500 group"
              >
                <h5 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">{t.title}</h5>
                <span className="text-xs text-slate-400">{t.status}</span>
              </div>
            ))}
            {existingTasks.length === 0 && <p className="text-sm text-slate-400 text-center mt-4">Nenhuma tarefa encontrada.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const TaskManager: React.FC<{
  tasks: Task[];
  allMessages: Message[];
  discussionDraft: DiscussionDraft | null;
  onCancelDraft: () => void;
  onCreateTaskFromDraft: (title: string, priority: 'low'|'medium'|'high') => void;
  onAttachTaskFromDraft: (taskId: string) => void;
  onNavigateToMessage: (id: string) => void;
  onAddTaskComment: (taskId: string, text: string) => void;
}> = (props) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (props.discussionDraft) {
    return <TaskCreation 
      draft={props.discussionDraft} 
      existingTasks={props.tasks} 
      onCancel={props.onCancelDraft}
      onCreate={props.onCreateTaskFromDraft}
      onAttach={props.onAttachTaskFromDraft}
    />;
  }

  if (selectedTask) {
    // Filter messages for this task specifically
    const taskMessages = props.allMessages.filter(m => m.channelId === selectedTask.id);
    
    return <TaskDetail 
      task={selectedTask} 
      messages={taskMessages}
      onBack={() => setSelectedTask(null)} 
      onNavigateToMessage={props.onNavigateToMessage}
      onAddComment={(text) => props.onAddTaskComment(selectedTask.id, text)}
    />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
      <div className="h-16 flex items-center justify-between px-4 bg-white border-b border-slate-200">
        <h3 className="font-bold text-slate-800">Tarefas</h3>
        <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {props.tasks.length === 0 ? (
          <div className="text-center mt-10 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma tarefa aberta para este cliente.</p>
          </div>
        ) : (
          props.tasks.map(t => {
            const count = props.allMessages.filter(m => m.channelId === t.id).length;
            return <TaskCard key={t.id} task={t} messageCount={count} onClick={() => setSelectedTask(t)} />
          })
        )}
      </div>
    </div>
  );
};


// ==================================================================================
// MAIN WORKSPACE COMPONENT
// ==================================================================================
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
      senderId: CURRENT_USER_ID,
      text,
      timestamp: new Date(),
      isInternal: false
    };

    setAllMessages(prev => [...prev, newMsg]);
  };

  const handleCreateTask = (title: string, priority: 'low'|'medium'|'high') => {
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
      senderId: CURRENT_USER_ID,
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
      senderId: CURRENT_USER_ID,
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
      senderId: CURRENT_USER_ID,
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