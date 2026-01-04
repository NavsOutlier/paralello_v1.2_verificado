import { supabase } from './supabase';
import { Organization, PlanType } from '../types';
import { OrganizationRepository } from './repositories/OrganizationRepository';

// =====================================================
// Organizations CRUD
// =====================================================

/**
 * Fetch all organizations
 */
export async function fetchOrganizations(): Promise<Organization[]> {
    return OrganizationRepository.findWithInstances();
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
    await OrganizationRepository.updateDetails(id, {
        name: data.name,
        plan: data.plan,
        owner_name: data.owner?.name,
        owner_email: data.owner?.email
    });
}

/**
 * Toggle organization status (active/inactive)
 */
export async function toggleOrganizationStatus(id: string, newStatus: 'active' | 'inactive'): Promise<void> {
    await OrganizationRepository.toggleStatus(id, newStatus);
}

/**
 * Change organization plan
 */
export async function changeOrganizationPlan(id: string, newPlan: PlanType): Promise<void> {
    await OrganizationRepository.updatePlan(id, newPlan);
}

/**
 * Delete an organization (soft delete could be implemented by status)
 */
export async function deleteOrganization(id: string): Promise<void> {
    await OrganizationRepository.delete(id);
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
