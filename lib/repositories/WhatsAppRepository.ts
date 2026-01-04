import { BaseRepository } from './BaseRepository';
import { WhatsAppInstance } from '../../types';

/**
 * Database representation of WhatsApp Instance
 */
interface DBWhatsAppInstance {
    id: string;
    organization_id: string;
    name: string;
    status: string;
    qr_code?: string;
    instance_api_id?: string;
    instance_api_token?: string;
    created_at: string;
    updated_at: string;
}

/**
 * WhatsApp Instance Repository
 * 
 * Handles all database operations for WhatsApp instances.
 * Includes automatic status normalization.
 */
class WhatsAppRepositoryClass extends BaseRepository<DBWhatsAppInstance> {
    constructor() {
        super('instances');
    }

    /**
     * Normalize status to handle both 'connected' and 'conectado'
     */
    private normalizeStatus(status: string): WhatsAppInstance['status'] {
        const normalized = status.toLowerCase().trim();

        if (normalized.includes('connect') || normalized.includes('conec')) {
            return 'connected';
        }
        if (normalized.includes('disconnect') || normalized.includes('desconec')) {
            return 'disconnected';
        }
        if (normalized === 'connecting') {
            return 'connecting';
        }
        if (normalized === 'error') {
            return 'error';
        }
        if (normalized === 'waiting_scan') {
            return 'waiting_scan';
        }

        return 'disconnected'; // Default fallback
    }

    /**
     * Map database instance to UI WhatsAppInstance type
     */
    private mapToWhatsAppInstance(dbInstance: DBWhatsAppInstance): WhatsAppInstance {
        return {
            id: dbInstance.id,
            organizationId: dbInstance.organization_id,
            name: dbInstance.name,
            status: this.normalizeStatus(dbInstance.status),
            qrCode: dbInstance.qr_code,
            instanceApiId: dbInstance.instance_api_id,
            instanceApiToken: dbInstance.instance_api_token,
            createdAt: new Date(dbInstance.created_at),
            updatedAt: new Date(dbInstance.updated_at)
        };
    }

    /**
     * Find all instances for an organization
     */
    async findByOrganization(organizationId: string): Promise<WhatsAppInstance[]> {
        const instances = await this.findAll({ organization_id: organizationId });
        return instances.map(inst => this.mapToWhatsAppInstance(inst));
    }

    /**
     * Find the first active (connected) instance for an organization
     */
    async findActiveInstance(organizationId: string): Promise<WhatsAppInstance | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
            return null;
        }

        // Find first connected instance
        const activeInstance = data.find(inst => {
            const normalized = inst.status?.toLowerCase().trim() || '';
            return normalized.includes('connect') || normalized.includes('conec');
        });

        if (!activeInstance) {
            return null;
        }

        return this.mapToWhatsAppInstance(activeInstance);
    }

    /**
     * Update instance status
     */
    async updateStatus(id: string, status: string, qrCode?: string): Promise<void> {
        const updateData: any = { status, updated_at: new Date().toISOString() };

        if (qrCode !== undefined) {
            updateData.qr_code = qrCode;
        }

        const { error } = await this.supabase
            .from(this.tableName)
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('Error updating WhatsApp instance status:', error);
            throw new Error('Failed to update instance status');
        }
    }

    /**
     * Check if an organization has an active WhatsApp connection
     */
    async hasActiveConnection(organizationId: string): Promise<boolean> {
        const activeInstance = await this.findActiveInstance(organizationId);
        return activeInstance !== null;
    }
}

// Export singleton instance
export const WhatsAppRepository = new WhatsAppRepositoryClass();
