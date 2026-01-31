import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Search, Filter, Plus, GripVertical, Calendar,
    MessageSquare, User, Tag, Clock, CheckCircle2,
    AlertCircle, MoreHorizontal, ChevronRight, X,
    Frown, Meh, Smile, Zap, Sparkles
} from 'lucide-react';
import { Avatar } from '../ui';
import { format } from 'date-fns';

interface FunnelStage {
    id: string;
    label: string;
    color: string;
    bg: string;
    border: string;
}

interface WorkerConversation {
    id: string;
    session_id: string;
    client_id: string;
    agent_id: string;
    status: 'active' | 'completed' | 'expired';
    funnel_stage: string;
    created_at: string;
    updated_at: string;
    metadata: any;
    summary?: string;
    contact_info?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    sentiment_score?: number;
    last_message_by?: 'ai' | 'lead' | 'support';
    last_message_at?: string;
    sla_breach_count?: number;
    loss_reason?: string;
}

interface WorkerKanbanBoardProps {
    agentId: string;
    onViewAudit?: (sessionId: string) => void;
}

const DEFAULT_FUNNEL_STAGES: FunnelStage[] = [
    { id: 'new_lead', label: 'Novos', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    { id: 'interested', label: 'Interessados', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { id: 'qualified', label: 'Qualificados', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { id: 'scheduled', label: 'Agendados', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { id: 'lost', label: 'Perdido', color: 'text-slate-500', bg: 'bg-slate-700/10', border: 'border-slate-700/20' },
    { id: 'disqualified', label: 'Desqualificados', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
];

const getSentimentConfig = (score?: number) => {
    if (score === undefined || score === null) return { color: 'text-slate-500', border: 'border-l-slate-700', icon: Meh, label: 'NEUTRO' };
    if (score <= -0.6) return { color: 'text-rose-500', border: 'border-l-rose-500', icon: Frown, label: 'MUITO INSATISFEITO' };
    if (score <= -0.1) return { color: 'text-orange-400', border: 'border-l-orange-400', icon: Frown, label: 'INSATISFEITO' };
    if (score < 0.2) return { color: 'text-amber-400', border: 'border-l-amber-400', icon: Meh, label: 'NEUTRO' };
    if (score < 0.6) return { color: 'text-emerald-400', border: 'border-l-emerald-400', icon: Smile, label: 'SATISFEITO' };
    return { color: 'text-green-500', border: 'border-l-green-500', icon: Smile, label: 'MUITO SATISFEITO' };
};

export const WorkerKanbanBoard: React.FC<WorkerKanbanBoardProps> = ({ agentId, onViewAudit }) => {
    const { organizationId } = useAuth();
    const [conversations, setConversations] = useState<WorkerConversation[]>([]);
    const [funnelStages, setFunnelStages] = useState<FunnelStage[]>(DEFAULT_FUNNEL_STAGES);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [slaThreshold, setSlaThreshold] = useState(600);

    const fetchAgentConfig = async () => {
        const { data: agentData } = await supabase.from('workers_ia_agents').select('sla_threshold_seconds, funnel_config').eq('id', agentId).single();
        if (agentData?.sla_threshold_seconds) setSlaThreshold(agentData.sla_threshold_seconds);

        const { data: stagesData, error: stagesError } = await supabase.from('workers_ia_funnel_stages').select('*').eq('agent_id', agentId).order('position', { ascending: true });
        if (!stagesError && stagesData && stagesData.length > 0) {
            setFunnelStages(stagesData.map(s => ({ id: s.stage_key, label: s.label, color: s.color, bg: s.bg, border: s.border })));
        } else if (agentData?.funnel_config) {
            setFunnelStages(agentData.funnel_config as FunnelStage[]);
        }
    };

    const fetchConversations = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('workers_ia_conversations').select('*').eq('agent_id', agentId).order('updated_at', { ascending: false });
        if (!error) setConversations(data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (agentId) { fetchConversations(); fetchAgentConfig(); }
    }, [agentId]);

    useEffect(() => {
        if (!agentId) return;
        const channel = supabase.channel(`workers-kanban-${agentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workers_ia_conversations', filter: `agent_id=eq.${agentId}` }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setConversations(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
                } else fetchConversations();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workers_ia_funnel_stages', filter: `agent_id=eq.${agentId}` }, () => fetchAgentConfig())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [agentId]);

    const handleDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData('text/plain', id);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = async (e: React.DragEvent, targetStage: string) => {
        e.preventDefault();
        const conversationId = e.dataTransfer.getData('text/plain');
        if (!conversationId) return;

        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, funnel_stage: targetStage } : c));
        await supabase.from('workers_ia_conversations').update({ funnel_stage: targetStage, updated_at: new Date().toISOString() }).eq('id', conversationId);
    };

    if (loading && conversations.length === 0) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500/50" />
                    <input type="text" placeholder="Buscar leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500/40 focus:outline-none transition-all shadow-xl" />
                </div>
            </div>

            <div className="flex-1 flex gap-5 overflow-x-auto pb-6 px-1 custom-scrollbar">
                {funnelStages.map(column => {
                    const columnCards = conversations.filter(c => c.funnel_stage === column.id && (!searchTerm || c.contact_info?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.session_id.includes(searchTerm)));
                    return (
                        <div key={column.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id)} className="flex-shrink-0 w-80 flex flex-col bg-slate-900/30 rounded-2xl border border-slate-800/40 backdrop-blur-sm shadow-2xl">
                            <div className={`p-4 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-b ${column.bg.replace('/10', '/5')} to-transparent rounded-t-2xl`}>
                                <div className="flex items-center gap-2.5">
                                    <h3 className={`font-bold text-xs uppercase tracking-[0.15em] ${column.color}`}>{column.label}</h3>
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-800/80 ${column.color}`}>{columnCards.length}</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-[400px]">
                                {columnCards.map(card => (
                                    <div key={card.id} draggable onDragStart={(e) => handleDragStart(e, card.id)} className={`group bg-[#0d121f] border-l-4 p-4 rounded-xl shadow-lg ${getSentimentConfig(card.sentiment_score).border} transition-all cursor-grab active:cursor-grabbing border-y border-r border-slate-800/40 hover:translate-y-[-2px] hover:shadow-2xl relative overflow-hidden`}>
                                        <div className="relative z-10">
                                            <div className="flex items-start gap-3.5 mb-3">
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-300 font-black shadow-inner">{(card.contact_info?.name || 'L').charAt(0).toUpperCase()}</div>
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0d121f] animate-pulse" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h4 className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition-colors uppercase">{card.contact_info?.name || 'Visitante Anônimo'}</h4>
                                                        {(() => { const cfg = getSentimentConfig(card.sentiment_score); const Icon = cfg.icon; return <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />; })()}
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                                                        <Clock className="w-3 h-3" /> {format(new Date(card.updated_at), "dd/MM HH:mm")}
                                                        {card.sla_breach_count && card.sla_breach_count > 0 && <span className="ml-2 px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-md text-[8px] font-black animate-pulse flex items-center gap-1"><Zap className="w-2.5 h-2.5 fill-rose-500" /> {card.sla_breach_count}x SLA</span>}
                                                    </span>
                                                </div>
                                            </div>
                                            {card.summary && <div className="bg-[#111827] rounded-xl p-3 mb-4 border border-slate-800/50"><p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed italic">{card.summary}</p></div>}
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                                                <div className="flex flex-col gap-1">
                                                    <div className={`text-[10px] font-black tracking-widest ${getSentimentConfig(card.sentiment_score).color}`}>{getSentimentConfig(card.sentiment_score).label}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {((column.id.includes('lost') || column.id.includes('disqualified')) && !card.loss_reason) && (
                                                        <div className="flex items-center gap-1 text-[9px] text-rose-500 font-black animate-pulse">
                                                            <AlertCircle className="w-3 h-3" /> CLASSIFICAR
                                                        </div>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); onViewAudit?.(card.session_id); }} className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-white font-black uppercase tracking-[0.2em] transition-colors"><MessageSquare className="w-3.5 h-3.5" /> AUDITORIA</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WorkerKanbanBoard;
