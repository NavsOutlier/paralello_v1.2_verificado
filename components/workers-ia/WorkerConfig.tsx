import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import {
    Settings, Save, X, Bot, Zap, CheckCircle,
    AlertCircle, Activity, BrainCircuit, Type, FileText,
    Smartphone, Loader2, RefreshCw, QrCode, ArrowRight, Check, Phone,
    Plus, Trash2, ToggleLeft, ToggleRight, Filter, MessageSquare,
    GripVertical, Layout, ChevronUp, ChevronDown, Palette, RotateCcw
} from 'lucide-react';

interface FunnelStage {
    id: string;
    label: string;
    color: string;
    bg: string;
    border: string;
}

interface HandoffTrigger {
    id?: string;
    trigger_type: 'ai_phrase' | 'lead_keyword' | 'satisfaction_score';
    keyword: string; // For ai_phrase: the phrase AI must say. For lead_keyword: keywords to detect
    satisfactionThreshold?: number; // For satisfaction_score: threshold below which to trigger
    stage: string;
    action: 'notify' | 'transfer';
    farewellMessage: string;
    groupMessage: string;
}

interface FollowupConfig {
    max_attempts: number;
    interval_hours: number[];
    messages: string[];
}

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
    handoff_triggers?: HandoffTrigger[];
    funnel_config?: FunnelStage[];
    followup_config?: FollowupConfig;
    notification_group_id?: string;
    notification_group_name?: string;
}

interface WorkerConfigProps {
    agent?: WorkerAgent;
    clientId: string;
    clientName?: string;
    onSave?: (agent: WorkerAgent) => void;
    onClose: () => void;
    isInline?: boolean; // NEW: Show inline (tab) instead of modal (onboarding)
}

