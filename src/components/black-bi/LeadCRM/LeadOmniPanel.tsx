import React, { useState } from 'react';
import { X, User, Tag, Clock, Phone, MapPin, Activity, MessageSquare } from 'lucide-react';
import { BlBiLead } from '../types';
import { AuditChatView } from './AuditChatView';

interface LeadOmniPanelProps {
    isOpen: boolean;
    onClose: () => void;
    lead: BlBiLead | null;
}

export const LeadOmniPanel: React.FC<LeadOmniPanelProps> = ({ isOpen, onClose, lead }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'audit'>('info');

    if (!isOpen || !lead) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`
                absolute top-0 right-0 h-full w-[600px] bg-slate-950 border-l border-cyan-500/20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]
                z-50 flex flex-col transform transition-transform duration-300 ease-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-white/5 bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <User className="w-6 h-6 text-cyan-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">{lead.name}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-slate-400 font-mono flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {lead.phone}
                                </span>
                                {lead.score && (
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        Score: {lead.score}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center border-b border-white/5 px-6 bg-slate-900/30">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors mr-6 ${activeTab === 'info'
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Activity className="w-4 h-4" />
                        Visão Geral 360º
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'audit'
                                ? 'border-orange-500 text-orange-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Auditoria de Conversa
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'info' && (
                        <div className="p-6 space-y-6">
                            {/* Origin Tracking */}
                            <div className="bg-slate-900/50 p-4 border border-white/5">
                                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-cyan-500" /> Trackeamento de Origem
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 font-mono uppercase">Campanha</p>
                                        <p className="text-sm text-slate-200 mt-1">{lead.campaign_source || 'Orgânico'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-mono uppercase">UTM Source</p>
                                        <p className="text-sm text-slate-200 mt-1">instagram_ads</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-mono uppercase">UTM Medium</p>
                                        <p className="text-sm text-slate-200 mt-1">stories</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-mono uppercase">Data de Entrada</p>
                                        <p className="text-sm text-slate-200 mt-1 font-mono">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="bg-slate-900/50 p-4 border border-white/5">
                                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-orange-500" /> Tags de Qualificação
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {lead.tags?.length ? lead.tags.map(tag => (
                                        <span key={tag} className="bg-slate-800 text-slate-300 text-xs px-2 py-1 uppercase font-medium border border-slate-700">
                                            {tag}
                                        </span>
                                    )) : (
                                        <span className="text-xs text-slate-500 font-mono">Nenhuma tag atribuída.</span>
                                    )}
                                </div>
                            </div>

                            {/* Activity Log Simulation */}
                            <div className="bg-slate-900/50 p-4 border border-white/5">
                                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-500" /> Timeline da Jornada
                                </h3>
                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">

                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-slate-900 bg-cyan-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-none border border-slate-800 bg-slate-900/80">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-bold text-slate-200 text-xs">Entrou no Funil</div>
                                                <div className="font-mono text-slate-500 text-[10px]">Há 2h</div>
                                            </div>
                                            <div className="text-slate-400 text-[11px]">Via campanha de MKT.</div>
                                        </div>
                                    </div>

                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-slate-900 bg-emerald-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-none border border-slate-800 bg-slate-900/80">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-bold text-slate-200 text-xs">Atendimento IA Iniciado</div>
                                                <div className="font-mono text-slate-500 text-[10px]">Há 1h58m</div>
                                            </div>
                                            <div className="text-emerald-400 text-[11px]">Agente IA [Vendedor Pro] assumiu.</div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'audit' && (
                        <div className="h-full">
                            <AuditChatView leadId={lead.id} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
