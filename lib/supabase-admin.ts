import { supabase } from './supabase';
import { Organization, PlanType } from '../types';

// =====================================================
// Organizations CRUD
// =====================================================

/**
 * Fetch all organizations
 */
export async function fetchOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
        .from('organizations')
        .select('*, instances(id, status)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching organizations:', error);
        throw new Error('Failed to fetch organizations');
    }

    if (!data) return [];

    return data.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan as PlanType,
        status: org.status as 'active' | 'inactive',
        createdAt: new Date(org.created_at),
        owner: {
            name: org.owner_name,
            email: org.owner_email
        },
        stats: {
            users: org.stats_users || 0,
            clients: org.stats_clients || 0,
            tasks: org.stats_tasks || 0
        },
        onboardingStatus: {
            isOwnerInvited: true, // Placeholder for now
            isOwnerActive: (org.stats_users || 0) > 0,
            isWhatsAppConnected: (org.instances as any[])?.some(inst => inst.status === 'conectado') || false
        }
    }));
}

/**
 * Create a new organization (Atomic Onboarding)
 */
export async function createOrganization(data: Partial<Organization>): Promise<Organization> {
    const { data: response, error } = await supabase.functions.invoke('create-org-with-owner', {
        body: {
            organization: {
                name: data.name,
                slug: data.slug
            },
            owner_email: data.owner?.email,
            owner_name: data.owner?.name,
            plan: data.plan
        }
    });

    if (error || response.error) {
        console.error('Error creating organization via Edge Function:', error || response.error);
        throw new Error(error?.message || response.error || 'Failed to create organization');
    }

    // Return a basic representation, the dashboard will reload
    return {
        id: response.organizationId,
        name: data.name || '',
        slug: data.slug || '',
        plan: data.plan as PlanType,
        status: 'active',
        createdAt: new Date(),
        owner: {
            name: data.owner?.name || '',
            email: data.owner?.email || ''
        },
        stats: { users: 0, clients: 0, tasks: 0 }
    };
}

/**
 * Update an existing organization
 */
export async function updateOrganization(id: string, data: Partial<Organization>): Promise<void> {
    const { error } = await supabase
        .from('organizations')
        .update({
            name: data.name,
            plan: data.plan,
            owner_name: data.owner?.name,
            owner_email: data.owner?.email
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating organization:', error);
        throw new Error('Failed to update organization');
    }
}

/**
 * Toggle organization status (active/inactive)
 */
export async function toggleOrganizationStatus(id: string, newStatus: 'active' | 'inactive'): Promise<void> {
    const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        console.error('Error toggling organization status:', error);
        throw new Error('Failed to toggle organization status');
    }
}

/**
 * Change organization plan
 */
export async function changeOrganizationPlan(id: string, newPlan: PlanType): Promise<void> {
    const { error } = await supabase
        .from('organizations')
        .update({ plan: newPlan })
        .eq('id', id);

    if (error) {
        console.error('Error changing organization plan:', error);
        throw new Error('Failed to change organization plan');
    }
}

/**
 * Delete an organization (soft delete could be implemented by status)
 */
export async function deleteOrganization(id: string): Promise<void> {
    const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting organization:', error);
        throw new Error('Failed to delete organization');
    }
}

// =====================================================
// Super Admin Utilities
// =====================================================

/**
 * Check if current user is a super admin
 */
export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error checking super admin status:', error);
        return false;
    }

    return data?.is_super_admin || false;
}

/**
 * Get current user's super admin status from auth context
 */
export async function isCurrentUserSuperAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    return checkIsSuperAdmin(user.id);
}
