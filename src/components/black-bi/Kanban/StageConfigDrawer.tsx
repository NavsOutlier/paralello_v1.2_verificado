import React, { useState } from 'react';
import { X, Network, MessageSquare, Target, Bot, Zap, Sparkles, Save, ChevronRight, Layout, Filter, RotateCcw, Settings, Plus } from 'lucide-react';

interface StageConfigDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    stageId: string;
}

type ConfigTab = 'followup' | 'score';

export const StageConfigDrawer: React.FC<StageConfigDrawerProps> = ({ isOpen, onClose, stageId }) => {
    const [activeTab, setActiveTab] = useState<ConfigTab>('followup');

    if (!isOpen) return null;

    const tabs: { id: ConfigTab, label: string, icon: any, color: string }[] = [
        { id: 'followup', label: 'Follow-up IA', icon: MessageSquare, color: 'text-cyan-400' },
        { id: 'score', label: 'Score e SLA', icon: Target, color: 'text-emerald-400' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-5xl h-full max-h-[850px] bg-slate-900 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-[32px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-cyan-500 to-fuchsia-600 rounded-2xl shadow-lg shadow-cyan-500/20">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                Configuração Tática <span className="text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 text-xs font-bold uppercase tracking-widest">{stageId}</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Automação & Inteligência de Etapa</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-72 border-r border-white/5 bg-slate-900/40 p-6 flex flex-col gap-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                        ? 'bg-white/5 text-white shadow-xl border border-white/10'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${activeTab === tab.id ? tab.color : ''}`} />
                                    {tab.label}
                                </button>
                            );
                        })}

                        <div className="mt-auto p-4 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/5 border border-cyan-500/10 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Bot className="w-4 h-4 text-cyan-400" />
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">Dica da IA</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                                Configure gatilhos de movimento para que o lead avance automaticamente quando a IA detectar intenção de compra.
                            </p>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-900/20">
                        {activeTab === 'followup' && (
                            <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex items-center justify-between p-6 bg-slate-800/40 rounded-3xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-cyan-500/10 rounded-2xl">
                                            <RotateCcw className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white text-sm uppercase tracking-widest">Cadência de Follow-up</h3>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">IA enviará mensagens proativas para leads parados.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cyan-500 shadow-xl"></div>
                                    </label>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Fluxo de Disparos</h4>
                                        <button className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
                                            <Plus className="w-3 h-3" /> Adicionar Tentativa
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {[1, 2].map((i) => (
                                            <div key={i} className="group relative bg-slate-800/20 border border-white/5 rounded-3xl p-6 hover:border-cyan-500/30 transition-all">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-white">
                                                        {i}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-black text-white uppercase tracking-widest">Tentativa {i}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">APÓS</span>
                                                                <input
                                                                    type="number"
                                                                    className="w-16 bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-black text-white outline-none focus:border-cyan-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    defaultValue={i === 1 ? 15 : 60}
                                                                    min="1"
                                                                />
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">MINUTOS</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <textarea
                                                    className="w-full h-24 bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none"
                                                    placeholder="Digite a mensagem que a IA deve enviar..."
                                                    defaultValue={i === 1 ? "Olá {{name}}, vi que não conseguimos avançar ontem. Tem alguma dúvida que eu possa ajudar?" : ""}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}


                        {activeTab === 'score' && (
                            <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* SLA Threshold Config */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Gestão de Resposta (SLA)</h4>
                                    </div>
                                    <div className="bg-slate-800/40 rounded-3xl border border-white/5 p-8 flex items-center justify-between gap-8 group hover:border-emerald-500/20 transition-all">
                                        <div className="flex-1">
                                            <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center gap-2">
                                                Meta de SLA da Etapa
                                                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1 font-medium italic">Tempo máximo sugerido para o primeiro contato ou retorno nesta fase.</p>
                                        </div>
                                        <div className="relative w-40">
                                            <input
                                                type="number"
                                                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-center text-lg font-black text-emerald-400 outline-none focus:border-emerald-500 shadow-inner"
                                                defaultValue={15}
                                            />
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 px-2 text-[8px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap border border-white/5 rounded">MINUTOS</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stage Score Config */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Progressão de Engajamento</h4>
                                    </div>
                                    <div className="bg-slate-800/40 rounded-3xl border border-white/5 p-8 flex items-center justify-between gap-8 group hover:border-emerald-500/20 transition-all">
                                        <div className="flex-1">
                                            <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center gap-2">
                                                Pontuação de Etapa
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1 font-medium italic">Pontos automáticos somados ao Score do Lead quando ele atinge esta fase do funil.</p>
                                        </div>
                                        <div className="relative w-40">
                                            <input
                                                type="number"
                                                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-center text-lg font-black text-emerald-400 outline-none focus:border-emerald-500 shadow-inner"
                                                defaultValue={30}
                                            />
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 px-2 text-[8px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap border border-white/5 rounded">PONTOS</div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-white/5 bg-slate-900/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Zap className="w-4 h-4 text-cyan-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">As mudanças afetam todos os leads nesta etapa.</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                        >
                            Descartar
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-white text-black px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Aplicar Estratégia
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};
