export enum ViewState {
  DASHBOARD = 'dashboard',
  WORKSPACE = 'workspace',
  KANBAN = 'kanban',
  MANAGER = 'manager'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'client' | 'team';
  status: 'online' | 'offline' | 'busy';
  unreadCount?: number;
  lastMessage?: string;
}

// Unified Message Type (The "Single Table" approach)
export interface Message {
  id: string;
  channelId: string; // Can be a ClientID (WhatsApp), TaskID (Internal), or DM ID
  senderId: string;
  text: string;
  timestamp: Date;
  isInternal: boolean; // Visual flag (yellow bubble)
  
  // Metadata for linking contexts
  linkedMessageId?: string; // Points to another message ID (e.g. quoting a client msg inside a task)
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;
  clientId: string; 
  // removed 'relatedMessages' array. We now query messages where channelId === taskId
  createdAt: Date;
}

export interface DiscussionDraft {
  sourceMessage: Message;
  mode: 'new' | 'attach';
}