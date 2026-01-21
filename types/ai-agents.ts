/**
 * AI Agent Types
 * 
 * Type definitions for the AI Agent Metrics module
 */

// =====================
// Database Models
// =====================

export interface AIAgent {
    id: string;
    organization_id: string;
    client_id: string;
    name: string;
    provider: 'openai' | 'anthropic' | 'custom';
    api_endpoint?: string;
    webhook_metrics_url?: string;
    webhook_prompt_url?: string;
    api_key_hash?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined data
    client?: {
        id: string;
        name: string;
    };
}

export interface AIAgentMetrics {
    id: string;
    agent_id: string;
    metric_date: string;
    metric_hour: number | null;

    // Volume metrics
    total_conversations: number;
    active_conversations: number;
    resolved_conversations: number;
    escalated_conversations: number;
    abandoned_conversations: number;

    // Time metrics (seconds)
    avg_response_time: number | null;
    avg_resolution_time: number | null;
    min_response_time: number | null;
    max_response_time: number | null;

    // Quality metrics
    avg_csat_score: number | null;
    csat_responses: number;
    fallback_count: number;
    total_messages: number;
    messages_per_conversation: number | null;

    // Cost metrics
    tokens_input: number;
    tokens_output: number;
    estimated_cost_brl: number;

    // Channel breakdown
    channel_breakdown: Record<string, number>;

    // Funnel metrics
    funnel_total: number;
    funnel_existing_patient: number;
    funnel_new_interested: number;
    funnel_qualified: number;
    funnel_scheduled: number;
    funnel_disqualified: number;
    funnel_no_response: number;

    created_at: string;
}

export interface AIAgentPromptSection {
    id: string;
    agent_id: string;
    section_key: string;
    section_name: string;
    section_description?: string;
    section_order: number;
    content: string;
    content_format: 'markdown' | 'plain' | 'json';
    is_active: boolean;
    is_required: boolean;
    sync_status: 'synced' | 'pending' | 'error';
    last_sync_at: string | null;
    last_sync_error: string | null;
    created_at: string;
    updated_at: string;
}

export interface AIAgentPromptHistory {
    id: string;
    section_id: string;
    content: string;
    changed_by: string | null;
    change_reason?: string;
    created_at: string;
    // Joined data
    user?: {
        full_name: string;
    };
}

// =====================
// Component Props
// =====================

export interface AgentMetricsCardsProps {
    agentId: string;
    dateRange?: {
        start: Date;
        end: Date;
    };
}

export interface AgentMetricsChartProps {
    agentId: string;
    metricType: 'conversations' | 'resolution' | 'tokens' | 'csat';
    period: 'day' | 'week' | 'month';
}

export interface AgentPromptEditorProps {
    agentId: string;
    sectionId?: string;
    onSave?: () => void;
}

export interface AgentConfigProps {
    agent?: AIAgent;
    clientId: string;
    onSave?: (agent: AIAgent) => void;
    onClose: () => void;
}

// =====================
// API Payloads
// =====================

export interface CreateAgentPayload {
    client_id: string;
    name: string;
    provider?: 'openai' | 'anthropic' | 'custom';
    api_endpoint?: string;
    webhook_metrics_url?: string;
    webhook_prompt_url?: string;
}

export interface UpdateAgentPayload {
    name?: string;
    provider?: 'openai' | 'anthropic' | 'custom';
    api_endpoint?: string;
    webhook_metrics_url?: string;
    webhook_prompt_url?: string;
    is_active?: boolean;
}

export interface CreatePromptSectionPayload {
    agent_id: string;
    section_key: string;
    section_name: string;
    section_description?: string;
    section_order?: number;
    content: string;
    content_format?: 'markdown' | 'plain' | 'json';
}

export interface UpdatePromptSectionPayload {
    section_name?: string;
    section_description?: string;
    section_order?: number;
    content?: string;
    is_active?: boolean;
}

// =====================
// Dashboard State
// =====================

export interface AIAgentDashboardState {
    selectedAgentId: string | null;
    activeTab: 'metrics' | 'prompts' | 'config' | 'reports';
    dateRange: {
        start: Date;
        end: Date;
    };
    isLoading: boolean;
}

// =====================
// Aggregated Stats
// =====================

export interface AgentKPIs {
    totalConversations: number;
    resolutionRate: number;
    avgResponseTime: number;
    avgCsatScore: number | null;
    totalCost: number;
    activeConversations: number;
    escalationRate: number;
    abandonRate: number;
    tokensUsed: number;
    avgMessagesPerConversation: number;
}

export interface AgentTrend {
    date: string;
    hour?: number;
    value: number;
}

export type ConversationStatus = 'new' | 'interested' | 'qualified' | 'scheduled' | 'patient' | 'no_response' | 'lost' | 'disqualified';

export interface AIConversation {
    id: string;
    agent_id: string;
    contact_identifier: string; // Phone or Email
    contact_name?: string;
    contact_phone?: string;
    status: ConversationStatus;
    summary?: string;
    last_interaction_at: string;
    is_manual_override: boolean;
    created_at: string;
    updated_at: string;
}
