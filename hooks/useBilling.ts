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

            // Buscar dados da organização (nova fonte de verdade para billing)
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('plan, billing_value, contracted_clients, max_users, status, asaas_customer_id, asaas_subscription_id, created_at')
                .eq('id', organizationId)
                .single();

            if (orgError) throw orgError;

            // Mapear para o formato Subscription esperado pela UI
            const subscriptionData: Subscription = {
                plan: orgData.plan,
                status: (orgData.status as any) || 'active',
                billing_value: orgData.billing_value || 0,
                contracted_clients: orgData.contracted_clients || 0,
                max_users: orgData.max_users || 0,
                asaas_customer_id: orgData.asaas_customer_id,
                asaas_subscription_id: orgData.asaas_subscription_id,
                created_at: orgData.created_at,
                // Campos virtuais
                current_period_end: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(), // Simulação
                trial_ends_at: null
            };

            setSubscription(subscriptionData);

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
        if (!organizationId) {
            return { success: false, error: 'Organização não encontrada' };
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

            // Atualizar na tabela organizations (fonte única de verdade)
            const { error } = await supabase
                .from('organizations')
                .update({
                    plan: newPlan,
                    billing_value: newAmount, // este campo precisa existir na tabela organizations no banco, se não existir vai falhar
                })
                .eq('id', organizationId);

            if (error) throw error;

            // Atualizar estado local
            setSubscription(prev => prev ? {
                ...prev,
                plan: newPlan,
                billing_value: newAmount
            } : null);

            return { success: true };
        } catch (err) {
            console.error('Erro ao trocar plano:', err);
            return { success: false, error: 'Erro ao trocar plano' };
        }
    }, [organizationId]);

    useEffect(() => {
        fetchBilling();

        if (!organizationId) return;

        // Realtime para organizations (dados de plano/status)
        const orgChannel = supabase
            .channel(`org-billing-${organizationId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'organizations',
                filter: `id=eq.${organizationId}`
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
            supabase.removeChannel(orgChannel);
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
