import React, { useState } from 'react';
import { X, Network, MessageSquare, Target } from 'lucide-react';

interface StageConfigDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    stageId: string;
}

export const StageConfigDrawer: React.FC<StageConfigDrawerProps> = ({ isOpen, onClose, stageId }) => {
    const [activeTab, setActiveTab] = useState<'followup' | 'triggers' | 'icp'>('followup');

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`
                absolute top-0 right-0 h-full w-[450px] bg-slate-950 border-l border-cyan-500/20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]
                z-50 flex flex-col transform transition-transform duration-300 ease-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="flex items-center justify-between p-5 border-b border-white/5 bg-slate-900/50">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                            Configuração Tática
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">Etapa: {stageId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-none transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center border-b border-white/5 p-2 bg-slate-900/30">
                    <button
                        onClick={() => setActiveTab('followup')}
                        className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'followup'
                                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Follow-up IA
                    </button>
                    <button
                        onClick={() => setActiveTab('triggers')}
                        className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'triggers'
                                ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Network className="w-4 h-4" />
                        Gatilhos
                    </button>
                    <button
                        onClick={() => setActiveTab('icp')}
                        className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'icp'
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Target className="w-4 h-4" />
                        Score (ICP)
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {activeTab === 'followup' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-none">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-sm font-bold text-slate-200">Ativar Follow-up Ativo</span>
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"></div>
                                    </div>
                                </label>
                                <p className="text-xs text-slate-500 mt-2">
                                    A IA enviará mensagens proativas caso o lead pare de responder.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-300 border-b border-white/5 pb-2">Régua de Contato</h3>

                                <div className="p-3 bg-slate-900 border-l-2 border-cyan-500 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">Tentativa 1</span>
                                        <span className="text-xs text-slate-500 font-mono">Após 24h</span>
                                    </div>
                                    <textarea
                                        className="w-full bg-black/40 border border-slate-700 p-2 text-sm text-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none h-20 outline-none"
                                        defaultValue="Olá {{name}}, vi que não conseguimos avançar ontem. Tem alguma dúvida que eu possa ajudar?"
                                    />
                                </div>

                                <div className="p-3 bg-slate-900 border-l-2 border-slate-700 opacity-60 hover:opacity-100 transition-opacity space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">Tentativa 2</span>
                                        <span className="text-xs text-slate-500 font-mono">Após 72h</span>
                                    </div>
                                    <textarea
                                        className="w-full bg-black/40 border border-slate-700 p-2 text-sm text-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none h-20 outline-none"
                                        placeholder="Mensagem da segunda tentativa..."
                                    />
                                </div>

                                <button className="w-full py-2 border border-dashed border-slate-700 text-slate-400 text-xs font-bold hover:border-cyan-500 hover:text-cyan-400 transition-colors">
                                    + ADICIONAR TENTATIVA
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'triggers' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-900/50 border border-slate-800 space-y-4">
                                <h3 className="text-sm font-bold text-orange-400">Ações Automáticas</h3>

                                <div className="space-y-3">
                                    <label className="flex flex-col gap-1">
                                        <span className="text-xs text-slate-400">Mover lead para etapa:</span>
                                        <select className="bg-black/40 border border-slate-700 p-2 text-sm text-slate-200 outline-none focus:border-orange-500">
                                            <option>Interessados</option>
                                            <option>Qualificados</option>
                                        </select>
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-xs text-slate-400">Quando a IA detectar intenção de:</span>
                                        <select className="bg-black/40 border border-slate-700 p-2 text-sm text-slate-200 outline-none focus:border-orange-500">
                                            <option>Agendamento concluído</option>
                                            <option>Alta probabilidade de compra</option>
                                            <option>Solicitação de preço</option>
                                        </select>
                                    </label>
                                </div>
                                <button className="w-full py-2 bg-orange-500/10 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-colors border border-orange-500/20">
                                    SALVAR GATILHO
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'icp' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-900/50 border border-slate-800 space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-400">Critérios de Qualificação (Score)</h3>
                                    <p className="text-xs text-slate-500 mt-1">A IA usará estes critérios para pontuar o lead durante a conversa.</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input type="text" className="flex-1 bg-black/40 border border-slate-700 p-2 text-sm text-slate-200 outline-none focus:border-emerald-500" placeholder="Ex: Renda acima de 10k" />
                                        <input type="number" className="w-20 bg-black/40 border border-slate-700 p-2 text-sm text-slate-200 outline-none focus:border-emerald-500 text-center" placeholder="Pts" defaultValue={20} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="text" className="flex-1 bg-black/40 border border-slate-700 p-2 text-sm text-slate-200 outline-none focus:border-emerald-500" placeholder="Ex: Cargo de diretoria" />
                                        <input type="number" className="w-20 bg-black/40 border border-slate-700 p-2 text-sm text-slate-200 outline-none focus:border-emerald-500 text-center" placeholder="Pts" defaultValue={30} />
                                    </div>
                                    <button className="w-full py-2 border border-dashed border-emerald-900 text-emerald-500 text-xs font-bold hover:border-emerald-500 transition-colors">
                                        + ADICIONAR CRITÉRIO
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 bg-slate-900/80">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white text-black font-black text-sm hover:bg-slate-200 transition-colors tracking-widest shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    >
                        APLICAR MUDANÇAS
                    </button>
                </div>
            </div>
        </>
    );
};
