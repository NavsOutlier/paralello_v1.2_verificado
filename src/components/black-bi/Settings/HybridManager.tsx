import React, { useState } from 'react';
import { Bot, User as UserIcon, Settings2, Smartphone, ShieldCheck, Zap } from 'lucide-react';

export const HybridManager: React.FC = () => {
    const [activeSection, setActiveSection] = useState<'ai' | 'human' | 'instance'>('ai');

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-900/30 rounded-xl border border-white/5">
            {/* Top Navigation */}
            <div className="flex items-center p-4 border-b border-white/5 bg-slate-900/50 gap-4">
                <button
                    onClick={() => setActiveSection('ai')}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all flex-1 ${activeSection === 'ai'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'bg-black/20 text-slate-500 hover:text-slate-300 hover:bg-black/40 border border-transparent'
                        }`}
                >
                    <Bot className="w-5 h-5" />
                    Inteligência Artificial (Prompts)
                </button>
                <button
                    onClick={() => setActiveSection('human')}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all flex-1 ${activeSection === 'human'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                            : 'bg-black/20 text-slate-500 hover:text-slate-300 hover:bg-black/40 border border-transparent'
                        }`}
                >
                    <UserIcon className="w-5 h-5" />
                    Agentes Humanos (SDRs)
                </button>
                <button
                    onClick={() => setActiveSection('instance')}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all flex-1 ${activeSection === 'instance'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                            : 'bg-black/20 text-slate-500 hover:text-slate-300 hover:bg-black/40 border border-transparent'
                        }`}
                >
                    <Smartphone className="w-5 h-5" />
                    Conexões (WhatsApp)
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                {/* AI PROMPTS SECTION */}
                {activeSection === 'ai' && (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-black text-emerald-400">Engenharia de Prompt Global</h2>
                                <p className="text-sm text-slate-400 mt-1">Configure o comportamento base da IA para todos os funis. O "Tom de Voz" se aplica antes das regras de cada etapa.</p>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                <span className="text-emerald-400 font-bold text-sm">IA Operacional</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-emerald-500" /> Diretrizes de Comportamento
                                </h3>
                                <textarea
                                    className="w-full h-48 bg-black/40 border border-slate-700 p-4 text-sm text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none rounded-lg outline-none custom-scrollbar"
                                    defaultValue="Você é um SDR sênior da nossa empresa. Seu objetivo é qualificar leads e agendar reuniões. Nunca forneça preços diretamente antes de entender a dor do cliente. Seja cordial, direto e use emojis com moderação."
                                />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-emerald-500" /> Gatilhos de Segurança (Guardrails)
                                </h3>
                                <div className="space-y-3">
                                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Pausar IA se lead enviar xingamentos</span>
                                        <input type="checkbox" className="accent-emerald-500" defaultChecked />
                                    </div>
                                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Transferir para Humano se lead falar "atendente"</span>
                                        <input type="checkbox" className="accent-emerald-500" defaultChecked />
                                    </div>
                                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                                        <span className="text-sm text-slate-300">Avisar limite de tentativas (Anti-Spam)</span>
                                        <input type="checkbox" className="accent-emerald-500" defaultChecked />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <button className="px-8 py-3 bg-emerald-500/20 text-emerald-400 font-black text-sm hover:bg-emerald-500 hover:text-black transition-colors rounded-lg border border-emerald-500/30">
                                SALVAR CONFIGURAÇÕES DE IA
                            </button>
                        </div>
                    </div>
                )}

                {/* HUMAN AGENTS SECTION */}
                {activeSection === 'human' && (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-black text-orange-400">Playbooks e Roteamento Humano</h2>
                                <p className="text-sm text-slate-400 mt-1">Gerencie a equipe de vendas, defina regras de distribuição de leads e scripts padrão.</p>
                            </div>
                            <button className="px-4 py-2 bg-orange-500/10 text-orange-400 font-bold border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition-all text-sm">
                                + NOVO AGENTE
                            </button>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-500 uppercase">
                                        <th className="p-4 font-normal">Agente</th>
                                        <th className="p-4 font-normal">SLA Alvo</th>
                                        <th className="p-4 font-normal">Carga Atual</th>
                                        <th className="p-4 font-normal">Status</th>
                                        <th className="p-4 font-normal">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-300">
                                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-bold flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">JV</div>
                                            João Vendedor
                                        </td>
                                        <td className="p-4 font-mono text-slate-400">10m</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-cyan-500 h-full w-[40%]"></div>
                                                </div>
                                                <span className="text-xs font-mono">12/30</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded">Online</span>
                                        </td>
                                        <td className="p-4 text-orange-400 uppercase text-xs font-bold cursor-pointer hover:underline">
                                            Editar Regras
                                        </td>
                                    </tr>
                                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-bold flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">MS</div>
                                            Maria SDR
                                        </td>
                                        <td className="p-4 font-mono text-slate-400">5m</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-orange-500 h-full w-[85%]"></div>
                                                </div>
                                                <span className="text-xs font-mono">25/30</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded">Ausente</span>
                                        </td>
                                        <td className="p-4 text-orange-400 uppercase text-xs font-bold cursor-pointer hover:underline">
                                            Editar Regras
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    </div>
                )}

                {/* WHATSAPP INSTANCE SECTION */}
                {activeSection === 'instance' && (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-black text-cyan-400">Conexões de WhatsApp</h2>
                                <p className="text-sm text-slate-400 mt-1">Gerencie as instâncias conectadas para disparos de IA e atendimento Humano.</p>
                            </div>
                            <button className="px-4 py-2 bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all text-sm">
                                + CONECTAR NOVA INSTÂNCIA
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Connected Card */}
                            <div className="bg-slate-900 border-2 border-emerald-500/30 p-5 rounded-xl flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                                <Smartphone className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-200">Comercial Principal</h3>
                                                <p className="text-xs text-slate-500 font-mono">+55 11 99999-9999</p>
                                            </div>
                                        </div>
                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] uppercase px-2 py-1 rounded">
                                            Conectado
                                        </span>
                                    </div>
                                    <div className="space-y-2 mt-6">
                                        <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Tipo:</span>
                                            <span className="text-slate-200 font-bold">Evolution API (Não Oficial)</span>
                                        </div>
                                        <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Permissão IA:</span>
                                            <span className="text-emerald-400 font-bold">Total Autonomia</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Uso hoje:</span>
                                            <span className="text-slate-200 font-mono">1,450 msgs</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex gap-2">
                                    <button className="flex-1 py-2 text-xs font-bold border border-slate-700 text-slate-300 rounded hover:bg-slate-800 transition-colors">
                                        REINICIAR
                                    </button>
                                    <button className="flex-1 py-2 text-xs font-bold border border-rose-500/30 text-rose-400 bg-rose-500/10 rounded hover:bg-rose-500/20 transition-colors">
                                        DESCONECTAR
                                    </button>
                                </div>
                            </div>

                            {/* Disconnected Card */}
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between opacity-70">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                                <Smartphone className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-200">Suporte Premium</h3>
                                                <p className="text-xs text-slate-500 font-mono">+55 11 88888-8888</p>
                                            </div>
                                        </div>
                                        <span className="bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[10px] uppercase px-2 py-1 rounded">
                                            Desconectado
                                        </span>
                                    </div>
                                    <div className="space-y-2 mt-6">
                                        <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Tipo:</span>
                                            <span className="text-slate-200 font-bold">API Oficial (Meta)</span>
                                        </div>
                                        <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                                            <span className="text-slate-400">Permissão IA:</span>
                                            <span className="text-slate-500 font-bold">Pausada</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Último erro:</span>
                                            <span className="text-rose-400 font-mono">Token Expirado (há 4h)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex gap-2">
                                    <button className="w-full py-2 text-xs font-bold border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors">
                                        LER QR CODE / RECONECTAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
