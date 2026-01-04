import { BaseRepository } from './BaseRepository';
import { Task } from '../../types';

/**
 * Database representation of Task
 */
interface DBTask {
    id: string;
    organization_id: string;
    title: string;
    status: string;
    priority: string;
    assignee_id?: string;
    assignee_ids?: string[];
    client_id: string;
    tags?: string[];
    description?: string;
    deadline?: string;
    created_at: string;
    checklist?: any;
    archived_at?: string;
}

/**
 * Task Repository
 * 
 * Handles all database operations for tasks.
 */
class TaskRepositoryClass extends BaseRepository<DBTask> {
    constructor() {
        super('tasks');
    }

    /**
     * Map database task to UI Task type
     */
    private mapToTask(dbTask: DBTask): Task {
        return {
            id: dbTask.id,
            title: dbTask.title,
            status: dbTask.status as 'todo' | 'in-progress' | 'review' | 'done',
            priority: dbTask.priority as 'low' | 'medium' | 'high',
            assigneeId: dbTask.assignee_id,
            assigneeIds: dbTask.assignee_ids || (dbTask.assignee_id ? [dbTask.assignee_id] : []),
            clientId: dbTask.client_id,
            tags: dbTask.tags,
            description: dbTask.description,
            deadline: dbTask.deadline,
            createdAt: new Date(dbTask.created_at),
            checklist: dbTask.checklist || [],
            archivedAt: dbTask.archived_at ? new Date(dbTask.archived_at) : undefined
        };
    }

    /**
     * Create a new task (UI Friendly)
     */
    async createNewTask(payload: Partial<DBTask>): Promise<Task> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('Error creating task:', error);
            throw new Error('Failed to create task');
        }

        return this.mapToTask(data);
    }

    /**
     * Update task details (polymorphic)
     */
    async updateDetails(id: string, updates: Partial<Task>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.priority) dbUpdates.priority = updates.priority;
        if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
        if (updates.assigneeIds !== undefined) dbUpdates.assignee_ids = updates.assigneeIds;
        if (updates.tags) dbUpdates.tags = updates.tags;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
        if (updates.checklist) dbUpdates.checklist = updates.checklist;
        if (updates.archivedAt !== undefined) dbUpdates.archived_at = updates.archivedAt?.toISOString();

        const { error } = await this.supabase
            .from(this.tableName)
            .update(dbUpdates)
            .eq('id', id);

        if (error) {
            console.error('Error updating task details:', error);
            throw new Error('Failed to update task');
        }
    }

    /**
     * Find all tasks for an organization
     */
    async findByOrganization(organizationId: string, includeArchived: boolean = false): Promise<Task[]> {
        let query = this.supabase
            .from(this.tableName)
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (!includeArchived) {
            query = query.is('archived_at', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }

        return (data || []).map(task => this.mapToTask(task));
    }

    /**
     * Find tasks by client
     */
    async findByClient(clientId: string, includeArchived: boolean = false): Promise<Task[]> {
        let query = this.supabase
            .from(this.tableName)
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (!includeArchived) {
            query = query.is('archived_at', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching tasks by client:', error);
            return [];
        }

        return (data || []).map(task => this.mapToTask(task));
    }

    /**
     * Find tasks by assignee
     */
    async findByAssignee(assigneeId: string, includeArchived: boolean = false): Promise<Task[]> {
        let query = this.supabase
            .from(this.tableName)
            .select('*')
            .contains('assignee_ids', [assigneeId])
            .order('created_at', { ascending: false });

        if (!includeArchived) {
            query = query.is('archived_at', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching tasks by assignee:', error);
            return [];
        }

        return (data || []).map(task => this.mapToTask(task));
    }

    /**
     * Archive a task
     */
    async archive(id: string): Promise<void> {
        await this.updateDetails(id, { archivedAt: new Date() });
    }

    /**
     * Unarchive a task
     */
    async unarchive(id: string): Promise<void> {
        await this.updateDetails(id, { archivedAt: undefined });
    }

    /**
     * Update task status
     */
    async updateStatus(id: string, status: 'todo' | 'in-progress' | 'review' | 'done'): Promise<void> {
        await this.updateDetails(id, { status });
    }
}

// Export singleton instance
export const TaskRepository = new TaskRepositoryClass();
