import React, { useState } from 'react';
import { BlBiLead, FUNNEL_STAGES, MOCK_LEADS } from '../types';
import { LeadCard } from './LeadCard';

interface FunnelBoardProps {
    onOpenLeadAudit: (lead: BlBiLead) => void;
    onOpenStageConfig: (stageId: string) => void;
    onOpenLeadConfig: (lead: BlBiLead) => void;
}

export const FunnelBoard: React.FC<FunnelBoardProps> = ({ onOpenLeadAudit, onOpenStageConfig, onOpenLeadConfig }) => {
    const [leads, setLeads] = useState<BlBiLead[]>(MOCK_LEADS);

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, stageId: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');

        // Update lead status
        setLeads(currentLeads =>
            currentLeads.map(lead =>
                lead.id === leadId
                    ? { ...lead, status: stageId as BlBiLead['status'] }
                    : lead
            )
        );
    };

    return (
        <div className="flex h-[calc(100vh-140px)] w-full overflow-x-auto overflow-y-hidden gap-4 pb-4 px-2 select-none custom-scrollbar">
            {FUNNEL_STAGES.map((stage) => {
                const stageLeads = leads.filter(l => l.status === stage.id);

                return (
                    <div
                        key={stage.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, stage.id)}
                        className="flex flex-col min-w-[300px] max-w-[300px] h-full bg-slate-900/40 border border-white/5"
                    >
                        {/* Column Header */}
                        <div className={`p-4 border-t-2 ${stage.color.replace('bg-', 'border-')} flex flex-col gap-2 bg-slate-900/60`}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm">
                                    {stage.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded-sm">
                                        {stageLeads.length}
                                    </span>
                                    <button
                                        onClick={() => onOpenStageConfig(stage.id)}
                                        className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                                        title="Configurar Etapa"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Visual Indicator of Followups/AI */}
                            <div className="flex items-center gap-1.5 opacity-60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                                <span className="text-[10px] text-slate-400 font-mono">IA: ON</span>
                                <span className="mx-1 text-slate-600">|</span>
                                <span className="text-[10px] text-slate-400 font-mono">2 Gatilhos</span>
                            </div>
                        </div>

                        {/* Cards Container */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {stageLeads.map(lead => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onDragStart={handleDragStart}
                                    onActionClick={(lead, action) => {
                                        if (action === 'audit') onOpenLeadAudit(lead);
                                        if (action === 'config') onOpenLeadConfig(lead);
                                    }}
                                />
                            ))}

                            {stageLeads.length === 0 && (
                                <div className="h-24 flex items-center justify-center border border-dashed border-white/5 text-slate-600 text-xs font-mono">
                                    Vazio
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
