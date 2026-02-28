import React, { useState } from 'react';
import { KanbanSquare, Users, BarChart3, Settings } from 'lucide-react';
import { FunnelBoard } from './Kanban/FunnelBoard';
import { StageConfigDrawer } from './Kanban/StageConfigDrawer';
import { LeadOmniPanel } from './LeadCRM/LeadOmniPanel';
import { HybridManager } from './Settings/HybridManager';
import { BiMetricsDashboard } from './Analytics/BiMetricsDashboard';
import { BlBiLead } from './types';
export const BlackBIConsole: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'funnel' | 'team' | 'metrics'>('funnel');
    const [configDrawerStageId, setConfigDrawerStageId] = useState<string | null>(null);
    const [selectedLeadAudit, setSelectedLeadAudit] = useState<BlBiLead | null>(null);

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0f1a] text-slate-200 p-6 overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyan-500/10">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tight">
                        Black BI Studio
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Centro de Controle Híbrido: Otimização Tática de Funil
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-lg border border-white/5">
                    <button
                        onClick={() => setActiveTab('funnel')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'funnel'
                            ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                            }`}
                    >
                        <KanbanSquare className="w-4 h-4" />
                        Funil de Operações
                    </button>
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'team'
                            ? 'bg-gradient-to-r from-orange-500/20 to-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Gestão Híbrida
                    </button>
                    <button
                        onClick={() => setActiveTab('metrics')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'metrics'
                            ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Métricas Avançadas
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'funnel' && (
                    <FunnelBoard
                        onOpenLeadAudit={(lead) => setSelectedLeadAudit(lead)}
                        onOpenStageConfig={(stageId) => setConfigDrawerStageId(stageId)}
                        onOpenLeadConfig={(lead) => console.log('Open Lead Config', lead.id)}
                    />
                )}

                {/* Drawers and Modals Overlays */}
                <StageConfigDrawer
                    isOpen={!!configDrawerStageId}
                    onClose={() => setConfigDrawerStageId(null)}
                    stageId={configDrawerStageId || ''}
                />

                <LeadOmniPanel
                    isOpen={!!selectedLeadAudit}
                    onClose={() => setSelectedLeadAudit(null)}
                    lead={selectedLeadAudit}
                />

                {activeTab === 'team' && (
                    <div className="h-full w-full">
                        <HybridManager />
                    </div>
                )}

                {activeTab === 'metrics' && (
                    <div className="h-full w-full">
                        <BiMetricsDashboard />
                    </div>
                )}
            </div>
        </div>
    );
};
