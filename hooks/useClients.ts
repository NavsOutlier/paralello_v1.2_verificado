import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ClientRepository } from '../lib/repositories/ClientRepository';
import { Client, User as UIUser } from '../types';

/**
 * Hook to manage clients within an organization.
 * Handles fetching, filtering by assigned user, and realtime updates.
 */
export const useClients = () => {
    const { organizationId, user: currentUser } = useAuth();
    const [clients, setClients] = useState<UIUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchClients = useCallback(async () => {
        if (!organizationId || !currentUser) return;

        try {
            setLoading(true);

            // 1. Fetch all clients in org
            const allClients = await ClientRepository.findByOrganization(organizationId);

            // 2. Fetch assignments for permission filtering
            const { data: assignments } = await supabase
                .from('client_assignments')
                .select('client_id, team_member_id')
                .eq('organization_id', organizationId);

            // 3. Get current user's team member record to check role
            const { data: member } = await supabase
                .from('team_members')
                .select('role, id')
                .eq('organization_id', organizationId)
                .eq('profile_id', currentUser.id)
                .single();

            // 4. Filter clients if not a manager
            let filtered = allClients;
            if (member && member.role !== 'manager') {
                const assignedClientIds = new Set(
                    (assignments || [])
                        .filter(a => a.team_member_id === member.id)
                        .map(a => a.client_id)
                );
                filtered = allClients.filter(c => assignedClientIds.has(c.id));
            }

            // 5. Map to UI User type (legacy compatibility)
            const mapped: UIUser[] = filtered.map(c => ({
                id: c.id,
                name: c.name,
                avatar: c.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
                role: 'client',
                status: 'online',
                whatsappGroupId: c.whatsappGroupId,
                lastMessage: ''
            }));

            setClients(mapped);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    }, [organizationId, currentUser]);

    useEffect(() => {
        fetchClients();

        if (!organizationId) return;

        // Realtime subscription for clients table
        const channel = supabase
            .channel(`clients-changes-${organizationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'clients',
                filter: `organization_id=eq.${organizationId}`
            }, () => {
                fetchClients();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchClients, organizationId]);

    return {
        clients,
        loading,
        refreshClients: fetchClients
    };
};
