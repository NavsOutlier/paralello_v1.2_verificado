import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { BlBiLead, BlBiStage, MOCK_LEADS } from '../types';
import { LeadCard } from './LeadCard';
import { Settings, Plus, Bot, RotateCcw } from 'lucide-react';

interface FunnelBoardProps {
    stages: BlBiStage[];
    onUpdateStages: (stages: BlBiStage[]) => void;
    onOpenLeadAudit: (lead: BlBiLead) => void;
    onOpenStageConfig: (stageId: string) => void;
    onOpenLeadConfig: (lead: BlBiLead) => void;
    clientId: string;
}

export const FunnelBoard: React.FC<FunnelBoardProps> = ({
    stages,
    onUpdateStages,
    onOpenLeadAudit,
    onOpenStageConfig,
    onOpenLeadConfig,
    clientId
}) => {
    const [leads, setLeads] = useState<BlBiLead[]>(MOCK_LEADS);

    useEffect(() => {
        if (!clientId) return;
        fetchLeads();
    }, [clientId]);

    const fetchLeads = async () => {
        const { data } = await supabase
            .from('leads')
            .select('*')
            .eq('client_id', clientId);

        if (data) {
            setLeads(data.map(l => ({
                id: l.id,
                name: l.name,
                phone: l.phone,
                status: l.funnel_stage_id || 'new_lead',
                funnel_stage_id: l.funnel_stage_id,
                created_at: l.created_at,
                sentiment: l.ai_sentiment as any,
                score: l.lead_score,
                last_message_preview: l.last_message_content,
                unreplied_since: l.waiting_since
            })) as any);
        }
    };

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, stageId: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');

        // Update local state first (optimistic)
        setLeads(currentLeads =>
            currentLeads.map(lead =>
                lead.id === leadId
                    ? { ...lead, status: stageId as any, funnel_stage_id: stageId }
                    : lead
            )
        );

        // Persist change to database
        await supabase
            .from('leads')
            .update({ funnel_stage_id: stageId })
            .eq('id', leadId);
    };

    const toggleStageSetting = async (stageId: string, setting: 'ai_enabled' | 'followup_enabled') => {
        const currentStage = stages.find(s => s.id === stageId);
        if (!currentStage) return;

        const newValue = !currentStage[setting];

        // Update parent state (optimistic)
        const newStages = stages.map(s =>
            s.id === stageId ? { ...s, [setting]: newValue } : s
        );
        onUpdateStages(newStages);

        // Persist to database
        await supabase
            .from('funnel_stages')
            .update({ [setting]: newValue })
            .eq('id', stageId);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Board Toolbar */}
            <div className="flex items-center justify-between px-8 py-5 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">Fluxo Operacional Ativo</span>
                    </div>
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {leads.length} Leads Identificados
                    </div>
                </div>
            </div>

            {/* Scrolling Columns Area */}
            <div className="flex-1 flex overflow-x-auto gap-6 px-8 pb-8 select-none custom-scrollbar min-h-0">
                {stages.map((stage) => {
                    const stageLeads = leads.filter(l => l.status === stage.id || (stage.id === 'stage-1' && l.status === 'new_lead'));

                    return (
                        <div
                            key={stage.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.id)}
                            className="flex-shrink-0 w-[340px] flex flex-col bg-slate-900/40 rounded-[28px] border border-white/5 backdrop-blur-sm shadow-2xl overflow-hidden h-full"
                        >
                            {/* Column Header - Fixed Background as requested */}
                            <div className={`p-6 pb-5 shrink-0 border-b border-white/5 bg-gradient-to-b ${stage.bg.replace('/10', '/5')} to-transparent relative`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <h3 className={`font-black uppercase tracking-widest text-xs italic ${stage.color}`}>
                                            {stage.name}
                                        </h3>
                                        <div className="px-2 py-0.5 rounded bg-slate-800 border border-white/5">
                                            <span className="text-[10px] font-black text-white">
                                                {stageLeads.length}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onOpenStageConfig(stage.id)}
                                        className="text-slate-700 hover:text-white transition-all p-1 hover:bg-white/5 rounded-lg"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Modern Switch Toggles - Horizontal Layout */}
                                <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded-2xl border border-white/5">
                                    <div className="flex-1 flex items-center justify-between cursor-pointer group px-2 py-1.5 bg-slate-900/20 rounded-xl border border-white/5 hover:border-white/10 transition-all" onClick={() => toggleStageSetting(stage.id, 'ai_enabled')}>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Bot className={`w-3 h-3 flex-shrink-0 ${stage.ai_enabled ? 'text-emerald-400' : 'text-slate-600'}`} />
                                            <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${stage.ai_enabled ? 'text-emerald-400' : 'text-slate-500'} whitespace-nowrap`}>IA</span>
                                        </div>
                                        <div className={`w-7 h-4 rounded-full relative transition-all duration-300 flex-shrink-0 ${stage.ai_enabled ? 'bg-emerald-500/30' : 'bg-slate-800'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 shadow-sm ${stage.ai_enabled ? 'right-0.5 bg-emerald-400 shadow-emerald-500/50' : 'right-3.5 bg-slate-600'}`} />
                                        </div>
                                    </div>

                                    <div className="w-px h-6 bg-white/5 shrink-0" />

                                    <div className="flex-[1.5] flex items-center justify-between cursor-pointer group px-2 py-1.5 bg-slate-900/20 rounded-xl border border-white/5 hover:border-white/10 transition-all font-black" onClick={() => toggleStageSetting(stage.id, 'followup_enabled')}>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <RotateCcw className={`w-3 h-3 flex-shrink-0 ${stage.followup_enabled ? 'text-cyan-400' : 'text-slate-600'}`} />
                                            <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${stage.followup_enabled ? 'text-cyan-400' : 'text-slate-500'} whitespace-nowrap`}>Follow-up</span>
                                        </div>
                                        <div className={`w-7 h-4 rounded-full relative transition-all duration-300 flex-shrink-0 ${stage.followup_enabled ? 'bg-cyan-500/30' : 'bg-slate-800'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 shadow-sm ${stage.followup_enabled ? 'right-0.5 bg-cyan-400 shadow-cyan-500/50' : 'right-3.5 bg-slate-600'}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cards Container */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0 bg-slate-900/10">
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
                                    <div className="h-40 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[24px] text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] gap-3 bg-slate-800/5">
                                        <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center opacity-20">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                        Vazio
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
