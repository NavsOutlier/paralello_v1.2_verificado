import { PlanType, Plan, Organization } from './types';

export const PLANS: Plan[] = [
    {
        id: PlanType.GESTOR_SOLO,
        name: 'Gestor Solo',
        price: 397,
        pricePerClient: 0,
        maxUsers: 1,
        features: ['1 usuário', 'Até 50 clientes', 'Módulos Essenciais']
    },
    {
        id: PlanType.AGENCIA,
        name: 'Agência',
        price: 97,
        pricePerClient: 7,
        maxUsers: 10,
        features: ['Até 10 usuários', 'Clientes ilimitados', 'Todos os Módulos']
    },
    {
        id: PlanType.ENTERPRISE,
        name: 'Enterprise',
        price: 297,
        pricePerClient: 5,
        maxUsers: 999999,
        features: ['Usuários ilimitados', 'Clientes ilimitados', 'Suporte VIP']
    }
];


