import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ViewState } from '../types';

interface PlanConfig {
    id: string;
    name: string;
    modules: string[];
    max_users: number;
}

interface OrganizationLimits {
    contractedClients: number;
    maxUsers: number;
    name: string;
}

// Número de WhatsApp para upgrades (formato internacional sem +)
const WHATSAPP_UPGRADE_NUMBER = '5535999713729';

export function useOrganizationPlan() {
    const { organizationId, isSuperAdmin } = useAuth();
    const [plan, setPlan] = useState<PlanConfig | null>(null);
    const [orgLimits, setOrgLimits] = useState<OrganizationLimits | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isSuperAdmin) {
            // Super admins have access to everything
            setPlan({
                id: 'super_admin',
                name: 'Super Admin',
                modules: Object.values(ViewState),
                max_users: 999999
            });
            setOrgLimits({
                contractedClients: 999999,
                maxUsers: 999999,
                name: 'Super Admin'
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
                // 1. Get organization's plan ID and limits
                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .select('plan, contracted_clients, max_users, name')
                    .eq('id', organizationId)
                    .single();

                if (orgError) throw orgError;

                // Set organization limits
                setOrgLimits({
                    contractedClients: org.contracted_clients || 10,
                    maxUsers: org.max_users || 10,
                    name: org.name || ''
                });

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

    // Gera URL do WhatsApp para upgrade de clientes
    const getClientUpgradeWhatsAppUrl = () => {
        const message = encodeURIComponent(
            `Olá! Gostaria de liberar mais clientes na minha conta. Organização: ${orgLimits?.name || 'N/A'}`
        );
        return `https://wa.me/${WHATSAPP_UPGRADE_NUMBER}?text=${message}`;
    };

    // Gera URL do WhatsApp para upgrade de usuários
    const getUserUpgradeWhatsAppUrl = () => {
        const message = encodeURIComponent(
            `Olá! Quero evoluir meu plano para adicionar mais usuários. Organização: ${orgLimits?.name || 'N/A'}`
        );
        return `https://wa.me/${WHATSAPP_UPGRADE_NUMBER}?text=${message}`;
    };

    return {
        plan,
        orgLimits,
        hasModule,
        loading,
        getClientUpgradeWhatsAppUrl,
        getUserUpgradeWhatsAppUrl
    };
}
