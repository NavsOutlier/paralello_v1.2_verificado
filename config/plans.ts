import { PlanType, Plan } from '../types';

/**
 * Plan Configurations - Aligned with Billing System
 * 
 * Preços em R$ (BRL)
 * - Gestor Solo: R$39/user + R$29/cliente
 * - Agência: R$35/user + R$45/cliente
 * - Enterprise: R$30/user + R$60/cliente
 */
export const PLANS: Record<PlanType, Plan> = {
    [PlanType.GESTOR_SOLO]: {
        id: PlanType.GESTOR_SOLO,
        name: 'Gestor Solo',
        price: 39,
        pricePerClient: 29,
        maxUsers: 1,
        features: [
            '1 usuário',
            'Clientes ilimitados',
            'WhatsApp integrado',
            'Kanban de tarefas',
            'Templates de checklist',
            'Suporte por email'
        ]
    },
    [PlanType.AGENCIA]: {
        id: PlanType.AGENCIA,
        name: 'Agência',
        price: 35,
        pricePerClient: 45,
        maxUsers: 10,
        features: [
            'Até 10 usuários',
            'Clientes ilimitados',
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
        price: 30,
        pricePerClient: 60,
        maxUsers: 30,
        features: [
            'Até 30 usuários',
            'Clientes ilimitados',
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
        maxUsers: 1,
        features: ['Integração com TinTim']
    },
    [PlanType.META]: {
        id: PlanType.META,
        name: 'Meta',
        price: 0,
        pricePerClient: 0,
        maxUsers: 1,
        features: ['Isca de Marketing']
    }
};

/**
 * Plan labels for display
 */
export const PLAN_LABELS: Record<PlanType, string> = {
    [PlanType.GESTOR_SOLO]: 'Gestor Solo',
    [PlanType.AGENCIA]: 'Agência',
    [PlanType.ENTERPRISE]: 'Enterprise',
    [PlanType.TINTIM]: 'TinTim',
    [PlanType.META]: 'Meta'
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
 * Calculate monthly amount based on plan, client count, and user count
 */
export function calculatePlanAmount(planType: PlanType, clientCount: number, userCount?: number): number {
    const plan = PLANS[planType];
    const users = userCount ?? plan.maxUsers;
    return (plan.price * users) + (plan.pricePerClient * clientCount);
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
