import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import {
    Settings, Save, X, Bot, Zap, CheckCircle,
    AlertCircle, Activity, BrainCircuit, Type, FileText,
    Smartphone, Loader2, RefreshCw, QrCode, ArrowRight, Check, Phone
} from 'lucide-react';

interface WorkerAgent {
    id: string;
    name: string;
    role?: string;
    model: string;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    is_active: boolean;
    sla_threshold_seconds: number;
    whatsapp_number?: string;
}

interface WorkerConfigProps {
    agent?: WorkerAgent;
    clientId: string;
    clientName?: string;
    onSave?: (agent: WorkerAgent) => void;
    onClose: () => void;
    isInline?: boolean; // NEW: Show inline (tab) instead of modal (onboarding)
}

type WizardStep = 'identity' | 'brain' | 'connect';
type InlineTab = 'general' | 'prompt' | 'connection';

export const WorkerConfig: React.FC<WorkerConfigProps> = ({
    agent,
    clientId,
    clientName,
    onSave,
    onClose,
    isInline = false
}) => {
    const { organizationId } = useAuth();
    const { instances, createInstance } = useWhatsApp();
    const [saving, setSaving] = useState(false);
    const [connectingWs, setConnectingWs] = useState(false);

    // Wizard Control (for modal mode)
    const [currentStep, setCurrentStep] = useState<WizardStep>('identity');
    // Tab Control (for inline mode)
    const [activeInlineTab, setActiveInlineTab] = useState<InlineTab>('general');

    const [currentAgent, setCurrentAgent] = useState<WorkerAgent | undefined>(agent);

    const [formData, setFormData] = useState({
        name: agent?.name || '',
        role: 'sdr',
        is_active: agent?.is_active ?? true,
        model: agent?.model || 'gpt-4o',
        temperature: agent?.temperature || 0.7,
        max_tokens: agent?.max_tokens || 1000,
        system_prompt: agent?.system_prompt || '',
        sla_threshold_seconds: agent?.sla_threshold_seconds || 60,
        whatsapp_number: agent?.whatsapp_number || '',
    });

    const isEditing = !!agent;
    const instanceName = `Worker: ${clientName || clientId.slice(0, 8)}`;
    const myInstance = instances.find(i => i.name === instanceName);
    const isConnected = myInstance && ['connected', 'conectado'].includes(myInstance.status);
    const isWaitingQr = myInstance && (myInstance.status === 'waiting_scan' || myInstance.status === 'connecting');

    // Auto-refresh QR Code logic
    useEffect(() => {
        let interval: any;
        if (connectingWs && isWaitingQr && !isConnected) {
            interval = setInterval(() => {
                if (currentAgent?.id) {
                    createInstance(instanceName, undefined, {
                        client_id: clientId,
                        agent_id: currentAgent.id
                    }).catch(console.error);
                }
            }, 10000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [connectingWs, isWaitingQr, isConnected, instanceName, createInstance, clientId, currentAgent]);

    const handleConnectWhatsApp = async () => {
        if (!currentAgent?.id) {
            alert('Erro: Agente não identificado. Salve as configurações primeiro.');
            return;
        }

        setConnectingWs(true);
        try {
            await createInstance(instanceName, undefined, {
                client_id: clientId,
                agent_id: currentAgent.id
            });
        } catch (error: any) {
            console.error('Error creating instance:', error);
            alert(`Erro ao gerar: ${error.message}`);
            setConnectingWs(false);
        }
    };

    const handleSave = async (advanceStep = false) => {
        if (!formData.name.trim()) {
            alert('Nome é obrigatório');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: formData.name,
                role: formData.role,
                is_active: formData.is_active,
                model: formData.model,
                temperature: Number(formData.temperature),
                max_tokens: Number(formData.max_tokens),
                system_prompt: formData.system_prompt,
                sla_threshold_seconds: Number(formData.sla_threshold_seconds),
                whatsapp_number: formData.whatsapp_number,
            };

            let savedData;

            if (currentAgent?.id) {
                const { data, error } = await supabase
                    .from('workers_ia_agents')
                    .update(payload)
                    .eq('id', currentAgent.id)
                    .select()
                    .single();

                if (error) throw error;
                savedData = data;
            } else {
                const { data, error } = await supabase
                    .from('workers_ia_agents')
                    .insert({
                        organization_id: organizationId,
                        client_id: clientId,
                        ...payload
                    })
                    .select()
                    .single();

                if (error) throw error;
                savedData = data;

                // Auto-create instance with 'disconnected' status when agent is created
                if (!myInstance) {
                    await supabase.from('instances').insert({
                        name: instanceName,
                        status: 'disconnected',
                        organization_id: organizationId,
                        client_id: clientId,
                        agent_id: savedData.id
                    });
                }
            }

            setCurrentAgent(savedData as WorkerAgent);

            // For wizard mode, advance steps
            if (advanceStep && !isInline) {
                if (currentStep === 'identity') setCurrentStep('brain');
                if (currentStep === 'brain') {
                    setCurrentStep('connect');
                    if (onSave) onSave(savedData as WorkerAgent);
                }
            } else {
                // For inline mode, just notify save
                if (onSave) onSave(savedData as WorkerAgent);
            }

        } catch (error: any) {
            console.error('Error saving worker:', error);
            alert(`Erro ao salvar: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const wizardSteps: { id: WizardStep, label: string, icon: any }[] = [
        { id: 'identity', label: 'Identidade', icon: Zap },
        { id: 'brain', label: 'Cérebro', icon: BrainCircuit },
        { id: 'connect', label: 'Conexão', icon: Smartphone }
    ];

    const inlineTabs: { id: InlineTab, label: string, icon: any }[] = [
        { id: 'general', label: 'Geral', icon: Settings },
        { id: 'prompt', label: 'Prompt', icon: BrainCircuit },
        { id: 'connection', label: 'Conexão', icon: Smartphone }
    ];

    const currentStepIndex = wizardSteps.findIndex(s => s.id === currentStep);

    // ==================== SHARED UI COMPONENTS ====================

    const GeneralSection = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nome do Worker *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Consultor de Vendas"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                        required
                    />
                </div>
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Função (Tag)
                    </label>
                    <select
                        value="sdr"
                        disabled
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white opacity-50 cursor-not-allowed"
                    >
                        <option value="sdr">SDR / Vendas</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Modelo de IA
                    </label>
                    <select
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    >
                        <option value="gpt-4o">GPT-4o (OpenAI)</option>
                        <option value="gpt-4o-mini">GPT-4o Mini (Rápido)</option>
                        <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                        <option value="deepseek-v3">DeepSeek V3 (Custo-Benefício)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        SLA de Resposta (Segundos)
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={formData.sla_threshold_seconds}
                        onChange={(e) => setFormData({ ...formData, sla_threshold_seconds: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div>
                    <p className="text-sm font-medium text-white">Status</p>
                    <p className="text-xs text-slate-500">
                        Worker está {formData.is_active ? 'Ativo' : 'Pausado'}
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-violet-500 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white"></div>
                </label>
            </div>
        </div>
    );

    const PromptSection = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex justify-between">
                        <span>Temperatura ({formData.temperature})</span>
                        <span className="text-xs text-slate-500">{formData.temperature > 1 ? 'Criativo' : 'Preciso'}</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Max Tokens
                    </label>
                    <input
                        type="number"
                        step="100"
                        value={formData.max_tokens}
                        onChange={(e) => setFormData({ ...formData, max_tokens: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-400" />
                    Instruções Principais
                </label>
                <textarea
                    value={formData.system_prompt}
                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                    placeholder="Você é um assistente útil e amigável..."
                    className={`w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono text-sm leading-relaxed resize-none custom-scrollbar ${isInline ? 'h-64' : 'h-80'}`}
                />
            </div>
        </div>
    );

    const ConnectionSection = () => (
        <div className="space-y-6">
            {/* WhatsApp Number Field */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    Número do WhatsApp
                </label>
                <input
                    type="text"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    placeholder="Ex: 5511999999999"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Formato: código do país + DDD + número (sem espaços ou caracteres especiais)</p>
            </div>

            {/* QR Code / Connection Status */}
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <h4 className="font-bold text-white mb-4 text-center">Status da Conexão</h4>
                {isConnected ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500/20">
                            <CheckCircle className="w-10 h-10 text-emerald-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-bold text-lg">Conectado!</p>
                            <p className="text-slate-400 text-sm">O agente está online.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {!connectingWs && !isWaitingQr ? (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                                    <QrCode className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-400 text-sm mb-4 text-center">
                                    {myInstance?.status === 'disconnected'
                                        ? 'Instância criada. Gere o QR Code para conectar.'
                                        : 'Clique para gerar o QR Code de conexão.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleConnectWhatsApp}
                                    disabled={!currentAgent?.id}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                >
                                    <Smartphone className="w-4 h-4" />
                                    Gerar QR Code
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-4">
                                {myInstance?.qrCode ? (
                                    <div className="space-y-4">
                                        <div className="bg-white p-3 rounded-2xl border-4 border-emerald-500/30 shadow-2xl mx-auto">
                                            <img
                                                src={myInstance.qrCode}
                                                alt="QR Code"
                                                className="w-48 h-48"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-bold animate-pulse">Aguardando leitura...</p>
                                            <p className="text-xs text-slate-400">Abra o WhatsApp &gt; Dispositivos Conectados</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-3" />
                                        <p className="text-slate-300 font-medium">Gerando QR Code...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // ==================== INLINE MODE (for existing agents in tab) ====================
    if (isInline) {
        return (
            <div className="h-full flex flex-col bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                {/* Inline Tabs */}
                <div className="flex border-b border-slate-700/50 bg-slate-800/30">
                    {inlineTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeInlineTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveInlineTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 ${isActive
                                        ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeInlineTab === 'general' && <GeneralSection />}
                    {activeInlineTab === 'prompt' && <PromptSection />}
                    {activeInlineTab === 'connection' && <ConnectionSection />}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-4 border-t border-slate-700/50 bg-slate-900/50 gap-3">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        );
    }

    // ==================== MODAL MODE (for onboarding new agents) ====================
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl shadow-lg shadow-violet-500/20">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-white">
                                {isEditing ? 'Configurar Worker IA' : 'Novo Worker IA'}
                            </h2>
                            <p className="text-sm text-slate-400">
                                Passo {currentStepIndex + 1} de 3
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Stepper */}
                <div className="px-8 py-4 bg-slate-800/30 border-b border-slate-700/50">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-700 -z-10" />
                        {wizardSteps.map((step, idx) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = idx < currentStepIndex;
                            const Icon = step.icon;

                            return (
                                <div
                                    key={step.id}
                                    className={`flex flex-col items-center gap-2 bg-slate-900 px-2 ${isActive ? 'scale-110' : ''} transition-all duration-300`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isActive ? 'border-violet-500 bg-violet-500/10 text-violet-400' :
                                            isCompleted ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                                                'border-slate-700 bg-slate-800 text-slate-500'
                                        }`}>
                                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-xs font-medium ${isActive ? 'text-violet-400' :
                                            isCompleted ? 'text-emerald-400' :
                                                'text-slate-500'
                                        }`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {currentStep === 'identity' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="font-bold text-white text-lg mb-4">Configuração Básica</h3>
                            <GeneralSection />
                        </div>
                    )}

                    {currentStep === 'brain' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="font-bold text-white text-lg mb-4">Prompt do Sistema</h3>
                            <PromptSection />
                        </div>
                    )}

                    {currentStep === 'connect' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center mb-6">
                                <h3 className="font-bold text-white text-lg">Conecte o WhatsApp</h3>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    O Worker foi criado com sucesso. Conecte o número para ativá-lo.
                                </p>
                            </div>
                            <ConnectionSection />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end p-6 border-t border-slate-700/50 bg-slate-900/50 gap-3">
                    {currentStep === 'identity' && (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                            <button
                                onClick={() => handleSave(true)}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                Próximo: Cérebro
                            </button>
                        </>
                    )}

                    {currentStep === 'brain' && (
                        <>
                            <button
                                onClick={() => setCurrentStep('identity')}
                                className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={() => handleSave(true)}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                Próximo: Conexão
                            </button>
                        </>
                    )}

                    {currentStep === 'connect' && (
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <Check className="w-4 h-4" />
                            Finalizar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
