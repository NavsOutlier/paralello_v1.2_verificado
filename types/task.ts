/**
 * Task Domain Types
 */

import { ChecklistItem } from './common';

/**
 * Task Interface
 */
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
