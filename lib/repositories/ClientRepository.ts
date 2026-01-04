import { BaseRepository } from './BaseRepository';
import { Client } from '../../types';

/**
 * Database representation of Client
 */
interface DBClient {
    id: string;
    organization_id: string;
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    avatar_url?: string;
    status: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    whatsapp_group_id?: string;
    deleted_at?: string;
}

/**
 * Client Repository
 * 
 * Handles all database operations for clients.
 */
class ClientRepositoryClass extends BaseRepository<DBClient> {
    constructor() {
        super('clients');
    }

    /**
     * Map database client to UI Client type
     */
    private mapToClient(dbClient: DBClient): Client {
        return {
            id: dbClient.id,
            organizationId: dbClient.organization_id,
            name: dbClient.name,
            email: dbClient.email,
            phone: dbClient.phone,
            whatsapp: dbClient.whatsapp,
            avatarUrl: dbClient.avatar_url,
            status: dbClient.status as 'active' | 'inactive',
            notes: dbClient.notes,
            createdAt: new Date(dbClient.created_at),
            updatedAt: new Date(dbClient.updated_at),
            whatsappGroupId: dbClient.whatsapp_group_id
        };
    }

    /**
     * Find all clients for an organization
     */
    async findByOrganization(organizationId: string, includeDeleted: boolean = false): Promise<Client[]> {
        let query = this.supabase
            .from(this.tableName)
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (!includeDeleted) {
            query = query.is('deleted_at', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching clients:', error);
            return [];
        }

        return (data || []).map(client => this.mapToClient(client));
    }

    /**
     * Soft delete a client
     */
    async softDelete(id: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Error soft deleting client:', error);
            throw new Error('Failed to delete client');
        }
    }

    /**
     * Restore a soft-deleted client
     */
    async restore(id: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ deleted_at: null })
            .eq('id', id);

        if (error) {
            console.error('Error restoring client:', error);
            throw new Error('Failed to restore client');
        }
    }

    /**
     * Update client status
     */
    async updateStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Error updating client status:', error);
            throw new Error('Failed to update client status');
        }
    }
}

// Export singleton instance
export const ClientRepository = new ClientRepositoryClass();
