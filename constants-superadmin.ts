import { PlanType, Plan } from './types';

export const PLANS: Plan[] = [
    {
        id: PlanType.GESTOR_SOLO,
        name: 'Gestor Solo',
        price: 39,
        pricePerClient: 29,
        maxUsers: 1,
        features: ['1 usuário', 'Clientes ilimitados', 'Módulos Essenciais']
    },
    {
        id: PlanType.AGENCIA,
        name: 'Agência',
        price: 35,
        pricePerClient: 45,
        maxUsers: 10,
        features: ['Até 10 usuários', 'Clientes ilimitados', 'Todos os Módulos']
    },
    {
        id: PlanType.ENTERPRISE,
        name: 'Enterprise',
        price: 30,
        pricePerClient: 60,
        maxUsers: 30,
        features: ['Até 30 usuários', 'Clientes ilimitados', 'Suporte VIP']
    }
];
