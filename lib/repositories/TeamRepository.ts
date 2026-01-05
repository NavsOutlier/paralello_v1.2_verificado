import { BaseRepository } from './BaseRepository';
import { TeamMember } from '../../types';

/**
 * Database representation of Team Member join with Profile
 */
interface DBTeamMember {
    id: string;
    organization_id: string;
    profile_id: string;
    role: 'manager' | 'member' | 'viewer';
    job_title?: string;
    status: 'active' | 'inactive' | 'pending';
    invited_by?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    profile?: {
        name: string;
        email: string;
        avatar?: string;
    };
}

/**
 * Team Repository
 * 
 * Handles all operations related to team members and their profiles.
 */
class TeamRepositoryClass extends BaseRepository<DBTeamMember> {
    constructor() {
        super('team_members');
    }

    /**
     * Map database team member to UI TeamMember type
     */
    private mapToTeamMember(db: DBTeamMember): TeamMember {
        return {
            id: db.id,
            organizationId: db.organization_id,
            profileId: db.profile_id,
            role: db.role,
            jobTitle: db.job_title,
            status: db.status,
            invitedBy: db.invited_by,
            createdAt: new Date(db.created_at),
            updatedAt: new Date(db.updated_at),
            profile: db.profile ? {
                name: (Array.isArray(db.profile) ? db.profile[0] : db.profile).name,
                email: (Array.isArray(db.profile) ? db.profile[0] : db.profile).email,
                avatarUrl: (Array.isArray(db.profile) ? db.profile[0] : db.profile).avatar
            } : undefined,
            permissions: {
                canManageClients: db.role === 'manager',
                canManageTasks: db.role !== 'viewer',
                canManageTeam: db.role === 'manager'
            }
        };
    }

    /**
     * Find all active members in an organization
     */
    async findByOrganization(organizationId: string): Promise<TeamMember[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*, profile:profiles!team_members_profile_id_fkey(*)')
            .eq('organization_id', organizationId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching team members:', error);
            return [];
        }

        return (data || []).map(tm => this.mapToTeamMember(tm));
    }

    /**
     * Get a specific member by profile ID
     */
    async findByProfile(organizationId: string, profileId: string): Promise<TeamMember | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*, profile:profiles!team_members_profile_id_fkey(*)')
            .eq('organization_id', organizationId)
            .eq('profile_id', profileId)
            .is('deleted_at', null)
            .single();

        if (error) {
            console.error('Error fetching member by profile:', error);
            return null;
        }

        return this.mapToTeamMember(data);
    }

    /**
     * Update member details
     */
    async updateMember(id: string, updates: Partial<DBTeamMember>): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating team member:', error);
            throw new Error('Failed to update team member');
        }
    }

    /**
     * Soft delete a member
     */
    async deactivateMember(id: string): Promise<void> {
        await this.updateMember(id, {
            status: 'inactive',
            deleted_at: new Date().toISOString()
        } as any);
    }
}

// Export singleton instance
export const TeamRepository = new TeamRepositoryClass();
