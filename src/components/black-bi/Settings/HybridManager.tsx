import React, { useState } from 'react';
import { Bot, User as UserIcon, Settings2, Smartphone, ShieldCheck, Zap, Target, Tag, Sparkles, Plus, X, Flame, Shuffle, Trash2, Layout, MessageSquare, Phone, Filter, BookOpen, Layers, FileText, Mic, PlayCircle, Copy, Calendar, CheckCircle } from 'lucide-react';

interface HybridManagerProps {
    clientId: string;
}

const FIXED_CRITERIA = [
    { id: 'autoridade', title: 'Poder de Decisão', tag: 'SDR_DECISOR', desc: 'Lead é Sócio, Diretor ou Founder com caneta na mão.' },
    { id: 'orcamento', title: 'Orçamento Validado', tag: 'SDR_COM_VERBA', desc: 'Confirmou que possui budget disponível para o projeto.' },
    { id: 'necessidade', title: 'Dor Clara Identificada', tag: 'SDR_DOR_LATENTE', desc: 'Relatou um problema crítico que a solução resolve.' },
    { id: 'timeline', title: 'Urgência / Timeline', tag: 'SDR_ALTA_URGENCIA', desc: 'Tem data-alvo próxima ou precisa de solução rápida.' },
    { id: 'fit', title: 'Fit com ICP Ideal', tag: 'SDR_ICP_PERFEITO', desc: 'Tamanho, segmento ou características cravam o Perfil Ideal.' },
    { id: 'dados', title: 'Forneceu Dados Ricos', tag: 'SDR_DADOS_COLETADOS', desc: 'Compartilhou CNPJ, E-mail corporativo ou volume de vendas.' },
    { id: 'engajamento', title: 'Engajamento Profundo', tag: 'SDR_ALTA_RECIPROCIDADE', desc: 'Dá respostas longas, faz perguntas pertinentes e colaborativas.' },
    { id: 'concorrencia', title: 'Usa Concorrente/Insatisfeito', tag: 'SDR_CHURN_POTENCIAL', desc: 'Mencionou uso de concorrente ou insatisfação com ferramenta atual.' },
    { id: 'reuniao', title: 'Pronto para Fechar/Call', tag: 'SDR_FUNDO_FUNIL', desc: 'Pediu Reunião, Demo, Proposta ou Tabela de Preços explicitamente.' },
    { id: 'maturidade', title: 'Maturidade do Problema', tag: 'SDR_ALTA_MATURIDADE', desc: 'Sabe exatamente o que quer, conhece o processo e é educado no tema.' }
];

