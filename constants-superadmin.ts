import { PlanType, Plan, Organization } from './types';

export const PLANS: Plan[] = [
    {
        id: PlanType.BASIC,
        name: 'Basic',
        price: 49,
        maxUsers: 5,
        maxClients: 20,
        features: ['WhatsApp Integration', 'Task Management', 'Basic Reports']
    },
    {
        id: PlanType.PRO,
        name: 'Pro',
        price: 149,
        maxUsers: 20,
        maxClients: 100,
        features: ['All Basic Features', 'Advanced Analytics', 'API Access', 'Priority Support']
    },
    {
        id: PlanType.ENTERPRISE,
        name: 'Enterprise',
        price: 499,
        maxUsers: -1, // unlimited
        maxClients: -1, // unlimited
        features: ['All Pro Features', 'Custom Integrations', 'Dedicated Support', 'SLA Guarantee', 'White Label']
    }
];


