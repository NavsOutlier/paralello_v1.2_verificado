// Client Integration Types

export type IntegrationProvider = 'tintim' | 'hotmart' | 'rdstation' | 'crm' | 'figma' | string;

export interface ClientIntegration {
    id: string;
    organization_id: string;
    client_id: string;
    provider: IntegrationProvider;
    customer_code?: string;
    security_token?: string;
    conversion_event?: string;
    conversion_event_id?: number;
    config?: Record<string, any>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface MarketingLead {
    id: string;
    organization_id: string;
    client_id: string;
    name?: string;
    phone: string;
    source?: string;
    first_interaction_at?: string;
    created_at: string;
}

export interface MarketingConversion {
    id: string;
    organization_id: string;
    client_id: string;
    name?: string;
    phone?: string;
    source?: string;
    first_contact_at?: string;
    converted_at: string;
    revenue: number;
    event_name?: string;
    provider: string;
    external_id?: string;
    created_at: string;
}

// For backwards compatibility, keep TintimConfig interface
export interface TintimConfig {
    customer_code?: string;
    security_token?: string;
    conversion_event?: string;
    conversion_event_id?: number;
}
