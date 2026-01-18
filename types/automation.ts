// Automation Module Types
// Generated from Supabase schema

export interface ScheduledReport {
    id: string;
    organization_id: string;
    client_id: string;
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    weekday?: number; // 0-6 (Sunday-Saturday)
    day_of_month?: number; // 1-31
    time_of_day: string; // HH:mm format
    metrics: string[]; // ['leads', 'conversions', 'cpl', 'revenue']
    template?: string;
    is_active: boolean;
    next_run?: string;
    last_run?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface ReportExecution {
    id: string;
    report_id: string;
    executed_at: string;
    message_sent?: string;
    status: 'success' | 'failed';
    error_message?: string;
}

export interface ScheduledMessage {
    id: string;
    organization_id: string;
    client_id: string;
    scheduled_at: string;
    message: string;
    category: 'holiday' | 'meeting' | 'payment' | 'reminder' | 'other';
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    sent_at?: string;
    created_by?: string;
    created_at: string;
}

export interface ActiveAutomation {
    id: string;
    organization_id: string;
    client_id: string;
    name: string;
    weekdays: number[]; // [1,2,3,4,5] = Mon-Fri
    time_of_day: string;
    context_days: number;
    assigned_approver?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ActiveSuggestion {
    id: string;
    automation_id: string;
    client_id: string;
    suggested_message: string;
    context_summary?: string;
    status: 'pending' | 'approved' | 'rejected' | 'sent';
    approved_by?: string;
    approved_at?: string;
    sent_at?: string;
    created_at: string;
}

export interface TaskStatusReport {
    id: string;
    task_id: string;
    old_status?: string;
    new_status?: string;
    completed_items: {
        item: string;
        created_now: boolean;
    }[];
    next_step?: string;
    generated_message?: string;
    sent_at?: string;
    created_by?: string;
    created_at: string;
}

// Metrics available for reporting
export const AVAILABLE_METRICS = [
    { key: 'leads', label: 'Leads', icon: 'Users' },
    { key: 'conversions', label: 'Conversões', icon: 'CheckCircle' },
    { key: 'cpl', label: 'CPL (Custo por Lead)', icon: 'DollarSign' },
    { key: 'revenue', label: 'Receita', icon: 'TrendingUp' },
    { key: 'investment', label: 'Investimento', icon: 'Wallet' },
    { key: 'conversion_rate', label: 'Taxa de Conversão', icon: 'Percent' },
] as const;

// Weekday labels
export const WEEKDAYS = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' },
] as const;

// Message categories
export const MESSAGE_CATEGORIES = [
    { value: 'holiday', label: 'Feriado', icon: 'Calendar' },
    { value: 'meeting', label: 'Reunião', icon: 'Video' },
    { value: 'payment', label: 'Pagamento', icon: 'CreditCard' },
    { value: 'reminder', label: 'Lembrete', icon: 'Bell' },
    { value: 'other', label: 'Outro', icon: 'MessageSquare' },
] as const;
