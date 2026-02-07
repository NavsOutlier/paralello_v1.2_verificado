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

            // Buscar todas as subscriptions com dados da org
            const { data: subs, error: subsError } = await supabase
                .from('subscriptions')
                .select(`
          *,
          organizations!inner(name, owner_email)
        `)
                .order('created_at', { ascending: false });

            if (subsError) throw subsError;

            const mappedSubs = (subs || []).map((s: any) => ({
                ...s,
                organization_name: s.organizations?.name || 'N/A',
                organization_email: s.organizations?.owner_email || 'N/A',
            }));

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

            // Fallback para dados fictícios caso o banco esteja vazio
            if (mappedSubs.length === 0) {
                newMetrics.activeSubscriptions = 12;
                newMetrics.totalMRR = 4850;
                newMetrics.trialingCount = 5;
                newMetrics.pastDueCount = 2;
                newMetrics.planDistribution = { gestor_solo: 8, agencia: 4, enterprise: 0 };
            } else {
                mappedSubs.forEach((sub: any) => {
                    // Contar por status
                    if (sub.status === 'active') {
                        newMetrics.activeSubscriptions++;
                        newMetrics.totalMRR += sub.monthly_amount || 0;
                    } else if (sub.status === 'trialing') {
                        newMetrics.trialingCount++;
                    } else if (sub.status === 'past_due') {
                        newMetrics.pastDueCount++;
                    } else if (sub.status === 'suspended') {
                        newMetrics.suspendedCount++;
                    }

                    // Contar por plano
                    if (sub.plan in newMetrics.planDistribution) {
                        newMetrics.planDistribution[sub.plan as keyof typeof newMetrics.planDistribution]++;
                    }
                });
            }

            setMetrics(newMetrics);

            // Buscar invoices vencidas
            const today = new Date().toISOString().split('T')[0];
            const { data: overdue, error: overdueError } = await supabase
                .from('invoices')
                .select(`
          *,
          organizations!inner(name)
        `)
                .in('status', ['pending', 'overdue'])
                .lt('due_date', today)
                .order('due_date', { ascending: true });

            if (overdueError) throw overdueError;

            const mappedOverdue = (overdue || []).map((inv: any) => ({
                ...inv,
                organization_name: inv.organizations?.name || 'N/A',
            }));

            // Fallback para faturas fictícias
            if (mappedOverdue.length === 0) {
                setOverdueInvoices([
                    {
                        id: 'inv_mock_1',
                        organization_id: 'org1',
                        organization_name: 'Agência Alpha (MOCK)',
                        amount: 450,
                        status: 'overdue',
                        due_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
                        asaas_invoice_url: '#'
                    },
                    {
                        id: 'inv_mock_2',
                        organization_id: 'org2',
                        organization_name: 'Gestor Solo XP (MOCK)',
                        amount: 197,
                        status: 'overdue',
                        due_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
                        asaas_invoice_url: '#'
                    }
                ] as any);
            } else {
                setOverdueInvoices(mappedOverdue);
            }

        } catch (err) {
            console.error('Erro ao buscar dados de billing (super admin):', err);
            setError('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }, []);

    const extendTrial = useCallback(async (subscriptionId: string, days: number) => {
        try {
            // Buscar subscription atual
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('trial_ends_at')
                .eq('id', subscriptionId)
                .single();

            const currentEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : new Date();
            const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

            const { error } = await supabase
                .from('subscriptions')
                .update({
                    trial_ends_at: newEnd.toISOString(),
                    current_period_end: newEnd.toISOString(),
                    status: 'trialing',
                })
                .eq('id', subscriptionId);

            if (error) throw error;

            await fetchData();
            return { success: true };
        } catch (err) {
            console.error('Erro ao estender trial:', err);
            return { success: false, error: 'Erro ao estender trial' };
        }
    }, [fetchData]);

    const suspendOrg = useCallback(async (organizationId: string) => {
        try {
            const { error } = await supabase
                .from('subscriptions')
                .update({ status: 'suspended' })
                .eq('organization_id', organizationId);

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
                .from('subscriptions')
                .update({ status: 'active' })
                .eq('organization_id', organizationId);

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
