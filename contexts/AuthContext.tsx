import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isSuperAdmin: boolean;
    isManager: boolean;
    organizationId: string | null;
    permissions: {
        can_manage_clients: boolean;
        can_manage_tasks: boolean;
        can_manage_team: boolean;
    } | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isSuperAdmin: false,
    isManager: false,
    organizationId: null,
    permissions: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<AuthContextType['permissions']>(null);
    const [loading, setLoading] = useState(true);

    const checkRoles = async (userId: string) => {
        try {
            // 1. Get profile data (robust source for org id)
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('is_super_admin, organization_id, role, email')
                .eq('id', userId)
                .maybeSingle();

            if (profileError) {
                console.error('AUTH: Error fetching profile:', profileError);
            }

            const isSuper = !!profileData?.is_super_admin;
            setIsSuperAdmin(isSuper);

            // Set organization context from profile if available
            if (profileData?.organization_id) {
                setOrganizationId(profileData.organization_id);
            }

            // 2. Check team membership details
            const { data: teamData, error: teamError } = await supabase
                .from('team_members')
                .select('role, organization_id, permissions')
                .eq('profile_id', userId)
                .eq('status', 'active')
                .maybeSingle();

            if (teamError) {
                console.error('AUTH: Error fetching team membership:', teamError);
            }

            if (teamData) {
                setIsManager(teamData.role === 'manager');
                if (teamData.organization_id) {
                    setOrganizationId(teamData.organization_id);
                }
                setPermissions(teamData.permissions);
            } else {
                setIsManager(false);
                setPermissions(null);
            }
        } catch (err) {
            console.error('AUTH: Exception in checkRoles:', err);
            setIsSuperAdmin(false);
            setIsManager(false);
            setOrganizationId(null);
        }
    };

    useEffect(() => {
        // Check active session
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    // Start checking roles in background, don't block
                    checkRoles(session.user.id);
                }
            } catch (err) {
                console.error('AUTH: Init error:', err);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const newUser = session?.user ?? null;
            setUser(newUser);

            if (newUser) {
                checkRoles(newUser.id);
            } else {
                setIsSuperAdmin(false);
                setIsManager(false);
                setOrganizationId(null);
                setPermissions(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('AUTH: Error during sign out:', error);
        } finally {
            // Manually clear states to force UI update even if server call failed
            setIsSuperAdmin(false);
            setIsManager(false);
            setOrganizationId(null);
            setPermissions(null);
            setSession(null);
            setUser(null);
        }
    };

    const value = {
        session,
        user,
        isSuperAdmin,
        isManager,
        organizationId,
        permissions,
        loading,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
