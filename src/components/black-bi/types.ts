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

export const MOCK_STAGES: BlBiStage[] = [
    {
        id: 'stage-fixed-forms',
        name: 'Novos leads forms',
        leadCount: 12,
        ai_enabled: true,
        followup_enabled: false,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        is_fixed: true,
        sla_threshold_minutes: 10,
        stage_score: 5
    },
    {
        id: 'stage-fixed-whatsapp',
        name: 'Novas leads whatsapp',
        leadCount: 8,
        ai_enabled: true,
        followup_enabled: true,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        is_fixed: true,
        sla_threshold_minutes: 5,
        stage_score: 10
    },
    {
        id: 'stage-protected-conversion',
        name: 'Conversão realizada!',
        leadCount: 5,
        ai_enabled: false,
        followup_enabled: true,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        is_protected: true,
        sla_threshold_minutes: 60,
        stage_score: 100
    },
    {
        id: 'stage-4',
        name: 'Agendados',
        leadCount: 6,
        ai_enabled: false,
        followup_enabled: false,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        sla_threshold_minutes: 30,
        stage_score: 50
    },
    {
        id: 'stage-5',
        name: 'Perdidos',
        leadCount: 4,
        ai_enabled: false,
        followup_enabled: false,
        color: 'text-slate-400',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        sla_threshold_minutes: 0,
        stage_score: 0
    },
    {
        id: 'stage-6',
        name: 'Desqualificados',
        leadCount: 4,
        ai_enabled: false,
        followup_enabled: false,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        sla_threshold_minutes: 0,
        stage_score: 0
    },
];

export const MOCK_LEADS: BlBiLead[] = [
    // Novos leads forms
    {
        id: 'l7',
        name: 'ANA PAULA SOUZA',
        phone: '+5511988112233',
        status: 'stage-fixed-forms' as any,
        created_at: '2026-02-28T14:10:00Z',
        assigned_to: 'AI',
        sentiment: 'neutral',
        campaign_source: 'google',
        score: 45,
        last_message_preview: 'Vi o formulário no Facebook. Quero saber sobre o plano Enterprise.',
        unreplied_since: new Date(Date.now() - 15 * 60000).toISOString() // 15 min ago
    },
    {
        id: 'l8',
        name: 'CARLOS EDUARDO',
        phone: '+5511977223344',
        status: 'stage-fixed-forms' as any,
        created_at: '2026-02-28T10:00:00Z',
        assigned_to: 'Human',
        sentiment: 'satisfied',
        campaign_source: 'meta',
        score: 85,
        sla_status: '1.5X SLA',
        last_message_preview: 'Obrigado pelo retorno rápido. Vou preencher os dados agora.'
    },
    // Novas leads whatsapp
    {
        id: 'l1',
        name: 'MARCOS SILVA',
        phone: '+5511999999999',
        status: 'stage-fixed-whatsapp' as any,
        created_at: '2026-02-28T11:04:00Z',
        assigned_to: 'AI',
        sentiment: 'neutral',
        campaign_source: 'meta',
        score: 92,
        last_message_preview: 'Primeiro contato via anúncio Meta. Perguntou sobre preços de gestão de tráfego.',
        unreplied_since: new Date(Date.now() - 45 * 60000).toISOString() // 45 min ago
    },
    {
        id: 'l9',
        name: 'BEATRIZ OLIVEIRA',
        phone: '+5511966334455',
        status: 'stage-fixed-whatsapp' as any,
        created_at: '2026-02-28T13:45:00Z',
        assigned_to: 'AI',
        sentiment: 'satisfied',
        campaign_source: 'google',
        score: 110,
        last_message_preview: 'Amei a explicação da IA! Gostaria de agendar uma call.',
        unreplied_since: new Date(Date.now() - 2 * 60000).toISOString() // 2 min ago
    },
    // ... other leads can have unreplied_since or not
    {
        id: 'l4',
        name: 'DR. FELIPE CASTRO',
        phone: '+5511666666666',
        status: 'stage-protected-conversion' as any,
        created_at: '2026-02-28T11:04:00Z',
        sentiment: 'satisfied',
        campaign_source: 'meta',
        score: 150,
        last_message_preview: 'Contrato assinado! Vamos começar a implementação o quanto antes.'
    },
    {
        id: 'l10',
        name: 'PROJETO ALFA LTDA',
        phone: '+5511955445566',
        status: 'stage-protected-conversion' as any,
        created_at: '2026-02-25T09:30:00Z',
        sentiment: 'satisfied',
        last_message_preview: 'Pagamento do setup aprovado. Aguardando o onboarding.'
    },
    // Agendados
    {
        id: 'l11',
        name: 'ROBERTO ALMEIDA',
        phone: '+5511944556677',
        status: 'stage-4' as any,
        created_at: '2026-02-28T10:15:00Z',
        sentiment: 'neutral',
        last_message_preview: 'Confirmado para amanhã às 10h. Enviar o link do Google Meet.',
        unreplied_since: new Date(Date.now() - 120 * 60000).toISOString() // 2h ago
    },
    // Perdidos
    {
        id: 'l2',
        name: 'RICARDO GOMES',
        phone: '+5511888888888',
        status: 'stage-5' as any,
        created_at: '2026-02-28T11:04:00Z',
        assigned_to: 'Human',
        sentiment: 'unsatisfied',
        sla_status: '2X SLA',
        last_message_preview: 'Achou caro. Pediu desconto impossível.',
        unreplied_since: new Date(Date.now() - 1440 * 60000).toISOString() // 24h ago
    },
    {
        id: 'l5',
        name: 'LARISSA MOURA',
        phone: '+5511555555555',
        status: 'stage-5' as any,
        created_at: '2026-02-22T10:59:00Z',
        sentiment: 'very_unsatisfied',
        sla_status: '3X SLA',
        last_message_preview: 'Reclamou do atendimento robótico e da demora no retorno.',
        unreplied_since: new Date(Date.now() - 300 * 60000).toISOString() // 5h ago
    },
    // Desqualificados
    {
        id: 'l3',
        name: 'HENRIQUE DIAS',
        phone: '+5511777777777',
        status: 'stage-6' as any,
        created_at: '2026-02-20T10:59:00Z',
        sentiment: 'unsatisfied',
        last_message_preview: 'Sem budget. Empresa pré-revenue e sem estrutura de vendas.'
    },
    {
        id: 'l6',
        name: 'AMANDA RIBEIRO',
        phone: '+5511444444444',
        status: 'stage-6' as any,
        created_at: '2026-02-19T10:59:00Z',
        sentiment: 'neutral',
        last_message_preview: 'Freelancer procurando emprego, não lead. Ofereceu seus serviços.'
    },
];
