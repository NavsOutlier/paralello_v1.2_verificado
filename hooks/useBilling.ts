import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Subscription, Invoice, BillingPlan, calculateMonthlyAmount } from '../types/billing';

interface BillingData {
    subscription: Subscription | null;
    invoices: Invoice[];
    loading: boolean;
    error: string | null;
}

interface BillingActions {
    refreshBilling: () => Promise<void>;
    changePlan: (newPlan: BillingPlan) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Hook para gerenciar dados de billing da organização.
 * Busca subscription e invoices com realtime updates.
 */
export const useBilling = (): BillingData & BillingActions => {
    const { organizationId } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBilling = useCallback(async () => {
        if (!organizationId) return;

        try {
            setLoading(true);
            setError(null);

            // Buscar subscription
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('organization_id', organizationId)
                .single();

            if (subError && subError.code !== 'PGRST116') {
                throw subError;
            }

            setSubscription(subData as Subscription | null);

            // Buscar invoices (últimas 12)
            const { data: invData, error: invError } = await supabase
                .from('invoices')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(12);

            if (invError) throw invError;

            setInvoices((invData as Invoice[]) || []);
        } catch (err) {
            console.error('Erro ao buscar billing:', err);
            setError('Erro ao carregar dados de cobrança');
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    const changePlan = useCallback(async (newPlan: BillingPlan) => {
        if (!organizationId || !subscription) {
            return { success: false, error: 'Organização ou subscription não encontrada' };
        }

        try {
            // Buscar contagem atual de clientes
            const { count } = await supabase
                .from('clients')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .eq('status', 'active')
                .is('deleted_at', null);

            const clientCount = count || 0;
            const newAmount = calculateMonthlyAmount(newPlan, clientCount);

            // Atualizar subscription
            const { error } = await supabase
                .from('subscriptions')
                .update({
                    plan: newPlan,
                    monthly_amount: newAmount,
                })
                .eq('organization_id', organizationId);

            if (error) throw error;

            // Atualizar estado local
            setSubscription(prev => prev ? {
                ...prev,
                plan: newPlan,
                monthly_amount: newAmount,
            } : null);

            return { success: true };
        } catch (err) {
            console.error('Erro ao trocar plano:', err);
            return { success: false, error: 'Erro ao trocar plano' };
        }
    }, [organizationId, subscription]);

    useEffect(() => {
        fetchBilling();

        if (!organizationId) return;

        // Realtime para subscriptions
        const subChannel = supabase
            .channel(`subscription-${organizationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'subscriptions',
                filter: `organization_id=eq.${organizationId}`
            }, fetchBilling)
            .subscribe();

        // Realtime para invoices
        const invChannel = supabase
            .channel(`invoices-${organizationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'invoices',
                filter: `organization_id=eq.${organizationId}`
            }, fetchBilling)
            .subscribe();

        return () => {
            supabase.removeChannel(subChannel);
            supabase.removeChannel(invChannel);
        };
    }, [fetchBilling, organizationId]);

    return {
        subscription,
        invoices,
        loading,
        error,
        refreshBilling: fetchBilling,
        changePlan,
    };
};
