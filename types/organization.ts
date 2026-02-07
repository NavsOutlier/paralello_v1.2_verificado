/**
 * Organization Domain Types
 */

/**
 * Plan Type Enum - Aligned with billing system
 */
export enum PlanType {
    GESTOR_SOLO = 'gestor_solo',
    AGENCIA = 'agencia',
    ENTERPRISE = 'enterprise'
}

/**
 * Plan Interface
 */
export interface Plan {
    id: PlanType;
    name: string;
    price: number;
    pricePerClient: number;
    maxUsers: number;
    maxClients: number;
    features: string[];
}

/**
 * Organization Interface
 */
export interface Organization {
    id: string;
    name: string;
    slug: string;
    plan: PlanType;
    status: 'active' | 'inactive';
    createdAt: Date;
    owner: {
        name: string;
        email: string;
    };
    billingDocument?: string;
    billingEmail?: string;
    billingPhone?: string;
    activateBilling?: boolean;
    asaasStatus?: 'active' | 'past_due' | 'suspended' | 'canceled';
    trialEndsAt?: Date;
    maxUsers?: number;
    contractedClients?: number;
    billingValue?: number;
    stats: {
        users: number;
        clients: number;
        tasks: number;
    };
    onboardingStatus?: {
        isOwnerInvited: boolean;
        isOwnerActive: boolean;
        isWhatsAppConnected: boolean;
    };
}

/**
 * Team Member Interface
 */
export interface TeamMember {
    id: string;
    organizationId: string;
    profileId: string;
    profile?: {
        name: string;
        email: string;
        avatarUrl?: string;
    };
    role: 'manager' | 'member' | 'viewer';
    permissions: {
        canManageClients: boolean;
        canManageTasks: boolean;
        canManageTeam: boolean;
        canManageMarketing: boolean;
        canManageAutomation: boolean;
        canManageAIAgents: boolean;
    };
    jobTitle?: string;
    status: 'active' | 'inactive' | 'pending';
    invitedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Client Interface
 */
export interface Client {
    id: string;
    organizationId: string;
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    avatarUrl?: string;
    status: 'active' | 'inactive';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    whatsappGroupId?: string;
}
