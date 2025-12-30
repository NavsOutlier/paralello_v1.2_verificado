import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isSuperAdmin: boolean;
    isManager: boolean;
    organizationId: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isSuperAdmin: false,
    isManager: false,
    organizationId: null,
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
    const [loading, setLoading] = useState(true);

    const checkRoles = async (userId: string) => {
        try {
            // Check super admin status
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('is_super_admin')
                .eq('id', userId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError;
            setIsSuperAdmin(profileData?.is_super_admin ?? false);

            // Check if user is a member/manager in any organization
            const { data: teamData, error: teamError } = await supabase
                .from('team_members')
                .select('role, organization_id')
                .eq('profile_id', userId)
                .eq('status', 'active')
                .maybeSingle();

            if (!teamError && teamData) {
                setIsManager(teamData.role === 'manager');
                setOrganizationId(teamData.organization_id);
            } else {
                setIsManager(false);
                setOrganizationId(null);
            }
        } catch (err) {
            console.error('Error checking user roles:', err);
            setIsSuperAdmin(false);
            setIsManager(false);
            setOrganizationId(null);
        }
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkRoles(session.user.id);
            }
            setLoading(false);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkRoles(session.user.id);
            } else {
                setIsSuperAdmin(false);
                setIsManager(false);
                setOrganizationId(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        session,
        user,
        isSuperAdmin,
        isManager,
        organizationId,
        loading,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
