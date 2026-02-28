export interface BlBiLead {
    id: string;
    name: string;
    phone: string;
    status: 'new_lead' | 'interested' | 'qualified' | 'scheduled' | 'lost' | 'disqualified';
    created_at: string;
    last_interaction?: string;
    assigned_to?: string; // Human or 'AI'
    campaign_source?: string;
    score?: number;
    tags?: string[];
}

export interface BlBiStage {
    id: string;
    name: string;
    color: string;
}

export const FUNNEL_STAGES: BlBiStage[] = [
    { id: 'new_lead', name: 'Novos Leads', color: 'bg-emerald-500' },
    { id: 'interested', name: 'Interessados', color: 'bg-cyan-500' },
    { id: 'qualified', name: 'Qualificados', color: 'bg-indigo-500' },
    { id: 'scheduled', name: 'Agendados', color: 'bg-orange-500' },
    { id: 'lost', name: 'Perdidos', color: 'bg-rose-500' },
    { id: 'disqualified', name: 'Desqualificados', color: 'bg-slate-500' }
];

export const MOCK_LEADS: BlBiLead[] = [
    { id: 'l1', name: 'Carlos Silva', phone: '+5511999999999', status: 'new_lead', created_at: new Date().toISOString(), assigned_to: 'AI', score: 85, tags: ['high_priority'] },
    { id: 'l2', name: 'Ana Souza', phone: '+5511888888888', status: 'interested', created_at: new Date().toISOString(), assigned_to: 'João Vendedor', score: 60 },
    { id: 'l3', name: 'Empresa XPTO', phone: '+5511777777777', status: 'qualified', created_at: new Date().toISOString(), tags: ['B2B'] },
];
