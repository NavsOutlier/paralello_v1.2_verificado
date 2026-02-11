import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Subscription, Invoice } from '../types/billing';

interface BillingMetrics {
    totalMRR: number;
    activeSubscriptions: number;
    trialingCount: number;
    pastDueCount: number;
    suspendedCount: number;
    planDistribution: {
        gestor_solo: number;
        agencia: number;
        enterprise: number;
    };
}

interface SuperAdminBillingData {
    metrics: BillingMetrics;
    subscriptions: (Subscription & { organization_name: string; organization_email: string })[];
    overdueInvoices: (Invoice & { organization_name: string })[];
    loading: boolean;
    error: string | null;
}

interface SuperAdminBillingActions {
    refreshData: () => Promise<void>;
    extendTrial: (subscriptionId: string, days: number) => Promise<{ success: boolean; error?: string }>;
    suspendOrg: (organizationId: string) => Promise<{ success: boolean; error?: string }>;
    activateOrg: (organizationId: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Hook para Super Admin gerenciar billing de todas as organizações.
 */
export const useSuperAdminBilling = (): SuperAdminBillingData & SuperAdminBillingActions => {
    const [metrics, setMetrics] = useState<BillingMetrics>({
        totalMRR: 0,
        activeSubscriptions: 0,
        trialingCount: 0,
        pastDueCount: 0,
        suspendedCount: 0,
        planDistribution: { gestor_solo: 0, agencia: 0, enterprise: 0 },
    });
    const [subscriptions, setSubscriptions] = useState<(Subscription & { organization_name: string; organization_email: string })[]>([]);
    const [overdueInvoices, setOverdueInvoices] = useState<(Invoice & { organization_name: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Buscar todas as organizações com dados relevantes
            // Buscar todas as organizações com dados relevantes (incluindo trial_ends_at)
            const { data: orgs, error: orgsError } = await supabase
                .from('organizations')
                .select('id, name, owner_email, plan, billing_value, contracted_clients, status, max_users, created_at, asaas_customer_id, asaas_subscription_id, trial_ends_at')
                .order('created_at', { ascending: false });

            if (orgsError) throw orgsError;

            // Converter organizações para formato Subscription
            const mappedSubs = (orgs || []).map((org: any) => ({
                plan: org.plan,
                status: (org.status as any) || 'active',
                billing_value: org.billing_value || 0,
                contracted_clients: org.contracted_clients || 0,
                max_users: org.max_users || 0,
                asaas_customer_id: org.asaas_customer_id,
                asaas_subscription_id: org.asaas_subscription_id,
                created_at: org.created_at,
                // Campos virtuais
                organization_name: org.name || 'N/A',
                organization_email: org.owner_email || 'N/A',
                // Simulando ID da subscrição como ID da org para compatibilidade de UI
                id: org.id,
                organization_id: org.id,
                trial_ends_at: (org as any).trial_ends_at || null
            } as any));

            setSubscriptions(mappedSubs);

            // Calcular métricas
            const newMetrics: BillingMetrics = {
                totalMRR: 0,
                activeSubscriptions: 0,
                trialingCount: 0,
                pastDueCount: 0,
                suspendedCount: 0,
                planDistribution: { gestor_solo: 0, agencia: 0, enterprise: 0 },
            };

            mappedSubs.forEach((sub: any) => {
                const plan = sub.plan;
                const billingValue = sub.billing_value || 0;

                // Contar por status
                if (sub.status === 'active') {
                    newMetrics.activeSubscriptions++;
                    newMetrics.totalMRR += Number(billingValue);
                } else if (sub.status === 'trialing') {
                    newMetrics.trialingCount++;
                } else if (sub.status === 'past_due') {
                    newMetrics.pastDueCount++;
                } else if (sub.status === 'suspended') {
                    newMetrics.suspendedCount++;
                }

                // Contar por plano
                if (plan && plan in newMetrics.planDistribution) {
                    newMetrics.planDistribution[plan as keyof typeof newMetrics.planDistribution]++;
                }
            });

            setMetrics(newMetrics);

            setOverdueInvoices([]);

        } catch (err) {
            console.error('Erro ao buscar dados de billing (super admin):', err);
            setError('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, []);

    const extendTrial = useCallback(async (organizationId: string, days: number) => {
        try {
            // Buscar data atual do fim do trial
            const { data: org, error: fetchError } = await supabase
                .from('organizations')
                .select('trial_ends_at')
                .eq('id', organizationId)
                .single();

            if (fetchError) throw fetchError;

            const currentEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date();
            const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

            const { error: updateError } = await supabase
                .from('organizations')
                .update({ trial_ends_at: newEnd.toISOString() })
                .eq('id', organizationId);

            if (updateError) throw updateError;

            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('Erro ao estender trial:', err);
            return { success: false, error: err.message };
        }
    }, [fetchData]);

    const suspendOrg = useCallback(async (organizationId: string) => {
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ status: 'suspended' })
                .eq('id', organizationId);

            if (error) throw error;

            await fetchData();
            return { success: true };
        } catch (err) {
            console.error('Erro ao suspender org:', err);
            return { success: false, error: 'Erro ao suspender organização' };
        }
    }, [fetchData]);

    const activateOrg = useCallback(async (organizationId: string) => {
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ status: 'active' })
                .eq('id', organizationId);

            if (error) throw error;

            await fetchData();
            return { success: true };
        } catch (err) {
            console.error('Erro ao ativar org:', err);
            return { success: false, error: 'Erro ao ativar organização' };
        }
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        metrics,
        subscriptions,
        overdueInvoices,
        loading,
        error,
        refreshData: fetchData,
        extendTrial,
        suspendOrg,
        activateOrg,
    };
};
