import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ViewState } from '../types';

interface PlanConfig {
    id: string;
    name: string;
    modules: string[];
    max_users: number;
    max_clients: number;
}

export function useOrganizationPlan() {
    const { organizationId, isSuperAdmin } = useAuth();
    const [plan, setPlan] = useState<PlanConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isSuperAdmin) {
            // Super admins have access to everything
            setPlan({
                id: 'super_admin',
                name: 'Super Admin',
                modules: Object.values(ViewState),
                max_users: 999999,
                max_clients: 999999
            });
            setLoading(false);
            return;
        }

        if (!organizationId) {
            setLoading(false);
            return;
        }

        const loadPlan = async () => {
            try {
                setLoading(true);
                // 1. Get organization's plan ID
                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .select('plan')
                    .eq('id', organizationId)
                    .single();

                if (orgError) throw orgError;

                // 2. Get plan configuration
                const { data: planConfig, error: planError } = await supabase
                    .from('plan_configurations')
                    .select('*')
                    .eq('id', org.plan)
                    .single();

                if (planError) throw planError;

                setPlan(planConfig);
            } catch (err) {
                console.error('Error loading organization plan:', err);
            } finally {
                setLoading(false);
            }
        };

        loadPlan();
    }, [organizationId, isSuperAdmin]);

    const hasModule = (moduleId: string) => {
        if (isSuperAdmin) return true;
        if (!plan) return false;
        return (plan.modules || []).includes(moduleId);
    };

    return { plan, hasModule, loading };
}
