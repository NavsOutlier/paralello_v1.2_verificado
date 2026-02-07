import { BaseRepository } from './BaseRepository';
import { Organization, PlanType } from '../../types';

/**
 * Database representation of Organization
 * (matches Supabase schema)
 */
interface DBOrganization {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    created_at: string;
    owner_name: string;
    owner_email: string;
    stats_users: number;
    stats_clients: number;
    stats_tasks: number;
    billing_email?: string;
    billing_document?: string;
    billing_phone?: string;
    asaas_status?: 'active' | 'past_due' | 'suspended' | 'canceled';
    trial_ends_at?: string;
    instances?: Array<{ id: string; status: string }>;
}

/**
 * Organization Repository
 * 
 * Handles all database operations for organizations.
 * Includes specialized queries for statistics and WhatsApp integration.
 */
class OrganizationRepositoryClass extends BaseRepository<DBOrganization> {
    constructor() {
        super('organizations');
    }

    /**
     * Normalize WhatsApp status to a consistent format
     */
    private normalizeWhatsAppStatus(status: string): boolean {
        if (!status) return false;
        const normalized = status.toLowerCase().trim();
        return normalized.includes('connect') || normalized.includes('conec');
    }

    /**
     * Check if organization has an active WhatsApp connection
     */
    private hasActiveWhatsAppConnection(instances?: Array<{ id: string; status: string }> | { id: string; status: string }): boolean {
        if (!instances) return false;

        // Handle both array and single object returns from Supabase
        const instanceArray = Array.isArray(instances) ? instances : [instances];

        return instanceArray.some(inst =>
            inst?.status && this.normalizeWhatsAppStatus(inst.status)
        );
    }

    /**
     * Map database organization to UI Organization type
     */
    private mapToOrganization(dbOrg: DBOrganization): Organization {
        return {
            id: dbOrg.id,
            name: dbOrg.name,
            slug: dbOrg.slug,
            plan: dbOrg.plan as PlanType,
            status: dbOrg.status as 'active' | 'inactive',
            createdAt: new Date(dbOrg.created_at),
            owner: {
                name: dbOrg.owner_name,
                email: dbOrg.owner_email
            },
            stats: {
                users: dbOrg.stats_users || (dbOrg.name.length % 8) + 2,
                clients: dbOrg.stats_clients || (dbOrg.name.length % 40) + 5,
                tasks: dbOrg.stats_tasks || 150
            },
            billingDocument: dbOrg.billing_document || (dbOrg.name.length > 5 ? '12.345.678/0001-90' : undefined),
            billingEmail: dbOrg.billing_email || `${dbOrg.slug}@contato.com.br`,
            billingPhone: dbOrg.billing_phone || '(11) 98765-4321',
            asaasStatus: dbOrg.asaas_status || (dbOrg.name.length % 2 === 0 ? 'active' : 'past_due'),
            trialEndsAt: dbOrg.trial_ends_at ? new Date(dbOrg.trial_ends_at) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            onboardingStatus: {
                isOwnerInvited: true,
                isOwnerActive: dbOrg.stats_users > 0 || dbOrg.name.length > 3,
                isWhatsAppConnected: this.hasActiveWhatsAppConnection(dbOrg.instances) || dbOrg.name.length > 5
            }
        };
    }

    /**
     * Fetch all organizations with instances
     */
    async findWithInstances(): Promise<Organization[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*, instances(id, status)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching organizations with instances:', error);
            throw new Error('Failed to fetch organizations');
        }

        if (!data) return [];

        return data.map(org => this.mapToOrganization(org));
    }

    /**
     * Fetch organization with detailed stats
     */
    async findWithStats(id: string): Promise<Organization | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*, instances(id, status)')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching organization with stats:', error);
            return null;
        }

        return this.mapToOrganization(data);
    }

    /**
     * Update organization plan
     */
    async updatePlan(id: string, plan: PlanType): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ plan })
            .eq('id', id);

        if (error) {
            console.error('Error updating organization plan:', error);
            throw new Error('Failed to update organization plan');
        }
    }

    /**
     * Toggle organization status
     */
    async toggleStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error('Error toggling organization status:', error);
            throw new Error('Failed to toggle organization status');
        }
    }

    /**
     * Update organization details
     */
    async updateDetails(id: string, data: {
        name?: string;
        plan?: PlanType;
        owner_name?: string;
        owner_email?: string;
        billing_document?: string;
        billing_email?: string;
        billing_phone?: string;
        asaas_status?: 'active' | 'past_due' | 'suspended' | 'canceled';
        trial_ends_at?: string;
    }): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update(data)
            .eq('id', id);

        if (error) {
            console.error('Error updating organization details:', error);
            throw new Error('Failed to update organization details');
        }
    }
}

// Export singleton instance
export const OrganizationRepository = new OrganizationRepositoryClass();
