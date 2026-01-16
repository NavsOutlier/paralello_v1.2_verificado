/**
 * Common Types
 * 
 * Shared types used across multiple domains.
 */

/**
 * View State Enum
 */
export enum ViewState {
    DASHBOARD = 'dashboard',
    WORKSPACE = 'workspace',
    KANBAN = 'kanban',
    MANAGER = 'manager',
    SUPERADMIN = 'superadmin',
    UPDATE_PASSWORD = 'update_password',
    MARKETING = 'marketing'
}

/**
 * Generic User Type (legacy)
 */
export interface User {
    id: string;
    name: string;
    avatar: string;
    role: 'client' | 'team';
    jobTitle?: string;
    unreadCount?: number;
    lastMessage?: string;
    assignedClientIds?: string[];
    whatsappGroupId?: string;
}

/**
 * Checklist Item
 */
export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

/**
 * Checklist Template
 */
export interface ChecklistTemplate {
    id: string;
    name: string;
    items: ChecklistItem[];
    organizationId?: string;
    createdAt?: string;
}
