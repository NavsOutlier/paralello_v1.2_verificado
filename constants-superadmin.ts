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

export const MOCK_ORGANIZATIONS: Organization[] = [
    {
        id: 'org-1',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        plan: PlanType.ENTERPRISE,
        status: 'active',
        createdAt: new Date('2024-01-15'),
        owner: {
            name: 'John Doe',
            email: 'john@acme.com'
        },
        stats: {
            users: 35,
            clients: 120,
            tasks: 458
        }
    },
    {
        id: 'org-2',
        name: 'TechStart Solutions',
        slug: 'techstart',
        plan: PlanType.PRO,
        status: 'active',
        createdAt: new Date('2024-03-20'),
        owner: {
            name: 'Sarah Johnson',
            email: 'sarah@techstart.io'
        },
        stats: {
            users: 12,
            clients: 45,
            tasks: 213
        }
    },
    {
        id: 'org-3',
        name: 'Digital Innovators',
        slug: 'digital-innovators',
        plan: PlanType.BASIC,
        status: 'active',
        createdAt: new Date('2024-06-10'),
        owner: {
            name: 'Mike Chen',
            email: 'mike@digitalinnovators.com'
        },
        stats: {
            users: 3,
            clients: 15,
            tasks: 67
        }
    },
    {
        id: 'org-4',
        name: 'Marketing Masters',
        slug: 'marketing-masters',
        plan: PlanType.PRO,
        status: 'active',
        createdAt: new Date('2024-02-28'),
        owner: {
            name: 'Emily Rodriguez',
            email: 'emily@marketingmasters.co'
        },
        stats: {
            users: 18,
            clients: 78,
            tasks: 342
        }
    },
    {
        id: 'org-5',
        name: 'Startup Hub',
        slug: 'startup-hub',
        plan: PlanType.BASIC,
        status: 'inactive',
        createdAt: new Date('2024-04-05'),
        owner: {
            name: 'David Kim',
            email: 'david@startuphub.com'
        },
        stats: {
            users: 2,
            clients: 8,
            tasks: 23
        }
    },
    {
        id: 'org-6',
        name: 'Global Ventures',
        slug: 'global-ventures',
        plan: PlanType.ENTERPRISE,
        status: 'active',
        createdAt: new Date('2023-11-12'),
        owner: {
            name: 'Lisa Anderson',
            email: 'lisa@globalventures.com'
        },
        stats: {
            users: 52,
            clients: 230,
            tasks: 891
        }
    },
    {
        id: 'org-7',
        name: 'Creative Agency Co',
        slug: 'creative-agency',
        plan: PlanType.PRO,
        status: 'active',
        createdAt: new Date('2024-05-18'),
        owner: {
            name: 'Tom Wilson',
            email: 'tom@creativeagency.co'
        },
        stats: {
            users: 15,
            clients: 62,
            tasks: 287
        }
    },
    {
        id: 'org-8',
        name: 'Consulting Experts',
        slug: 'consulting-experts',
        plan: PlanType.BASIC,
        status: 'inactive',
        createdAt: new Date('2024-07-22'),
        owner: {
            name: 'Rachel Green',
            email: 'rachel@consultingexperts.com'
        },
        stats: {
            users: 4,
            clients: 12,
            tasks: 45
        }
    }
];
