// Billing Types - Gerado automaticamente do schema Supabase

export type BillingPlan = 'gestor_solo' | 'agencia' | 'enterprise';
export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';
export type PaymentStatus = 'pending' | 'confirmed' | 'overdue' | 'refunded';

export interface Subscription {
    id: string;
    organization_id: string;
    status: BillingStatus;

    // Asaas
    asaas_customer_id: string | null;
    asaas_subscription_id: string | null;

    // Datas
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    canceled_at: string | null;

    created_at: string | null;
    updated_at: string | null;
}

export interface Invoice {
    id: string;
    organization_id: string;
    subscription_id: string;

    // Valores
    amount: number;
    plan_amount: number;
    client_amount: number;
    client_count: number;

    // Status
    status: PaymentStatus;
    due_date: string;
    paid_at: string | null;

    // Asaas
    asaas_payment_id: string | null;
    asaas_invoice_url: string | null;
    asaas_boleto_url: string | null;
    asaas_pix_code: string | null;

    created_at: string | null;
    updated_at: string | null;
}

// Preços dos planos (em R$)
export const PLAN_PRICES = {
    gestor_solo: {
        base: 39.90,
        per_client: 10.00,
        max_users: 1,
    },
    agencia: {
        base: 299.00,
        per_client: 20.00,
        max_users: 10,
    },
    enterprise: {
        base: 1199.00,
        per_client: 0, // Negociável
        max_users: Infinity,
    },
} as const;

// Helper para calcular valor mensal
export function calculateMonthlyAmount(plan: BillingPlan, clientCount: number): number {
    const prices = PLAN_PRICES[plan];
    return prices.base + (clientCount * prices.per_client);
}

// Status labels para UI
export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
    trialing: 'Em Trial',
    active: 'Ativo',
    past_due: 'Pagamento Atrasado',
    suspended: 'Suspenso',
    canceled: 'Cancelado',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: 'Pendente',
    confirmed: 'Pago',
    overdue: 'Vencido',
    refunded: 'Reembolsado',
};

export const PLAN_LABELS: Record<BillingPlan, string> = {
    gestor_solo: 'Gestor Solo',
    agencia: 'Agência',
    enterprise: 'Enterprise',
};