export const HybridManager: React.FC<HybridManagerProps> = ({ clientId }) => {
    const [activeSection, setActiveSection] = useState<'ai' | 'human' | 'instance' | 'score' | 'handoff'>('ai');
    const [aiSubSection, setAiSubSection] = useState<'geral' | 'prompt'>('geral');
    const [humanSubSection, setHumanSubSection] = useState<'equipe' | 'scripts'>('equipe');
    const [activeTab, setActiveTab] = useState<'funil' | 'agents' | 'metrics'>('funil');
    const [hotLeadThreshold, setHotLeadThreshold] = useState(80);
    const [triggerType, setTriggerType] = useState<'palavra' | 'frase_ia' | 'satisfacao'>('palavra');
    const [satisfactionLimit, setSatisfactionLimit] = useState(3);
    const [handoffTriggers, setHandoffTriggers] = useState<any[]>([]);
    const [isEditingTrigger, setIsEditingTrigger] = useState<string | 'new' | null>(null);
    const [triggerName, setTriggerName] = useState('');
    const [selectedSeller, setSelectedSeller] = useState<any>(null);
    const [icpDefinition, setIcpDefinition] = useState('');

    // State for scores of the 10 fixed criteria
    const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({
        autoridade: 30,
        orcamento: 30,
        necessidade: 30,
        timeline: 20,
        fit: 20,
        dados: 10,
        engajamento: 10,
        concorrencia: 15,
        reuniao: 40,
        maturidade: 15
    });

    const updateScore = (id: string, delta: number) => {
        setCriteriaScores(prev => ({
            ...prev,
            [id]: Math.max(0, prev[id] + delta)
        }));
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-900/30 rounded-xl border border-white/5">
            {/* Top Navigation */}
            <div className="flex items-center p-4 border-b border-white/5 bg-slate-900/50 gap-4">
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
                <button
                    onClick={() => setActiveSection('ai')}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all flex-1 ${activeSection === 'ai'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'bg-black/20 text-slate-500 hover:text-slate-300 hover:bg-black/40 border border-transparent'
                        }`}
                >
                    <Sparkles className="w-5 h-5" />
                    Sentinela IA SDR (Config)
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
                    onClick={() => setActiveSection('score')}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all flex-1 ${activeSection === 'score'
                        ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-[0_0_15px_rgba(232,121,249,0.1)]'
                        : 'bg-black/20 text-slate-500 hover:text-slate-300 hover:bg-black/40 border border-transparent'
                        }`}
                >
                    <Target className="w-5 h-5" />
                    Qualificação & Tags (Global)
                </button>
                <button
                    onClick={() => setActiveSection('handoff')}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all flex-1 ${activeSection === 'handoff'
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                        : 'bg-black/20 text-slate-500 hover:text-slate-300 hover:bg-black/40 border border-transparent'
                        }`}
                >
                    <Shuffle className="w-5 h-5" />
                    Gatilhos de Handoff
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                {/* SENTINELA IA SDR SECTION */}
                {activeSection === 'ai' && (
                    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Section Header */}
                        <div className="flex items-center justify-between pb-6 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                    <Sparkles className="w-8 h-8 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                                        Configurar <span className="text-emerald-400">Sentinela IA SDR</span>
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1 font-medium">Gestão centralizada do comportamento, inteligência e conexões da sua IA.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-white/5">ID: SN-0982-SDR</span>
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Sentinela Ativo</span>
                                </div>
                            </div>
                        </div>

                        {/* Sub-Navigation Tabs */}
                        <div className="flex items-center gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'geral', label: 'Geral', icon: Settings2 },
                                { id: 'prompt', label: 'Prompt', icon: MessageSquare }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setAiSubSection(tab.id as any)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${aiSubSection === tab.id
                                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* TAB CONTENTS */}
                        <div className="mt-8 transition-all duration-300">
                            {/* GERAL TAB */}
                            {aiSubSection === 'geral' && (
                                <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="space-y-6">
                                        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[24px]">
                                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Identidade & Função</h3>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Nome do Worker *</label>
                                                    <input
                                                        type="text"
                                                        defaultValue="Agente SDR Navs"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-emerald-500 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Função (Tag)</label>
                                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-emerald-500 transition-all appearance-none">
                                                        <option>SDR / Vendas</option>
                                                        <option>Customer Success</option>
                                                        <option>Suporte Técnico</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[24px]">
                                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Motor de Inteligência</h3>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Modelo de IA</label>
                                                <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-emerald-500 transition-all">
                                                    <option>GPT-4o Mini (Rápido)</option>
                                                    <option>GPT-4o (Superior)</option>
                                                    <option>Claude 3.5 Sonnet</option>
                                                </select>
                                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mt-1 ml-1">Otimizado para velocidade e baixo custo.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[24px] flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Status do Robô</h4>
                                                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider mt-1">Sentinela está Ativo</p>
                                            </div>
                                            <div className="w-14 h-7 bg-emerald-500/20 rounded-full border border-emerald-500/40 relative flex items-center px-1 cursor-pointer">
                                                <div className="w-5 h-5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 ml-auto" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PROMPT TAB */}
                            {aiSubSection === 'prompt' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[24px]">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Criatividade (Temperatura)</h3>
                                                <span className="text-xs font-black text-emerald-400">0.7</span>
                                            </div>
                                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                <div className="relative w-full h-2 bg-slate-800 rounded-full mb-6 mt-2">
                                                    <div className="absolute left-0 top-0 h-full w-[70%] bg-emerald-500 rounded-full" />
                                                    <div className="absolute left-[70%] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform" />
                                                </div>
                                                <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                                    <span>Preciso</span>
                                                    <span>Equilibrado</span>
                                                    <span>Criativo</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[24px]">
                                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Limite de Resposta (Max Tokens)</h3>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    defaultValue="2048"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-8 text-xl text-center text-white font-black outline-none focus:border-emerald-500 transition-all"
                                                />
                                                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-600 uppercase tracking-widest">Tokens Máximos</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[40px] relative">
                                        <div className="flex items-center gap-2 mb-6 ml-2">
                                            <MessageSquare className="w-5 h-5 text-emerald-500" />
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Instruções Principais (System Prompt)</h3>
                                        </div>
                                        <textarea
                                            className="w-full h-64 bg-black/60 border border-white/10 rounded-[32px] p-8 text-sm text-slate-300 font-medium outline-none focus:border-emerald-500 transition-all resize-none custom-scrollbar shadow-inner leading-relaxed"
                                            defaultValue="Você é um SDR especializado em qualificação de leads para agências de marketing digital. Seu objetivo é identificar decisores, entender necessidades e agendar reuniões. Use uma linguagem profissional porem amigável. Não forneça valores fixos antes da qualificação completa."
                                            placeholder="Descreve detalhadamente como o Sentinela deve se comportar..."
                                        />
                                        <div className="absolute bottom-12 right-12 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">IA Memory Active</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Footer */}
                        <div className="pt-8 flex justify-end">
                            <button className="px-12 py-5 bg-emerald-500 text-black text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95">
                                Atualizar Sentinela
                            </button>
                        </div>
                    </div>
                )}

                {/* SELLERS (HUMAN AGENTS) SECTION */}
                {activeSection === 'human' && (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                            <div>
                                <h2 className="text-xl font-black text-orange-400">Gestão de Vendedores</h2>
                                <p className="text-sm text-slate-400 mt-1">Gerencie sua equipe de vendas e registre os treinamentos concluídos.</p>
                            </div>
                            <button className="px-4 py-2 bg-orange-500/10 text-orange-400 font-bold border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition-all text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" /> NOVO VENDEDOR
                            </button>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-500 uppercase">
                                        <th className="p-4 font-normal">Vendedor</th>
                                        <th className="p-4 font-normal">Idade</th>
                                        <th className="p-4 font-normal">Treinamentos Realizados</th>
                                        <th className="p-4 font-normal text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-300">
                                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-bold flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">JV</div>
                                            João Vendedor
                                        </td>
                                        <td className="p-4 font-mono text-slate-400">28 anos</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded">Onboarding</span>
                                                <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded">Módulo 1: Abordagem</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => setSelectedSeller({ name: 'João Vendedor', initials: 'JV', age: 28, trainings: [{ id: 1, title: 'Onboarding', date: '10 Jan 2026', desc: 'Introdução à ferramenta e processos da agência.', type: 'Treinamento Geral' }, { id: 2, title: 'Módulo 1: Abordagem', date: '15 Jan 2026', desc: 'Apresentação do Playbook de BANT para Qualificação de Leads Inbound.', type: 'Script de Vendas' }] })}
                                                    className="text-orange-400 hover:text-orange-300 text-xs font-bold flex items-center gap-1 transition-colors">
                                                    <Plus className="w-3.5 h-3.5" /> ADD TREINAMENTO
                                                </button>
                                                <button
                                                    onClick={() => setSelectedSeller({ name: 'João Vendedor', initials: 'JV', age: 28, trainings: [{ id: 1, title: 'Onboarding', date: '10 Jan 2026', desc: 'Introdução à ferramenta e processos da agência.', type: 'Treinamento Geral' }, { id: 2, title: 'Módulo 1: Abordagem', date: '15 Jan 2026', desc: 'Apresentação do Playbook de BANT para Qualificação de Leads Inbound.', type: 'Script de Vendas' }] })}
                                                    className="text-slate-500 hover:text-white transition-colors">
                                                    <Settings2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-bold flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center">MS</div>
                                            Maria SDR
                                        </td>
                                        <td className="p-4 font-mono text-slate-400">24 anos</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold rounded">Onboarding</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => setSelectedSeller({ name: 'Maria SDR', initials: 'MS', age: 24, trainings: [{ id: 1, title: 'Onboarding', date: '20 Fev 2026', desc: 'Treinamento de software CRM e cadências iniciais.', type: 'Treinamento Geral' }] })}
                                                    className="text-orange-400 hover:text-orange-300 text-xs font-bold flex items-center gap-1 transition-colors">
                                                    <Plus className="w-3.5 h-3.5" /> ADD TREINAMENTO
                                                </button>
                                                <button
                                                    onClick={() => setSelectedSeller({ name: 'Maria SDR', initials: 'MS', age: 24, trainings: [{ id: 1, title: 'Onboarding', date: '20 Fev 2026', desc: 'Treinamento de software CRM e cadências iniciais.', type: 'Treinamento Geral' }] })}
                                                    className="text-slate-500 hover:text-white transition-colors">
                                                    <Settings2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* WHATSAPP INSTANCE SECTION */}
                {activeSection === 'instance' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                                    Conexão de <span className="text-cyan-400">WhatsApp</span>
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">Gerencie a instância conectada para disparos de IA e atendimento Humano.</p>
                            </div>
                            <div className="px-4 py-2 bg-slate-900/50 border border-white/5 rounded-xl flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instância Única</span>
                            </div>
                        </div>

                        <div className="bg-slate-900/40 border border-white/5 rounded-[40px] p-10 mt-8">
                            <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 max-w-2xl mx-auto relative overflow-hidden group">
                                {/* Accent Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-all duration-700" />

                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center shadow-inner">
                                            <Smartphone className="w-8 h-8 text-cyan-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight italic">Comercial Principal</h4>
                                                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">Online</span>
                                            </div>
                                            <p className="text-sm text-slate-500 font-bold mt-1 tracking-wider">+55 11 99912-3456</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 space-y-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                                    <div className="flex items-center justify-between p-5 bg-black/20">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tecnologia:</span>
                                        <span className="text-xs font-black text-white italic uppercase tracking-widest">Evolution API</span>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-black/40">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Permissão IA:</span>
                                        <span className="text-xs font-black text-emerald-400 italic uppercase tracking-widest">Autonomia Total</span>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-black/20">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Mensagens Hoje:</span>
                                        <span className="text-xs font-black text-white italic uppercase tracking-widest">1.240 disparos</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <button className="py-4 rounded-2xl border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all active:scale-95 shadow-lg">
                                        Reiniciar
                                    </button>
                                    <button className="py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] hover:bg-rose-500/20 transition-all active:scale-95 shadow-lg shadow-rose-500/5">
                                        Desconectar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* GLOBAL QUALIFICATION & TAGS SECTION */}
                {activeSection === 'score' && (
                    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between pb-6 border-b border-white/5">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">
                                    Estratégia de <span className="text-fuchsia-400">Qualificação IA</span>
                                </h2>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Defina o que a IA deve identificar para automatizar a pontuação global (ICP).</p>
                            </div>
                            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sistema de Critérios Fixos
                            </div>
                        </div>

                        {/* ICP Definition Section */}
                        <div className="bg-slate-900 border border-white/5 rounded-[24px] p-6 shadow-xl mb-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-fuchsia-500/10 transition-all duration-700" />
                            <div className="flex items-start gap-5 relative z-10">
                                <div className="p-4 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl shadow-inner">
                                    <Target className="w-6 h-6 text-fuchsia-400" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-2 flex items-center justify-between">
                                        Definição do Perfil Ideal de Cliente (ICP)
                                        <span className="text-[9px] font-black text-fuchsia-400 bg-fuchsia-500/10 px-2.5 py-1 rounded uppercase tracking-widest border border-fuchsia-500/20 flex items-center gap-1">
                                            <Bot className="w-3 h-3" /> Usado pela IA
                                        </span>
                                    </h4>
                                    <p className="text-xs text-slate-400 font-medium mb-4">
                                        Descreva quem é o seu cliente perfeito. A IA usará este texto como base primária para comparar as características do lead durante o atendimento e pontuar os critérios automaticamente.
                                    </p>
                                    <textarea
                                        value={icpDefinition}
                                        onChange={(e) => setIcpDefinition(e.target.value)}
                                        placeholder="Ex: Clínicas odontológicas com faturamento acima de R$50k/mês, que já investem em tráfego pago mas não têm processo estruturado de recepção..."
                                        className="w-full h-32 bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-slate-300 font-medium outline-none focus:border-fuchsia-500 transition-all resize-none placeholder:text-slate-600 focus:ring-1 focus:ring-fuchsia-500/50 shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hot Lead Threshold Configuration */}
                        <div className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-orange-500/20 rounded-[24px] p-6 shadow-xl mb-4">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-500/10 rounded-2xl">
                                        <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest leading-none">Configuração de Lead Quente (Hot Lead)</h4>
                                        <p className="text-[10px] text-slate-500 font-medium mt-1.5 uppercase tracking-wider">Define a pontuação mínima para o lead receber o destaque visual (fogo) no card.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Score Mínimo</span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setHotLeadThreshold(Math.max(0, hotLeadThreshold - 5))}
                                                className="w-6 h-6 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 text-white font-bold"
                                            >-</button>
                                            <span className="text-lg font-black text-orange-400 italic w-8 text-center">{hotLeadThreshold}</span>
                                            <button
                                                onClick={() => setHotLeadThreshold(hotLeadThreshold + 5)}
                                                className="w-6 h-6 flex items-center justify-center bg-slate-800 rounded hover:bg-slate-700 text-white font-bold"
                                            >+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {FIXED_CRITERIA.map((c) => (
                                <div key={c.id} className="bg-slate-900 border border-white/5 rounded-[24px] p-6 hover:border-fuchsia-500/30 transition-all group shadow-xl">
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-fuchsia-500/10 rounded-lg">
                                                    <Target className="w-4 h-4 text-fuchsia-400" />
                                                </div>
                                                <h3 className="font-black text-white text-sm uppercase tracking-widest">{c.title}</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium mb-4">{c.desc}</p>

                                            <div className="flex items-center gap-8">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Ação Automatizada</span>
                                                    <div className="flex items-center gap-2 bg-fuchsia-500/5 border border-fuchsia-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black text-fuchsia-300">
                                                        <Tag className="w-3 h-3" /> ADICIONAR TAG: {c.tag}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center justify-center bg-black/30 p-4 rounded-2xl border border-white/5 min-w-[140px]">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Bônus de Score</span>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => updateScore(c.id, -5)}
                                                    className="w-7 h-7 flex items-center justify-center bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white font-bold transition-all"
                                                >-</button>
                                                <div className="flex flex-col items-center min-w-[45px]">
                                                    <span className={`text-base font-black italic ${criteriaScores[c.id] > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                                        {criteriaScores[c.id] > 0 ? `+${criteriaScores[c.id]}` : 'OFF'}
                                                    </span>
                                                    <span className="text-[8px] font-black text-slate-600 uppercase">PTS</span>
                                                </div>
                                                <button
                                                    onClick={() => updateScore(c.id, 5)}
                                                    className="w-7 h-7 flex items-center justify-center bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white font-bold transition-all"
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                )}

                {/* HANDOFF TRIGGERS SECTION */}
                {activeSection === 'handoff' && (
                    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between pb-6 border-b border-white/5">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                                    <Shuffle className="w-8 h-8 text-orange-500" /> Gatilhos de <span className="text-orange-400">Handoff</span>
                                </h2>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Configure as regras para a IA sair do tom automático e acionar o transbordo humano.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setTriggerType('palavra');
                                    setTriggerName('');
                                    setIsEditingTrigger('new');
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/20"
                            >
                                <Plus className="w-3.5 h-3.5" /> Adicionar Gatilho
                            </button>
                        </div>

                        <div className="space-y-6">
                            {handoffTriggers.length === 0 && isEditingTrigger !== 'new' && (
                                <div className="bg-slate-900/40 border border-white/5 border-dashed rounded-[32px] p-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 flex items-center justify-center text-slate-500 mb-6">
                                        <Filter className="w-10 h-10" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-base font-medium text-slate-300 mb-2">Nenhum gatilho configurado.</h3>
                                    <p className="text-sm text-slate-500 font-medium">A IA responderá todas as mensagens normalmente.</p>
                                </div>
                            )}

                            {handoffTriggers.map((trigger, idx) => (
                                isEditingTrigger === trigger.id ? (
                                    <div key={trigger.id} className="bg-slate-900/80 border border-orange-500/30 rounded-[32px] overflow-hidden shadow-2xl relative group ring-1 ring-orange-500/10 mb-6">
                                        <div className="p-8">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-black">
                                                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                                                    </div>
                                                    <h3 className="font-black text-slate-200 text-sm uppercase tracking-widest">Editar Gatilho #{idx + 1}</h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setIsEditingTrigger(null)}
                                                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const newName = triggerName.trim() || (triggerType === 'palavra' ? 'Palavra do Lead' : triggerType === 'frase_ia' ? 'Frase enviada pela equipe ou IA' : 'Satisfação Baixa');
                                                            setHandoffTriggers(handoffTriggers.map(t => t.id === trigger.id ? { ...t, name: newName, type: triggerType, satisfactionLimit } : t));
                                                            setIsEditingTrigger(null);
                                                        }}
                                                        className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                                    >
                                                        Salvar
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Form Content */}
                                            <TriggerFormContent triggerName={triggerName} setTriggerName={setTriggerName} triggerType={triggerType} setTriggerType={setTriggerType} satisfactionLimit={satisfactionLimit} setSatisfactionLimit={setSatisfactionLimit} />
                                        </div>
                                    </div>
                                ) : (
                                    <div key={trigger.id} className="bg-slate-900/80 border border-white/5 rounded-[24px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex flex-col items-center justify-center border border-white/5">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">#{idx + 1}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                                                        {trigger.name || (trigger.type === 'palavra' ? 'Palavra do Lead' : trigger.type === 'frase_ia' ? 'Frase enviada pela equipe ou IA' : 'Satisfação Baixa')}
                                                    </h4>
                                                    <span className="px-2 py-0.5 rounded border border-orange-500/20 bg-orange-500/10 text-[9px] text-orange-400 font-black uppercase tracking-widest">
                                                        Ativo
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 font-medium">
                                                    Move para <span className="text-slate-200">Interessados</span> e <span className="text-slate-200">Notifica Humano</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setTriggerType(trigger.type);
                                                    setTriggerName(trigger.name || '');
                                                    if (trigger.satisfactionLimit) setSatisfactionLimit(trigger.satisfactionLimit);
                                                    setIsEditingTrigger(trigger.id);
                                                }}
                                                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                                            >
                                                <Settings2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setHandoffTriggers(handoffTriggers.filter(t => t.id !== trigger.id))}
                                                className="p-3 bg-white/5 hover:bg-rose-500/20 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}

                            {isEditingTrigger === 'new' && (
                                <div className="bg-slate-900/80 border border-orange-500/30 rounded-[32px] overflow-hidden shadow-2xl relative group ring-1 ring-orange-500/10 mb-6">
                                    <div className="p-8">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-black">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                                <h3 className="font-black text-slate-200 text-sm uppercase tracking-widest">Novo Gatilho</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setIsEditingTrigger(null)}
                                                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newName = triggerName.trim() || (triggerType === 'palavra' ? 'Palavra do Lead' : triggerType === 'frase_ia' ? 'Frase enviada pela equipe ou IA' : 'Satisfação Baixa');
                                                        setHandoffTriggers([...handoffTriggers, { id: Date.now().toString(), name: newName, type: triggerType, satisfactionLimit }]);
                                                        setIsEditingTrigger(null);
                                                    }}
                                                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                                >
                                                    Salvar Gatilho
                                                </button>
                                            </div>
                                        </div>

                                        {/* Form Content */}
                                        <TriggerFormContent triggerName={triggerName} setTriggerName={setTriggerName} triggerType={triggerType} setTriggerType={setTriggerType} satisfactionLimit={satisfactionLimit} setSatisfactionLimit={setSatisfactionLimit} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Handoff Footer Help */}
                        <div className="mt-8 p-6 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex items-center gap-4">
                            <p className="text-[11px] text-orange-500/80 font-medium tracking-wide">
                                <strong className="text-orange-500">Como funciona:</strong> Quando a condição do gatilho for atendida, a IA executará a ação configurada imediatamente.
                            </p>
                        </div>

                        <div className="flex justify-end mt-8 border-t border-white/5 pt-8">
                            <button className="flex items-center gap-2 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-cyan-600/20">
                                <Layout className="w-4 h-4" /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                )}

                {/* SELLER DETAILS DRAWER */}
                {selectedSeller && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                        <div className="w-[600px] bg-slate-900 border-l border-white/10 h-full flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-lg">
                                        {selectedSeller.initials}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">{selectedSeller.name}</h3>
                                        <p className="text-sm text-slate-400">{selectedSeller.age} anos</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedSeller(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 flex-grow overflow-y-auto space-y-8">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-orange-400" />
                                            Histórico de Treinamentos
                                        </h4>
                                        <button className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 bg-orange-500/10 px-3 py-1.5 rounded-lg">
                                            <Plus className="w-3.5 h-3.5" /> REGISTRAR NOVO
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {selectedSeller.trainings.map((training: any) => (
                                            <div key={training.id} className="bg-black/30 border border-white/5 p-5 rounded-xl">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h5 className="font-bold text-white text-base">{training.title}</h5>
                                                        <span className="text-[10px] uppercase font-black tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded mt-1 inline-block">
                                                            {training.type}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {training.date}
                                                    </div>
                                                </div>
                                                <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                    <p className="text-sm text-slate-400 leading-relaxed font-mono">
                                                        {training.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper component for the form content to avoid code duplication
const TriggerFormContent = ({ triggerName, setTriggerName, triggerType, setTriggerType, satisfactionLimit, setSatisfactionLimit }: any) => (
    <>
        <div className="space-y-3 mb-8">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome do Gatilho</label>
            <input
                type="text"
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                placeholder="Ex: Lead pediu para falar com atendente"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all placeholder:text-slate-700"
            />
        </div>

        {/* Trigger Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
            {[
                { id: 'palavra', label: 'Palavra do Lead', desc: 'Lead diz algo parecido', icon: <span className="text-cyan-400 mr-2">🔍</span> },
                { id: 'frase_ia', label: 'Frase enviada pela equipe ou IA', desc: 'IA ou Humano fala determinada frase', icon: <span className="text-fuchsia-400 mr-2">🤖</span> },
                { id: 'satisfacao', label: 'Satisfação', desc: 'Score abaixo de X', icon: <span className="text-emerald-400 mr-2">📊</span> }
            ].map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTriggerType(t.id as any)}
                    className={`p-4 rounded-xl text-left transition-all border ${triggerType === t.id
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-transparent border-transparent hover:bg-white/5'
                        }`}
                >
                    <div className="flex items-center text-sm font-bold text-slate-200 mb-1">
                        {t.icon} {t.label}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">{t.desc}</div>
                </button>
            ))}
        </div>

        {/* Type-Specific Configuration */}
        {triggerType === 'palavra' && (
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Palavras-Chave (Separadas por vírgula)</label>
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all placeholder:text-slate-700"
                            placeholder="preço, valor, orçamento..."
                            defaultValue="preço, valor, orçamento, quanto custa"
                        />
                    </div>
                    <p className="text-[9px] text-slate-600 font-medium ml-1">Quando o lead mencionar estas palavras</p>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Mover para Etapa</label>
                    <div className="relative">
                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer">
                            <option>Interessados</option>
                            <option>Transbordo Humano</option>
                            <option>Qualificados</option>
                        </select>
                        <Layout className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            </div>
        )}

        {triggerType === 'frase_ia' && (
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Termo-chave para alterar esta etapa da jornada</label>
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all placeholder:text-slate-700"
                            defaultValue="Vou transferir você para um atendente"
                        />
                    </div>
                    <p className="text-[9px] text-slate-600 font-medium ml-1">A IA precisa falar exatamente esta frase para disparar</p>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Mover para Etapa</label>
                    <div className="relative">
                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer">
                            <option>Interessados</option>
                            <option>Transbordo Humano</option>
                            <option>Qualificados</option>
                        </select>
                        <Layout className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            </div>
        )}

        {triggerType === 'satisfacao' && (
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nível de Satisfação</label>
                    <div className="relative">
                        <select
                            value={satisfactionLimit}
                            onChange={(e) => setSatisfactionLimit(Number(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value={9}>Encantado (Score 9-10)</option>
                            <option value={8}>Satisfeito (Score 7-8)</option>
                            <option value={6}>Neutro (Score 5-6)</option>
                            <option value={4}>Insatisfeito (Score 3-4)</option>
                            <option value={2}>Furioso (Score 1-2)</option>
                        </select>
                        <Layout className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                    <p className="text-[9px] text-slate-600 font-medium ml-1">Dispara quando satisfação do lead atinge ou fica abaixo deste nível</p>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Mover para Etapa</label>
                    <div className="relative">
                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer">
                            <option>Interessados</option>
                            <option>Transbordo Humano</option>
                            <option>Críticos</option>
                        </select>
                        <Layout className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            </div>
        )}

        {/* Common Actions */}
        <div className="space-y-3 mb-8">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Ação</label>
            <div className="relative">
                <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer">
                    <option>Notificar Humano</option>
                    <option>Pausar IA e Notificar Humano</option>
                    <option>Apenas Pausar IA</option>
                </select>
                <Shuffle className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
        </div>

        <div className="space-y-6">
            {triggerType !== 'frase_ia' && (
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                        <div className="w-3 h-3 rounded-sm border border-slate-600" />
                        Mensagem de Despedida
                    </label>
                    <input
                        type="text"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-slate-300 font-medium outline-none focus:border-orange-500 transition-all"
                        defaultValue="Vou transferir você para nossa equipe. Em instantes alguém vai te atender!"
                    />
                </div>
            )}
            <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    Mensagem para Grupo de Notificação
                </label>
                <input
                    type="text"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-slate-300 font-medium outline-none focus:border-orange-500 transition-all"
                    defaultValue="🚨 Novo lead qualificado! Cliente solicitou atendimento humano."
                />
                <p className="text-[9px] text-slate-600 font-medium ml-1">Variáveis: {'{{lead.name}}'}, {'{{lead.phone}}'}, {'{{trigger.keyword}}'}</p>
            </div>
        </div>
    </>
);

export default HybridManager;
