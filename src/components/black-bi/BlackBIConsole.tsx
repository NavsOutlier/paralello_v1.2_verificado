import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import {
    LayoutDashboard,
    Users,
    BarChart3,
    Settings,
    Cpu,
    ChevronRight,
    Sparkles,
    ActivitySquare,
    Send
} from 'lucide-react';
import { BlBiStage, MOCK_STAGES, BlBiLead } from './types';
import { FunnelBoard } from './Kanban/FunnelBoard';
import { LeadOmniPanel } from './LeadCRM/LeadOmniPanel';
import { BiMetricsDashboard } from './Analytics/BiMetricsDashboard';
import { HybridManager } from './Settings/HybridManager';
import { StageConfigDrawer } from './Kanban/StageConfigDrawer';
import { StageManagementModal } from './Kanban/StageManagementModal';
import { ClientSidebar } from './ClientSidebar';
import { CommercialMetricsTable } from './Analytics/CommercialMetricsTable';
import { ColdDispatchTool } from '../../../components/leads/ColdDispatchTool';
import { LeadsConfig } from '../../../components/leads/LeadsConfig';

type BITab = 'funnel' | 'leads' | 'reports' | 'dispatch' | 'hybrid';

interface Client {
    id: string;
    name: string;
}

export const BlackBIConsole: React.FC = () => {
    const { organizationId } = useAuth();
    const [activeTab, setActiveTab] = useState<BITab>('funnel');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [stages, setStages] = useState<BlBiStage[]>(MOCK_STAGES);
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<BlBiLead | null>(null);
    const [showStageManager, setShowStageManager] = useState(false);

    useEffect(() => {
        if (!selectedClient) return;
        fetchStages();
    }, [selectedClient, activeTab]);

    const fetchStages = async () => {
        if (!selectedClient) return;

        // Fetch stages
        const { data: stagesData } = await supabase
            .from('funnel_stages')
            .select('*')
            .eq('client_id', selectedClient.id)
            .order('position');

        if (stagesData && stagesData.length > 0) {
            // Count leads for these stages
            const { data: leadsData } = await supabase
                .from('leads')
                .select('funnel_stage_id')
                .eq('client_id', selectedClient.id);

            const counts = (leadsData || []).reduce((acc: any, lead: any) => {
                const stageId = lead.funnel_stage_id || 'new_lead';
                acc[stageId] = (acc[stageId] || 0) + 1;
                return acc;
            }, {});

            setStages(stagesData.map(s => ({
                ...s,
                leadCount: counts[s.id] || 0
            })) as any);
        } else {
            setStages(MOCK_STAGES);
        }
    };

    const handleUpdateStages = async (newStages: BlBiStage[]) => {
        if (!selectedClient || !organizationId) return;

        // Apply optimistic update
        setStages(newStages);

        // 1. Identify deleted stages
        const currentStageIds = stages.filter(s => !s.id.startsWith('stage_')).map(s => s.id);
        const newStageIds = newStages.map(s => s.id);
        const deletedIds = currentStageIds.filter(id => !newStageIds.includes(id));

        if (deletedIds.length > 0) {
            await supabase.from('funnel_stages').delete().in('id', deletedIds);
        }

        // 2. Upsert/Update remaining stages
        for (let i = 0; i < newStages.length; i++) {
            const stage = newStages[i];
            const isNew = stage.id.startsWith('stage_');

            const dataToSave = {
                client_id: selectedClient.id,
                organization_id: organizationId,
                name: stage.name,
                color: stage.color,
                bg: stage.bg,
                border: stage.border,
                ai_enabled: stage.ai_enabled,
                followup_enabled: stage.followup_enabled,
                position: i,
                is_fixed: stage.is_fixed || false,
                is_protected: stage.is_protected || false,
                sla_threshold_minutes: stage.sla_threshold_minutes || 0,
                stage_score: stage.stage_score || 0
            };

            if (isNew) {
                await supabase.from('funnel_stages').insert(dataToSave);
            } else {
                await supabase.from('funnel_stages').update(dataToSave).eq('id', stage.id);
            }
        }

        // Final re-fetch to get real UUIDs for new stages
        fetchStages();
    };

    const tabs = [
        { id: 'funnel' as const, label: 'Funil Kanban', icon: LayoutDashboard },
        { id: 'dispatch' as const, label: 'Disparos', icon: Send },
        { id: 'reports' as const, label: 'Relatórios & Metas', icon: ActivitySquare },
        { id: 'hybrid' as const, label: 'CRM Config', icon: Cpu },
    ];

    const [dispatchSubTab, setDispatchSubTab] = useState<'tool' | 'config'>('tool');

    return (
        <div className="h-full w-full flex bg-slate-950 font-sans text-slate-200 overflow-hidden">
            {/* Client Selection Sidebar */}
            <ClientSidebar
                selectedClientId={selectedClient?.id || null}
                onSelectClient={setSelectedClient}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 font-sans">
                {/* Dashboard Header */}
                <div className="px-8 py-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="p-3.5 bg-gradient-to-br from-cyan-500 to-fuchsia-600 rounded-[22px] shadow-2xl shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-500">
                                <LayoutDashboard className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                                    Black <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">BI</span>
                                </h1>
                                <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Protocolo v1.2</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    {selectedClient ? `Cliente: ${selectedClient.name}` : 'Módulo Especialista'}
                                    <ChevronRight className="w-3 h-3 text-slate-700" />
                                    {tabs.find(t => t.id === activeTab)?.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex p-1.5 bg-slate-950/60 rounded-[20px] border border-white/5 shadow-inner">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-[15px] transition-all duration-300 relative group ${isActive
                                            ? 'bg-gradient-to-r from-cyan-500/15 to-fuchsia-500/15 text-white border border-white/10 shadow-lg'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 transition-transform duration-500 ${isActive ? 'rotate-[-10deg]' : 'group-hover:scale-110'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                                        {isActive && (
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full blur-[1px]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="h-10 w-px bg-white/5 mx-2" />

                        <button
                            onClick={() => setShowStageManager(true)}
                            className="p-3 bg-slate-900 border border-white/5 rounded-2xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all shadow-xl group"
                        >
                            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative bg-slate-950/20">
                    {selectedClient ? (
                        <div className="h-full w-full custom-scrollbar overflow-x-auto overflow-y-hidden flex flex-col">
                            {activeTab === 'funnel' && (
                                <FunnelBoard
                                    stages={stages}
                                    onUpdateStages={handleUpdateStages}
                                    onOpenLeadAudit={setSelectedLead}
                                    onOpenStageConfig={setSelectedStage}
                                    onOpenLeadConfig={setSelectedLead}
                                    clientId={selectedClient.id}
                                />
                            )}
                            {activeTab === 'reports' && <div className="p-8 h-full overflow-y-auto"><CommercialMetricsTable clientId={selectedClient.id} /></div>}
                            {activeTab === 'dispatch' && (
                                <div className="p-8 h-full overflow-y-auto">
                                    <div className="max-w-4xl mx-auto mb-10 flex justify-center">
                                        <div className="inline-flex p-1 bg-slate-900/60 rounded-2xl border border-white/5 shadow-inner">
                                            <button
                                                onClick={() => setDispatchSubTab('tool')}
                                                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dispatchSubTab === 'tool' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                Painel de Envio
                                            </button>
                                            <button
                                                onClick={() => setDispatchSubTab('config')}
                                                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dispatchSubTab === 'config' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                Canais & Templates
                                            </button>
                                        </div>
                                    </div>

                                    {dispatchSubTab === 'tool' ? (
                                        <ColdDispatchTool
                                            key={`dispatch-${selectedClient.id}`}
                                            preselectedClientId={selectedClient.id}
                                        />
                                    ) : (
                                        <LeadsConfig selectedClientId={selectedClient.id} />
                                    )}
                                </div>
                            )}
                            {activeTab === 'hybrid' && <div className="p-8 h-full overflow-y-auto"><HybridManager clientId={selectedClient.id} /></div>}
                        </div>
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center p-8 space-y-6">
                            <div className="w-24 h-24 bg-slate-900/50 rounded-[32px] flex items-center justify-center border border-cyan-500/10 relative group">
                                <Users className="w-10 h-10 text-slate-700 group-hover:text-cyan-500 transition-colors" />
                                <div className="absolute inset-0 bg-cyan-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Selecione um <span className="text-cyan-400">Cliente</span></h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                                    Escolha uma empresa na barra lateral para carregar os dados do funil e métricas avançadas.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals & Overlays */}
            <StageConfigDrawer
                isOpen={!!selectedStage}
                onClose={() => setSelectedStage(null)}
                stageId={selectedStage || ''}
                clientId={selectedClient?.id || ''}
            />

            <StageManagementModal
                isOpen={showStageManager}
                onClose={() => setShowStageManager(false)}
                stages={stages}
                onUpdateStages={handleUpdateStages}
            />

            {selectedLead && (
                <LeadOmniPanel
                    isOpen={!!selectedLead}
                    onClose={() => setSelectedLead(null)}
                    lead={selectedLead}
                />
            )}
        </div>
    );
};
