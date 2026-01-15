import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TeamRepository } from '../lib/repositories/TeamRepository';
import { User as UIUser } from '../types';

/**
 * Hook to manage team members within an organization.
 */
export const useTeam = () => {
    const { organizationId, user: currentUser } = useAuth();
    const [team, setTeam] = useState<UIUser[]>([]);
    const [allMembers, setAllMembers] = useState<UIUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTeam = useCallback(async () => {
        if (!organizationId) return;

        try {
            setLoading(true);
            const members = await TeamRepository.findByOrganization(organizationId);

            // 1. Map all members to UI User type
            const mappedAll: UIUser[] = members.map(m => ({
                id: m.profileId,
                name: m.profile?.name || 'Membro',
                avatar: m.profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.profile?.name || 'M')}&background=random`,
                role: 'team',
                jobTitle: m.jobTitle
            }));

            setAllMembers(mappedAll);

            // 2. Filter out current user for "other team members" list
            setTeam(mappedAll.filter(m => m.id !== currentUser?.id));

        } catch (error) {
            console.error('Error fetching team members:', error);
        } finally {
            setLoading(false);
        }
    }, [organizationId, currentUser]);

    useEffect(() => {
        fetchTeam();

        if (!organizationId) return;

        // Subscribe to team_members and profiles
        const channel = supabase
            .channel(`team-changes-${organizationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'team_members',
                filter: `organization_id=eq.${organizationId}`
            }, () => fetchTeam())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTeam, organizationId]);

    return {
        team,
        allMembers,
        loading,
        refreshTeam: fetchTeam
    };
};
