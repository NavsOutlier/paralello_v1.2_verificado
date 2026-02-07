import { PlanType, Plan } from '../types';

/**
 * Plan Configurations - Aligned with Billing System
 * 
 * Preços em R$ (BRL)
 * - Gestor Solo: R$397/mês (1 usuário, até 50 clientes)
 * - Agência: R$97/mês + R$7/cliente (até 10 usuários)
 * - Enterprise: R$297/mês + R$5/cliente (usuários ilimitados)
 */
export const PLANS: Record<PlanType, Plan> = {
    [PlanType.GESTOR_SOLO]: {
        id: PlanType.GESTOR_SOLO,
        name: 'Gestor Solo',
        price: 397,
        pricePerClient: 0,
        maxUsers: 1,

        features: [
            '1 usuário',
            'Até 50 clientes',
            'WhatsApp integrado',
            'Kanban de tarefas',
            'Templates de checklist',
            'Suporte por email'
        ]
    },
    [PlanType.AGENCIA]: {
        id: PlanType.AGENCIA,
        name: 'Agência',
        price: 97,
        pricePerClient: 7,
        maxUsers: 10,

        features: [
            'Até 10 usuários',
            'Clientes ilimitados',
            'R$7/cliente adicional',
            'WhatsApp integrado',
            'Kanban de tarefas',
            'Templates de checklist',
            'Relatórios avançados',
            'Suporte prioritário'
        ]
    },
    [PlanType.ENTERPRISE]: {
        id: PlanType.ENTERPRISE,
        name: 'Enterprise',
        price: 297,
        pricePerClient: 5,
        maxUsers: Infinity,

        features: [
            'Usuários ilimitados',
            'Clientes ilimitados',
            'R$5/cliente adicional',
            'WhatsApp integrado',
            'Kanban de tarefas',
            'Templates de checklist',
            'Relatórios avançados',
            'API personalizada',
            'Suporte 24/7',
            'Gestor de conta dedicado'
        ]
    },
    [PlanType.TINTIM]: {
        id: PlanType.TINTIM,
        name: 'TinTim',
        price: 0,
        pricePerClient: 0,
        maxUsers: 999999,
        features: ['Integração com TinTim']
    }
};

/**
 * Plan labels for display
 */
export const PLAN_LABELS: Record<PlanType, string> = {
    [PlanType.GESTOR_SOLO]: 'Gestor Solo',
    [PlanType.AGENCIA]: 'Agência',
    [PlanType.ENTERPRISE]: 'Enterprise',
    [PlanType.TINTIM]: 'TinTim'
};

/**
 * Get plan by ID
 */
export function getPlan(planType: PlanType): Plan {
    return PLANS[planType];
}

/**
 * Get plan price
 */
export function getPlanPrice(planType: PlanType): number {
    return PLANS[planType].price;
}

/**
 * Calculate monthly amount based on plan and client count
 */
export function calculatePlanAmount(planType: PlanType, clientCount: number): number {
    const plan = PLANS[planType];
    return plan.price + (plan.pricePerClient * clientCount);
}

/**
 * Get all plans as array
 */
export function getAllPlans(): Plan[] {
    return Object.values(PLANS);
}

/**
 * Get plan array (for legacy compatibility)
 */
export const PLAN_ARRAY = Object.values(PLANS);
