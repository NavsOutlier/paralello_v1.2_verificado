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
    assignedClientIds?: string[];
    whatsappGroupId?: string;
}

export interface Message {
    id: string;
    channelId?: string;
    contextType: 'WHATSAPP_FEED' | 'TASK_INTERNAL' | 'DIRECT_MESSAGE';
    taskId?: string;
    clientId?: string;
    dmChannelId?: string;
    senderType: 'CLIENT' | 'MEMBER';
    senderId: string;
    text: string;
    timestamp: Date;
    isInternal?: boolean;
    linkedMessageId?: string;
    direction?: 'inbound' | 'outbound';
    uazapiId?: string;
}

export interface Task {
    id: string;
    title: string;
    status: 'todo' | 'in-progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high';
    assigneeId?: string;
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
    onboardingStatus?: {
        isOwnerInvited: boolean;
        isOwnerActive: boolean;
        isWhatsAppConnected: boolean;
    };
}

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
    status: 'connected' | 'conectado' | 'disconnected' | 'desconectado' | 'connecting' | 'error' | 'waiting_scan';
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
