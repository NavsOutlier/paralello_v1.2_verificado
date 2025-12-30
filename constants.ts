import { User, Message, Task } from './types';

export const CURRENT_USER_ID = 'me';

export const CLIENTS: User[] = [
  { id: 'c1', name: 'TechSolutions Inc', avatar: 'https://picsum.photos/40/40?random=1', role: 'client', status: 'online', unreadCount: 2, lastMessage: 'Precisamos ajustar o banner.' },
  { id: 'c2', name: 'Bakery Fresh', avatar: 'https://picsum.photos/40/40?random=2', role: 'client', status: 'offline', unreadCount: 0, lastMessage: 'Obrigado pelo envio!' },
  { id: 'c3', name: 'Studio Alpha', avatar: 'https://picsum.photos/40/40?random=3', role: 'client', status: 'busy', unreadCount: 5, lastMessage: 'Quando fica pronto?' },
];

export const TEAM: User[] = [
  { id: 't1', name: 'Ana Silva (Design)', avatar: 'https://picsum.photos/40/40?random=4', role: 'team', status: 'online' },
  { id: 't2', name: 'Carlos Dev', avatar: 'https://picsum.photos/40/40?random=5', role: 'team', status: 'busy' },
];

// Single "Table" of messages
export const INITIAL_MESSAGES: Message[] = [
  // Client C1 Chat History (Context: WhatsApp Feed, Client: c1)
  {
    id: 'm1',
    contextType: 'WHATSAPP_FEED',
    clientId: 'c1',
    senderType: 'CLIENT',
    senderId: 'c1',
    text: 'Olá, bom dia! Tudo bem?',
    timestamp: new Date(Date.now() - 10000000)
  },
  {
    id: 'm2',
    contextType: 'WHATSAPP_FEED',
    clientId: 'c1',
    senderType: 'MEMBER',
    senderId: 'me',
    text: 'Bom dia! Tudo certo por aqui. Como posso ajudar?',
    timestamp: new Date(Date.now() - 9000000)
  },
  {
    id: 'm3',
    contextType: 'WHATSAPP_FEED',
    clientId: 'c1',
    senderType: 'CLIENT',
    senderId: 'c1',
    text: 'Estava olhando a campanha nova, acho que a cor do botão está errada.',
    timestamp: new Date(Date.now() - 8000000)
  },
  {
    id: 'm5',
    contextType: 'WHATSAPP_FEED',
    clientId: 'c1',
    senderType: 'CLIENT',
    senderId: 'c1',
    text: 'Ah, entendi. Mas vamos testar o laranja?',
    timestamp: new Date(Date.now() - 600000)
  },

  // Task 1 Internal Chat History (Context: Task Internal, Task: task1)
  {
    id: 'tm1',
    contextType: 'TASK_INTERNAL',
    taskId: 'task1',
    senderType: 'MEMBER',
    senderId: 'me',
    text: 'Criado a partir da solicitação do cliente sobre o botão.',
    timestamp: new Date(),
    linkedMessageId: 'm3'
  },
  // Note: Message 'm4' from previous mock was an internal note in client chat. 
  // In new schema, internal notes on clients might be TASK_INTERNAL or separate context. 
  // For now, assuming task discussion covers internal context.
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task1',
    title: 'Ajuste de Cores - Landing Page',
    status: 'in-progress',
    priority: 'high',
    clientId: 'c1',
    assigneeId: 't1',
    createdAt: new Date(),
  }
];