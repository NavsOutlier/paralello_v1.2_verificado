export interface BlBiLead {
    id: string;
    client_id?: string;
    organization_id?: string;
    name: string;
    phone: string;
    email?: string;
    status: string; // Map to funeral_stage_id or general status
    funnel_stage_id?: string;
    created_at: string;
    updated_at?: string;
    last_interaction?: string;
    assigned_to?: string;
    assigned_agent_id?: string;
    campaign_source?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    score?: number;
    lead_score?: number;
    tags?: string[];
    sentiment?: 'neutral' | 'satisfied' | 'unsatisfied' | 'very_unsatisfied';
    ai_sentiment?: string;
    sla_status?: string;
    last_message_preview?: string;
    last_message_content?: string;
    unreplied_since?: string;
    waiting_since?: string;
    meta_data?: Record<string, any>;
    entry_type?: 'manual' | 'bot' | 'imported';
}

export interface BlBiStage {
    id: string;
    client_id?: string;
    organization_id?: string;
    name: string;
    leadCount?: number;
    ai_enabled: boolean;
    followup_enabled: boolean;
    color: string;
    bg: string;
    border: string;
    is_fixed?: boolean;
    is_protected?: boolean;
    position?: number;
    sla_threshold_minutes?: number;
    stage_score?: number;
    description?: string;
}


export const MOCK_STAGES: BlBiStage[] = [];
export const MOCK_LEADS: BlBiLead[] = [];

