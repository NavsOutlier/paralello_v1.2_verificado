// Billing Types - Gerado automaticamente do schema Supabase

export type BillingPlan = 'gestor_solo' | 'agencia' | 'enterprise' | 'tintim' | 'meta';
export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';
export type PaymentStatus = 'pending' | 'confirmed' | 'overdue' | 'refunded';

export interface OrganizationSubscription {
    plan: string;
    status: BillingStatus;
    billing_value: number;
    contracted_clients: number;
    max_users: number;
    asaas_customer_id?: string;
    asaas_subscription_id?: string;
    created_at?: string;

    // Virtual fields for compatibility
    id?: string;
    organization_id?: string;
    current_period_end?: string;
    trial_ends_at?: string;
}

export type Subscription = OrganizationSubscription;

export interface Invoice {
    id: string;
    organization_id: string;
    subscription_id: string;

    // Valores
    amount: number;
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

// Preços dos planos (em R$) — fórmula: (per_user × users) + (per_client × clients)
export const PLAN_PRICES = {
    tintim: {
        per_user: 0,
        per_client: 0,
        max_users: 1,
    },
    meta: {
        per_user: 0,
        per_client: 0,
        max_users: 1,
    },
    gestor_solo: {
        per_user: 39,
        per_client: 29,
        max_users: 1,
    },
    agencia: {
        per_user: 35,
        per_client: 45,
        max_users: 10,
    },
    enterprise: {
        per_user: 30,
        per_client: 60,
        max_users: 30,
    },
} as const;

// Helper para calcular valor mensal: (price_per_user × users) + (price_per_client × clients)
export function calculateMonthlyAmount(plan: BillingPlan, clientCount: number, userCount?: number): number {
    const prices = PLAN_PRICES[plan];
    if (!prices) return 0;
    const users = userCount ?? prices.max_users;
    return (prices.per_user * users) + (prices.per_client * clientCount);
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
    tintim: 'Tintim',
    meta: 'Meta',
    gestor_solo: 'Gestor Solo',
    agencia: 'Agência',
    enterprise: 'Enterprise',
};
