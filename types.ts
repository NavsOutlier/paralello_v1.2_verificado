export enum ViewState {
  DASHBOARD = 'dashboard',
  WORKSPACE = 'workspace',
  KANBAN = 'kanban',
  MANAGER = 'manager',
  SUPERADMIN = 'superadmin',
  UPDATE_PASSWORD = 'update_password'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'client' | 'team';
  status: 'online' | 'offline' | 'busy';
  jobTitle?: string;
  unreadCount?: number;
  lastMessage?: string;
  assignedClientIds?: string[]; // IDs of clients this team member is assigned to
  whatsappGroupId?: string;
}

// Unified Message Type (The "Single Table" approach)
// Unified Message Type (The "Single Table" approach)
export interface Message {
  id: string;

  // Channel-based routing (used for filtering messages by context)
  channelId?: string;     // Can be clientId, taskId, or dmChannelId depending on context

  // Polymorphic Foreign Keys (Only one should be set)
  contextType: 'WHATSAPP_FEED' | 'TASK_INTERNAL' | 'DIRECT_MESSAGE';
  taskId?: string;        // Used if contextType === 'TASK_INTERNAL'
  clientId?: string;      // Used if contextType === 'WHATSAPP_FEED'
  dmChannelId?: string;   // Used if contextType === 'DIRECT_MESSAGE'

  senderType: 'CLIENT' | 'MEMBER';
  senderId: string; // Points to Profile ID (merged user/client)

  text: string;
  timestamp: Date;

  // Metadata
  isInternal?: boolean;   // Whether this is an internal team message
  linkedMessageId?: string; // Points to another message ID
  direction?: 'inbound' | 'outbound';
  uazapiId?: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string; // Deprecated, use assigneeIds
  assigneeIds?: string[];
  clientId: string;
  tags?: string[];
  description?: string;
  deadline?: string;
  createdAt: Date;
  checklist?: ChecklistItem[];
  archivedAt?: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: ChecklistItem[];
  organizationId?: string;
  createdAt?: string;
}

export interface DiscussionDraft {
  sourceMessage: Message;
  mode: 'new' | 'attach';
}

// Super Admin Types
export enum PlanType {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export interface Plan {
  id: PlanType;
  name: string;
  price: number;
  maxUsers: number;
  maxClients: number;
  features: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  status: 'active' | 'inactive';
  createdAt: Date;
  owner: {
    name: string;
    email: string;
  };
  stats: {
    users: number;
    clients: number;
    tasks: number;
  };
}

// Manager Types
export interface Client {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  whatsappGroupId?: string;
}

export interface WhatsAppInstance {
  id: string;
  organizationId: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'waiting_scan';
  qrCode?: string;
  instanceApiId?: string;
  instanceApiToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppMessage {
  id: string;
  instanceId: string;
  remoteJid: string;
  direction: 'inbound' | 'outbound';
  content: string;
  status: string;
  uazapiId?: string;
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  organizationId: string;
  profileId: string;
  profile?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  role: 'manager' | 'member' | 'viewer';
  permissions: {
    canManageClients: boolean;
    canManageTasks: boolean;
    canManageTeam: boolean;
  };
  jobTitle?: string;
  status: 'active' | 'inactive' | 'pending';
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}