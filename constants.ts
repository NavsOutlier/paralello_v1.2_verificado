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
  // Client C1 Chat History (Channel ID = c1)
  { id: 'm1', channelId: 'c1', senderId: 'c1', text: 'Olá, bom dia! Tudo bem?', timestamp: new Date(Date.now() - 10000000), isInternal: false },
  { id: 'm2', channelId: 'c1', senderId: 'me', text: 'Bom dia! Tudo certo por aqui. Como posso ajudar?', timestamp: new Date(Date.now() - 9000000), isInternal: false },
  { id: 'm3', channelId: 'c1', senderId: 'c1', text: 'Estava olhando a campanha nova, acho que a cor do botão está errada.', timestamp: new Date(Date.now() - 8000000), isInternal: false },
  { id: 'm4', channelId: 'c1', senderId: 't1', text: 'Eu verifiquei aqui, seguimos o brandbook v2.', timestamp: new Date(Date.now() - 7000000), isInternal: true }, // Internal note inside client chat
  { id: 'm5', channelId: 'c1', senderId: 'c1', text: 'Ah, entendi. Mas vamos testar o laranja?', timestamp: new Date(Date.now() - 600000), isInternal: false },

  // Task 1 Internal Chat History (Channel ID = task1)
  { id: 'tm1', channelId: 'task1', senderId: 'me', text: 'Criado a partir da solicitação do cliente sobre o botão.', timestamp: new Date(), isInternal: true, linkedMessageId: 'm3' }
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