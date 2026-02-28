import React from 'react';
import { Smile, Meh, Frown, Clock, Zap, Info, Target, Facebook, Globe, Flame } from 'lucide-react';
import { BlBiLead } from '../types';

interface LeadCardProps {
    lead: BlBiLead;
    onDragStart: (e: React.DragEvent, leadId: string) => void;
    onActionClick: (lead: BlBiLead, action: 'config' | 'audit') => void;
}

const SENTIMENT_CONFIG = {
    satisfied: { color: 'border-emerald-500', icon: Smile, label: 'MUITO SATISFEITO', textColor: 'text-emerald-400' },
    neutral: { color: 'border-amber-500', icon: Meh, label: 'NEUTRO', textColor: 'text-amber-400' },
    unsatisfied: { color: 'border-orange-500', icon: Frown, label: 'INSATISFEITO', textColor: 'text-orange-400' },
    very_unsatisfied: { color: 'border-rose-500', icon: Frown, label: 'MUITO INSATISFEITO', textColor: 'text-rose-400' }
};

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onDragStart, onActionClick }) => {
    const sentiment = lead.sentiment || 'neutral';
    const config = SENTIMENT_CONFIG[sentiment];
    const SentimentIcon = config.icon;

    const getWaitTime = () => {
        if (!lead.unreplied_since) return '0 min';
        const diffMs = Date.now() - new Date(lead.unreplied_since).getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins} min`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        return `${Math.floor(diffHours / 24)}d`;
    };

    const waitTime = getWaitTime();

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
            className={`
                bg-slate-900/80 border border-white/5 rounded-2xl p-4 shadow-xl cursor-grab active:cursor-grabbing group transition-all relative
                border-l-4 ${config.color} hover:bg-slate-800/90
            `}
        >
            {/* Main Header Content */}
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center relative shrink-0 mt-1">
                    <span className="text-white font-black text-sm uppercase">{lead.name.charAt(0)}</span>
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <h4 className="font-black text-white text-[13px] uppercase tracking-tighter truncate italic leading-none">
                                {lead.name}
                            </h4>
                            <SentimentIcon className={`w-3.5 h-3.5 ${config.textColor} shrink-0`} />
                            {lead.score && lead.score >= 80 && (
                                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20 animate-pulse shrink-0" />
                            )}
                        </div>

                        {/* Score at far right */}
                        <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5 shadow-inner shrink-0">
                            <Target className="w-3 h-3 text-cyan-400" />
                            <span className="text-[10px] font-black text-white italic leading-none">{lead.score || 0}</span>
                        </div>
                    </div>

                    {/* KPIs row below name (Wait Time & SLA) */}
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {/* Wait Time */}
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{waitTime}</span>
                        </div>

                        {/* SLA Status */}
                        {lead.sla_status && (
                            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-black text-rose-400 uppercase tracking-tighter shadow-[0_0_8px_rgba(244,63,94,0.15)]">
                                <Zap className="w-3 h-3 fill-rose-400" /> {lead.sla_status}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Message Preview */}
            <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl mb-4 relative overflow-hidden group-hover:bg-slate-950/40">
                <p className="text-[11px] text-slate-400 font-medium italic leading-relaxed">
                    "{lead.last_message_preview}"
                </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 min-h-[24px]">
                    {lead.campaign_source && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${lead.campaign_source === 'meta'
                                ? 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                                : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                            {lead.campaign_source === 'meta' ? <Facebook className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                                {lead.campaign_source === 'meta' ? 'META ADS' : 'GOOGLE ADS'}
                            </span>
                        </div>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onActionClick(lead, 'audit'); }}
                    className="flex items-center gap-2 text-slate-600 hover:text-white transition-all group/btn"
                >
                    <Info className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Info</span>
                </button>
            </div>
        </div>
    );
};