type WizardStep = 'identity' | 'brain' | 'funnel' | 'triggers' | 'followups' | 'connect';
type InlineTab = 'general' | 'prompt' | 'funnel' | 'triggers' | 'followups' | 'connection';

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
        handoff_triggers: agent?.handoff_triggers || [] as HandoffTrigger[],
        funnel_config: (agent?.funnel_config || [
            { id: 'new_lead', label: 'Novos', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
            { id: 'interested', label: 'Interessados', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
            { id: 'qualified', label: 'Qualificados', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { id: 'scheduled', label: 'Agendados', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
            { id: 'patient', label: 'Já Paciente', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { id: 'no_response', label: 'Sem Resposta', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { id: 'lost', label: 'Perdido', color: 'text-slate-500', bg: 'bg-slate-700/10', border: 'border-slate-700/20' },
            { id: 'disqualified', label: 'Desqualificados', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        ]) as FunnelStage[],
        followup_config: (agent?.followup_config || {
            max_attempts: 3,
            interval_hours: [24, 48, 72],
            messages: ['', '', '']
        }) as FollowupConfig,
        notification_group_id: agent?.notification_group_id || '',
        notification_group_name: agent?.notification_group_name || '',
    });

    // State for group creation form
    const [groupName, setGroupName] = useState('');
    const [groupParticipants, setGroupParticipants] = useState<{ name: string; phone: string }[]>([]);
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Fetch normalized funnel stages on load
    useEffect(() => {
        const fetchNormalizedStages = async () => {
            if (!agent?.id) return;
            const { data, error } = await supabase
                .from('workers_ia_funnel_stages')
                .select('*')
                .eq('agent_id', agent.id)
                .order('position', { ascending: true });

            if (!error && data && data.length > 0) {
                const mappedStages = data.map(s => ({
                    id: s.stage_key,
                    label: s.label,
                    color: s.color,
                    bg: s.bg,
                    border: s.border
                }));
                setFormData(prev => ({ ...prev, funnel_config: mappedStages }));
            }
        };

        fetchNormalizedStages();
    }, [agent?.id]);

    // Fetch normalized handoff triggers on load
    useEffect(() => {
        const fetchNormalizedTriggers = async () => {
            if (!agent?.id) return;
            const { data, error } = await supabase
                .from('workers_ia_handoff_triggers')
                .select('*')
                .eq('agent_id', agent.id)
                .eq('is_active', true);

            if (!error && data && data.length > 0) {
                const mappedTriggers: HandoffTrigger[] = data.map(t => ({
                    id: t.id,
                    trigger_type: (t.trigger_type || 'lead_keyword') as 'ai_phrase' | 'lead_keyword' | 'satisfaction_score',
                    keyword: t.keyword || '',
                    satisfactionThreshold: t.satisfaction_threshold || undefined,
                    stage: t.target_stage,
                    action: t.action as 'notify' | 'transfer',
                    farewellMessage: t.farewell_message || '',
                    groupMessage: t.group_message || ''
                }));
                setFormData(prev => ({ ...prev, handoff_triggers: mappedTriggers }));
            }
        };

        fetchNormalizedTriggers();
    }, [agent?.id]);

    // Fetch normalized followups on load
    useEffect(() => {
        const fetchNormalizedFollowups = async () => {
            if (!agent?.id) return;
            const { data, error } = await supabase
                .from('workers_ia_followups')
                .select('*')
                .eq('agent_id', agent.id)
                .eq('is_active', true)
                .order('attempt_number', { ascending: true });

            if (!error && data && data.length > 0) {
                const maxAttempts = data.length;
                const intervals = data.map(f => f.interval_hours);
                const messages = data.map(f => f.message_template || '');
                setFormData(prev => ({
                    ...prev,
                    followup_config: { max_attempts: maxAttempts, interval_hours: intervals, messages }
                }));
            }
        };

        fetchNormalizedFollowups();
    }, [agent?.id]);

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
                handoff_triggers: formData.handoff_triggers,
                funnel_config: formData.funnel_config,
                followup_config: formData.followup_config,
                notification_group_id: formData.notification_group_id || null,
                notification_group_name: formData.notification_group_name || null,
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

            // Normalize: Sync with workers_ia_funnel_stages
            if (savedData?.id) {
                // 1. Delete stages not in the current list
                const currentKeys = formData.funnel_config.map(s => s.id);
                await supabase
                    .from('workers_ia_funnel_stages')
                    .delete()
                    .eq('agent_id', savedData.id)
                    .not('stage_key', 'in', `(${currentKeys.join(',')})`);

                // 2. Upsert current stages
                const stagesToUpsert = formData.funnel_config.map((s, idx) => ({
                    agent_id: savedData.id,
                    stage_key: s.id,
                    label: s.label,
                    color: s.color,
                    bg: s.bg,
                    border: s.border,
                    position: idx
                }));

                await supabase
                    .from('workers_ia_funnel_stages')
                    .upsert(stagesToUpsert, { onConflict: 'agent_id,stage_key' });
            }

            // Normalize: Sync with workers_ia_handoff_triggers
            if (savedData?.id) {
                // 1. Delete triggers not in the current list
                const currentTriggerKeywords = formData.handoff_triggers.map(t => t.keyword).filter(k => k);
                await supabase
                    .from('workers_ia_handoff_triggers')
                    .delete()
                    .eq('agent_id', savedData.id);

                // 2. Insert current triggers (fresh insert since we deleted all)
                if (formData.handoff_triggers.length > 0) {
                    const triggersToInsert = formData.handoff_triggers
                        .filter(t => t.keyword || t.trigger_type === 'satisfaction_score')
                        .map(t => ({
                            agent_id: savedData.id,
                            trigger_type: t.trigger_type || 'lead_keyword',
                            keyword: t.keyword || '',
                            satisfaction_threshold: t.satisfactionThreshold || null,
                            target_stage: t.stage,
                            action: t.action,
                            farewell_message: t.farewellMessage,
                            group_message: t.groupMessage,
                            is_active: true
                        }));

                    if (triggersToInsert.length > 0) {
                        await supabase
                            .from('workers_ia_handoff_triggers')
                            .insert(triggersToInsert);
                    }
                }
            }

            // Normalize: Sync with workers_ia_followups
            if (savedData?.id) {
                // Delete existing followups
                await supabase
                    .from('workers_ia_followups')
                    .delete()
                    .eq('agent_id', savedData.id);

                // Insert current followups
                const followupsToInsert = [];
                for (let i = 0; i < formData.followup_config.max_attempts; i++) {
                    followupsToInsert.push({
                        agent_id: savedData.id,
                        attempt_number: i + 1,
                        interval_hours: formData.followup_config.interval_hours[i] || (24 * (i + 1)),
                        message_template: formData.followup_config.messages[i] || '',
                        is_active: true
                    });
                }

                if (followupsToInsert.length > 0) {
                    await supabase
                        .from('workers_ia_followups')
                        .insert(followupsToInsert);
                }
            }

            // For wizard mode, advance steps
            if (advanceStep && !isInline) {
                if (currentStep === 'identity') setCurrentStep('brain');
                else if (currentStep === 'brain') setCurrentStep('funnel');
                else if (currentStep === 'funnel') setCurrentStep('triggers');
                else if (currentStep === 'triggers') setCurrentStep('followups');
                else if (currentStep === 'followups') {
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
        { id: 'funnel', label: 'Funil', icon: Layout },
        { id: 'triggers', label: 'Gatilhos', icon: Filter },
        { id: 'followups', label: 'Followups', icon: RotateCcw },
        { id: 'connect', label: 'Conexão', icon: Smartphone }
    ];

    const inlineTabs: { id: InlineTab, label: string, icon: any }[] = [
        { id: 'general', label: 'Geral', icon: Settings },
        { id: 'prompt', label: 'Prompt', icon: BrainCircuit },
        { id: 'funnel', label: 'Funil', icon: Layout },
        { id: 'triggers', label: 'Gatilhos', icon: Filter },
        { id: 'followups', label: 'Followups', icon: RotateCcw },
        { id: 'connection', label: 'Conexão', icon: Smartphone }
    ];

    const currentStepIndex = wizardSteps.findIndex(s => s.id === currentStep);

    // ==================== SHARED UI COMPONENTS ====================

    const renderGeneralSection = () => (
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
                        SLA Máximo de Resposta (Segundos)
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

    const renderPromptSection = () => (
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

    const renderConnectionSection = () => (
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

            {/* Notification Group Section - Only show when connected */}
            {isConnected && (
                <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/20 p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                            <Phone className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white">Grupo de Notificação</h4>
                            <p className="text-xs text-slate-400">Grupo WhatsApp para receber alertas de handoff</p>
                        </div>
                    </div>

                    {formData.notification_group_id ? (
                        <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                <div>
                                    <p className="text-white font-medium">{formData.notification_group_name || 'Grupo Configurado'}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">ID: {formData.notification_group_id}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, notification_group_id: '', notification_group_name: '' }))}
                                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                            >
                                Remover
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                    Nome do Grupo
                                </label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Notificações - Clínica ABC"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                                    Participantes ({groupParticipants.length})
                                </label>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {groupParticipants.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-2">
                                            <input
                                                type="text"
                                                value={p.name}
                                                onChange={(e) => {
                                                    const updated = [...groupParticipants];
                                                    updated[idx].name = e.target.value;
                                                    setGroupParticipants(updated);
                                                }}
                                                placeholder="Nome"
                                                className="flex-1 px-2 py-1 bg-transparent border-b border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none"
                                            />
                                            <input
                                                type="text"
                                                value={p.phone}
                                                onChange={(e) => {
                                                    const updated = [...groupParticipants];
                                                    updated[idx].phone = e.target.value;
                                                    setGroupParticipants(updated);
                                                }}
                                                placeholder="5511999999999"
                                                className="w-36 px-2 py-1 bg-transparent border-b border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setGroupParticipants(groupParticipants.filter((_, i) => i !== idx))}
                                                className="p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setGroupParticipants([...groupParticipants, { name: '', phone: '' }])}
                                    className="mt-2 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Adicionar Participante
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    if (!groupName || groupParticipants.length === 0) {
                                        alert('Preencha o nome do grupo e adicione pelo menos 1 participante');
                                        return;
                                    }
                                    setCreatingGroup(true);
                                    try {
                                        const { data, error } = await createGroup(
                                            groupName,
                                            'worker-notification', // Placeholder for workers as they don't have a dedicated client ID here, or we use agent_id
                                            groupParticipants[0]?.phone.replace(/\D/g, ''),
                                            currentAgent?.id
                                        );

                                        if (error) throw error;

                                        // Wait-and-poll logic or assumption that n8n worked correctly 
                                        // (Usually the webhook returns success immediately)
                                        showToast('Criação do grupo solicitada com sucesso!');

                                        // Clear local states
                                        setGroupName('');
                                        setGroupParticipants([]);
                                    } catch (error: any) {
                                        alert(`Erro: ${error.message}`);
                                    } finally {
                                        setCreatingGroup(false);
                                    }
                                }}
                                disabled={creatingGroup || !groupName || groupParticipants.length === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all"
                            >
                                {creatingGroup ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Criando Grupo...</>
                                ) : (
                                    <><Phone className="w-4 h-4" /> Criar Grupo WhatsApp</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // ==================== TRIGGER LOGIC ====================

    const addTrigger = () => {
        const newTrigger: HandoffTrigger = {
            id: crypto.randomUUID(),
            trigger_type: 'lead_keyword',
            keyword: '',
            satisfactionThreshold: undefined,
            stage: formData.funnel_config[2]?.id || 'qualified',
            action: 'notify',
            farewellMessage: 'Vou transferir você para nossa equipe. Em instantes alguém vai te atender!',
            groupMessage: '🚨 Novo lead qualificado! Cliente solicitou atendimento humano.',
        };
        setFormData({
            ...formData,
            handoff_triggers: [...formData.handoff_triggers, newTrigger],
        });
    };

    const updateTrigger = (id: string, updates: Partial<HandoffTrigger>) => {
        setFormData({
            ...formData,
            handoff_triggers: formData.handoff_triggers.map((t) =>
                t.id === id ? { ...t, ...updates } : t
            ),
        });
    };

    const removeTrigger = (id: string) => {
        setFormData({
            ...formData,
            handoff_triggers: formData.handoff_triggers.filter((t) => t.id !== id),
        });
    };

    const renderTriggersSection = () => (
        <div className="space-y-6">
            {/* Triggers Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                        <Filter className="w-4 h-4 text-amber-400" />
                        Gatilhos de Handoff
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                        Configure quando a IA deve parar e transferir para o suporte humano
                    </p>
                </div>
                <button
                    type="button"
                    onClick={addTrigger}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-all text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Adicionar Gatilho
                </button>
            </div>

            {/* Triggers List */}
            {formData.handoff_triggers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                    <Filter className="w-12 h-12 text-slate-600 mb-4" />
                    <p className="text-slate-400 text-center">
                        Nenhum gatilho configurado.<br />
                        <span className="text-xs text-slate-500">A IA responderá todas as mensagens normalmente.</span>
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {formData.handoff_triggers.map((trigger, index) => (
                        <div
                            key={trigger.id}
                            className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Gatilho #{index + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeTrigger(trigger.id)}
                                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    title="Remover"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Trigger Type Selector */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {[
                                        { type: 'lead_keyword', label: '🔍 Palavra do Lead', desc: 'Lead diz algo parecido' },
                                        { type: 'ai_phrase', label: '🤖 Frase da IA', desc: 'IA fala determinada frase' },
                                        { type: 'satisfaction_score', label: '📊 Satisfação', desc: 'Score abaixo de X' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.type}
                                            type="button"
                                            onClick={() => updateTrigger(trigger.id, { trigger_type: opt.type as any })}
                                            className={`p-3 rounded-xl border text-left transition-all ${trigger.trigger_type === opt.type
                                                ? 'border-amber-500 bg-amber-500/10'
                                                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                                }`}
                                        >
                                            <span className="text-sm font-bold text-white">{opt.label}</span>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>

                                {/* Conditional Input based on Type */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {trigger.trigger_type === 'lead_keyword' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                                Palavras-chave (separadas por vírgula)
                                            </label>
                                            <input
                                                type="text"
                                                value={trigger.keyword}
                                                onChange={(e) => updateTrigger(trigger.id, { keyword: e.target.value })}
                                                placeholder="preço, valor, orçamento, quanto custa"
                                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                            />
                                            <p className="text-[10px] text-slate-600 mt-1">Quando o lead mencionar estas palavras</p>
                                        </div>
                                    )}

                                    {trigger.trigger_type === 'ai_phrase' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                                Frase que a IA deve dizer
                                            </label>
                                            <input
                                                type="text"
                                                value={trigger.keyword}
                                                onChange={(e) => updateTrigger(trigger.id, { keyword: e.target.value })}
                                                placeholder="Vou transferir você para um atendente"
                                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                                            />
                                            <p className="text-[10px] text-slate-600 mt-1">A IA precisa falar exatamente esta frase para disparar</p>
                                        </div>
                                    )}

                                    {trigger.trigger_type === 'satisfaction_score' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                                Limite de Satisfação (0-10)
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={trigger.satisfactionThreshold || 3}
                                                    onChange={(e) => updateTrigger(trigger.id, { satisfactionThreshold: Number(e.target.value) })}
                                                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                                />
                                                <span className="text-xl font-black text-rose-400 w-8 text-center">
                                                    {trigger.satisfactionThreshold || 3}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-600 mt-1">Dispara quando satisfação do lead fica abaixo deste valor</p>
                                        </div>
                                    )}

                                    {/* Common Fields: Stage and Action */}
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                            Mover para Etapa
                                        </label>
                                        <select
                                            value={trigger.stage}
                                            onChange={(e) => updateTrigger(trigger.id, { stage: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                        >
                                            {formData.funnel_config.map((stage) => (
                                                <option key={stage.id} value={stage.id}>{stage.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Action Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                            Ação
                                        </label>
                                        <select
                                            value={trigger.action}
                                            onChange={(e) => updateTrigger(trigger.id, { action: e.target.value as 'notify' | 'transfer' })}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                        >
                                            <option value="notify">Notificar Humano</option>
                                            <option value="transfer">Transferir Conversa</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Farewell Message - Hidden for ai_phrase since the phrase IS the farewell */}
                            {trigger.trigger_type !== 'ai_phrase' && (
                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        Mensagem de Despedida
                                    </label>
                                    <textarea
                                        value={trigger.farewellMessage}
                                        onChange={(e) => updateTrigger(trigger.id, { farewellMessage: e.target.value })}
                                        placeholder="Vou transferir você para nossa equipe..."
                                        rows={2}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
                                    />
                                </div>
                            )}

                            {/* Group Message */}
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    Mensagem para Grupo de Notificação
                                </label>
                                <textarea
                                    value={trigger.groupMessage}
                                    onChange={(e) => updateTrigger(trigger.id, { groupMessage: e.target.value })}
                                    placeholder="🚨 Novo lead qualificado! Nome: {{lead_name}}, Tel: {{lead_phone}}"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
                                />
                                <p className="text-[10px] text-slate-600 mt-1">Variáveis: {'{{lead_name}}'}, {'{{lead_phone}}'}, {'{{trigger_keyword}}'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Box */}
            <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                <p className="text-xs text-amber-300/80">
                    <strong>Como funciona:</strong> Quando a palavra-chave é detectada, a IA envia a mensagem de despedida ao lead e notifica o grupo.
                </p>
            </div>
        </div>
    );

    // ==================== FOLLOWUPS SECTION ====================

    const updateFollowupConfig = (updates: Partial<FollowupConfig>) => {
        setFormData({
            ...formData,
            followup_config: { ...formData.followup_config, ...updates }
        });
    };

    const updateFollowupMessage = (index: number, message: string) => {
        const newMessages = [...formData.followup_config.messages];
        newMessages[index] = message;
        updateFollowupConfig({ messages: newMessages });
    };

    const updateFollowupInterval = (index: number, hours: number) => {
        const newIntervals = [...formData.followup_config.interval_hours];
        newIntervals[index] = hours;
        updateFollowupConfig({ interval_hours: newIntervals });
    };

    const renderFollowupsSection = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/10 rounded-xl">
                    <RotateCcw className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Configuração de Followups</h3>
                    <p className="text-sm text-slate-500">Defina a sequência de reengajamento para leads sem resposta</p>
                </div>
            </div>

            {/* Max Attempts Slider */}
            <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">Máximo de Tentativas</label>
                    <span className="text-2xl font-black text-cyan-400">{formData.followup_config.max_attempts}</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={formData.followup_config.max_attempts}
                    onChange={(e) => updateFollowupConfig({ max_attempts: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>1 tentativa</span>
                    <span>2 tentativas</span>
                    <span>3 tentativas</span>
                </div>
            </div>

            {/* Per-Attempt Configuration */}
            <div className="space-y-4">
                {[0, 1, 2].slice(0, formData.followup_config.max_attempts).map((index) => (
                    <div key={index} className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                                {index + 1}
                            </span>
                            <h4 className="font-bold text-white">{index + 1}º Followup</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                    Intervalo (horas)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="168"
                                    value={formData.followup_config.interval_hours[index] || 24}
                                    onChange={(e) => updateFollowupInterval(index, Number(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                    Mensagem Template
                                </label>
                                <textarea
                                    value={formData.followup_config.messages[index] || ''}
                                    onChange={(e) => updateFollowupMessage(index, e.target.value)}
                                    placeholder={`Ex: Olá! Notei que não conseguimos conversar. Posso te ajudar com algo?`}
                                    rows={2}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cyan-500 focus:outline-none resize-none"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Box */}
            <div className="p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/20">
                <p className="text-xs text-cyan-300/80">
                    <strong>Como funciona:</strong> Após o intervalo definido sem resposta do lead, a IA automaticamente envia a mensagem de followup correspondente.
                    Se o lead responder, o contador é zerado e a conversa segue normalmente.
                </p>
            </div>
        </div>
    );

    // ==================== FUNNEL LOGIC ====================

    const addFunnelStage = () => {
        const newStage: FunnelStage = {
            id: `stage_${Date.now()}`,
            label: 'Nova Etapa',
            color: 'text-slate-400',
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/20'
        };
        setFormData({
            ...formData,
            funnel_config: [...formData.funnel_config, newStage]
        });
    };

    const removeFunnelStage = (id: string) => {
        setFormData({
            ...formData,
            funnel_config: formData.funnel_config.filter(s => s.id !== id)
        });
    };

    const updateFunnelStage = (id: string, updates: Partial<FunnelStage>) => {
        setFormData({
            ...formData,
            funnel_config: formData.funnel_config.map(s => s.id === id ? { ...s, ...updates } : s)
        });
    };

    const moveFunnelStage = (index: number, direction: 'up' | 'down') => {
        const newConfig = [...formData.funnel_config];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newConfig.length) return;

        const temp = newConfig[index];
        newConfig[index] = newConfig[targetIndex];
        newConfig[targetIndex] = temp;

        setFormData({ ...formData, funnel_config: newConfig });
    };

    const COLOR_PRESETS = [
        { label: 'Cinza', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
        { label: 'Ciano', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
        { label: 'Esmeralda', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: 'Verde', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { label: 'Azul', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { label: 'Âmbar', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        { label: 'Violeta', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
        { label: 'Rosa', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    ];

    const renderFunnelSection = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                        <Layout className="w-4 h-4 text-violet-400" />
                        Etapas do Funil (Kanban)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">Personalize as colunas e o fluxo do seu atendimento</p>
                </div>
                <button
                    type="button"
                    onClick={addFunnelStage}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-all text-sm block"
                >
                    <Plus className="w-4 h-4" />
                    Adicionar Etapa
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {formData.funnel_config.map((stage, idx) => (
                    <div
                        key={stage.id}
                        className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-2xl group hover:border-violet-500/30 transition-all"
                    >
                        <div className="flex flex-col gap-1">
                            <button
                                type="button"
                                onClick={() => moveFunnelStage(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 text-slate-500 hover:text-white disabled:opacity-0"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveFunnelStage(idx, 'down')}
                                disabled={idx === formData.funnel_config.length - 1}
                                className="p-1 text-slate-500 hover:text-white disabled:opacity-0"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-12 md:col-span-5">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Rótulo da Etapa</label>
                                <input
                                    type="text"
                                    value={stage.label}
                                    onChange={(e) => updateFunnelStage(stage.id, { label: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-violet-500 focus:outline-none"
                                />
                            </div>
                            <div className="col-span-10 md:col-span-5">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Cor / Estilo</label>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={stage.color}
                                        onChange={(e) => {
                                            const preset = COLOR_PRESETS.find(p => p.color === e.target.value);
                                            if (preset) updateFunnelStage(stage.id, preset);
                                        }}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                                    >
                                        {COLOR_PRESETS.map(p => (
                                            <option key={p.color} value={p.color}>{p.label}</option>
                                        ))}
                                    </select>
                                    <div className={`w-8 h-8 rounded-lg border-2 ${stage.bg} ${stage.border} flex-shrink-0`} />
                                </div>
                            </div>
                            <div className="col-span-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => removeFunnelStage(stage.id)}
                                    className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                    title="Remover Etapa"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                    * A ordem das etapas aqui define a ordem das colunas no seu Kanban Board.<br />
                    * Se você remover uma etapa que já possui leads, eles aparecerão como 'Desconhecidos' até serem movidos.
                </p>
            </div>
        </div>
    );

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

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeInlineTab === 'general' && renderGeneralSection()}
                    {activeInlineTab === 'prompt' && renderPromptSection()}
                    {activeInlineTab === 'funnel' && renderFunnelSection()}
                    {activeInlineTab === 'triggers' && renderTriggersSection()}
                    {activeInlineTab === 'followups' && renderFollowupsSection()}
                    {activeInlineTab === 'connection' && renderConnectionSection()}
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
                                Passo {currentStepIndex + 1} de {wizardSteps.length}
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
                                    <span className={`text-[10px] font-medium ${isActive ? 'text-violet-400' :
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
                            {renderGeneralSection()}
                        </div>
                    )}

                    {currentStep === 'brain' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="font-bold text-white text-lg mb-4">Prompt do Sistema</h3>
                            {renderPromptSection()}
                        </div>
                    )}

                    {currentStep === 'funnel' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {renderFunnelSection()}
                        </div>
                    )}

                    {currentStep === 'triggers' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {renderTriggersSection()}
                        </div>
                    )}

                    {currentStep === 'followups' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {renderFollowupsSection()}
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
                            {renderConnectionSection()}
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
                                Próximo: Funil
                            </button>
                        </>
                    )}

                    {currentStep === 'funnel' && (
                        <>
                            <button
                                onClick={() => setCurrentStep('brain')}
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
                                Próximo: Gatilhos
                            </button>
                        </>
                    )}

                    {currentStep === 'triggers' && (
                        <>
                            <button
                                onClick={() => setCurrentStep('funnel')}
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
