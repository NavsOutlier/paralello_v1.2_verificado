import { PlanType, Plan } from '../types';

/**
 * Plan Configurations
 * 
 * Central configuration for all subscription plans.
 */
export const PLANS: Record<PlanType, Plan> = {
    [PlanType.BASIC]: {
        id: PlanType.BASIC,
        name: 'Basic',
        price: 49,
        maxUsers: 3,
        maxClients: 50,
        features: [
            'Até 3 usuários',
            'Até 50 clientes',
            'WhatsApp integrado',
            'Kanban de tarefas',
            'Suporte por email'
        ]
    },
    [PlanType.PRO]: {
        id: PlanType.PRO,
        name: 'Pro',
        price: 149,
        maxUsers: 10,
        maxClients: 200,
        features: [
            'Até 10 usuários',
            'Até 200 clientes',
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
        price: 499,
        maxUsers: Infinity,
        maxClients: Infinity,
        features: [
            'Usuários ilimitados',
            'Clientes ilimitados',
            'WhatsApp integrado',
            'Kanban de tarefas',
            'Templates de checklist',
            'Relatórios avançados',
            'API personalizada',
            'Suporte 24/7',
            'Gestor de conta dedicado'
        ]
    }
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
 * Get all plans as array
 */
export function getAllPlans(): Plan[] {
    return Object.values(PLANS);
}

/**
 * Get plan array (for legacy compatibility)
 */
export const PLAN_ARRAY = Object.values(PLANS);
