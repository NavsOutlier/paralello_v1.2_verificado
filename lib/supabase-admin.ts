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
            plan: data.plan,
            billing_document: data.billingDocument,
            billing_email: data.billingEmail,
            activate_billing: data.activateBilling
        }
    });

    if (error || (response && response.error)) {
        const errorDetails = error || response?.error;
        console.error('Error creating organization via Edge Function:', errorDetails);

        // Try to extract more specific error message from response body if possible
        let errorMessage = error?.message || response?.error || 'Failed to create organization';

        if (error && typeof error === 'object' && 'context' in error) {
            try {
                // @ts-ignore - Supabase FunctionsHttpError has a context property with the response
                const errorBody = await error.context.json();
                if (errorBody && errorBody.error) {
                    errorMessage = errorBody.error;
                }
            } catch (e) {
                // Ignore JSON parse error, stick to default message
            }
        }

        throw new Error(errorMessage);
    }

    // Return a basic representation, the dashboard will reload
    return {
        id: response.organizationId,
        name: data.name || '',
        slug: data.slug || '',
        plan: data.plan as PlanType,
        status: 'active',
        billingDocument: data.billingDocument,
        billingEmail: data.billingEmail,
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
        owner_email: data.owner?.email,
        billing_document: data.billingDocument,
        billing_email: data.billingEmail,
        max_clients: data.maxClients,
        max_users: data.maxUsers,
        contracted_clients: data.contractedClients,
        billing_value: data.billingValue
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
 * Delete an organization (with instance cleanup)
 */
export async function deleteOrganization(id: string): Promise<void> {
    try {
        // 1. Fetch current instances for this organization BEFORE deletion
        // This ensures the signal to n8n contains all credentials needed to remove them from UAZAPI
        const { data: instances } = await supabase
            .from('instances')
            .select('id, name, instance_api_id, instance_api_token')
            .eq('organization_id', id);

        // 2. Fetch Agents for this organization (vector store cleanup)
        const { data: agents } = await supabase
            .from('workers_ia_agents')
            .select('id, name')
            .eq('organization_id', id);

        // 3. Cleanup Agents via Proxy (triggers n8n)
        if (agents && agents.length > 0) {
            const { error: agentProxyError } = await supabase.functions.invoke('whatsapp-proxy-v2', {
                body: {
                    action: 'delete_agent_instances',
                    organization_id: id,
                    agents: agents
                }
            });

            if (agentProxyError) {
                console.warn('Agent cleanup failed (non-blocking):', agentProxyError);
                // We choose NOT to block deletion on agent cleanup failure, unlike WhatsApp instances
                // because vector stores are less critical/costly than active WhatsApp sessions.
            }
        }

        // 4. Cleanup WhatsApp instances via Proxy (triggers n8n)
        // We WAIT for the response from n8n. If n8n returns 200 OK, the proxy returns data.
        // If n8n returns an error, the proxy returns an error in 'data.error' or 'proxyError'
        const { data: proxyResult, error: proxyError } = await supabase.functions.invoke('whatsapp-proxy-v2', {
            body: {
                action: 'delete_organization_instances',
                organization_id: id,
                instances: instances || [] // Full metadata (ID, API ID, Token)
            }
        });

        // CRITICAL: We must stop if the proxy or n8n reported an error
        if (proxyError || proxyResult?.error) {
            const finalError = proxyError?.message || proxyResult?.error;
            console.error('Cleanup failed, aborting deletion:', finalError);
            throw new Error(`Exclusão cancelada: Não foi possível limpar as instâncias no WhatsApp (${finalError}).`);
        }

        // 3. Delete from database
        // Only reached if proxy returned success (no error in proxyError AND no error in result)
        console.log('Cleanup successful, proceeding with DB deletion');
        await OrganizationRepository.delete(id);

    } catch (err: any) {
        console.error('Error in deleteOrganization:', err);
        throw err;
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
