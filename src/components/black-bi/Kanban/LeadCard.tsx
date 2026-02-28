import React from 'react';
import { Settings, MessageSquare, Clock, Zap } from 'lucide-react';
import { BlBiLead } from '../types';

interface LeadCardProps {
    lead: BlBiLead;
    onDragStart: (e: React.DragEvent, leadId: string) => void;
    onActionClick: (lead: BlBiLead, action: 'config' | 'audit') => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onDragStart, onActionClick }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
            className="bg-slate-900 border border-slate-700/50 hover:border-cyan-500/50 p-3 rounded-none shadow-xl cursor-grab active:cursor-grabbing group transition-all"
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-slate-200 text-sm truncate max-w-[140px]">{lead.name}</h4>
                    <span className="text-xs text-slate-500 font-mono">{lead.phone}</span>
                </div>
                {lead.score && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400 font-bold">
                        {lead.score}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1.5 mb-3">
                {lead.tags?.map(tag => (
                    <span key={tag} className="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 font-medium uppercase">
                        {tag}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between mt-4 relative">
                <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 ${lead.assigned_to === 'AI' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500'}`} />
                    <span className="text-[10px] text-slate-400 font-medium">
                        {lead.assigned_to || 'Routing...'}
                    </span>
                </div>

                {/* Actions that appear on hover */}
                <div className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900 pl-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onActionClick(lead, 'audit'); }}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                        title="Auditoria & OmniPanel"
                    >
                        <MessageSquare className="w-3 h-3" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onActionClick(lead, 'config'); }}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-orange-400 transition-colors"
                        title="Gatilhos Rápidos"
                    >
                        <Zap className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};
