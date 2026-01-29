import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import {
    Settings, Save, X, Bot, Zap, CheckCircle,
    AlertCircle, Activity, BrainCircuit, Type, FileText,
    Smartphone, Loader2, RefreshCw, QrCode
} from 'lucide-react';

// Using 'any' for now, but should link to a proper type in types/workers-ia
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
}

export const WorkerConfig: React.FC<WorkerConfigProps> = ({
    agent,
    clientId,
    clientName,
    onSave,
    onClose
}) => {
    const { organizationId } = useAuth();
    const { instances, createInstance } = useWhatsApp();
    const [saving, setSaving] = useState(false);
    const [connectingWs, setConnectingWs] = useState(false);

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
                createInstance(instanceName, 'create_instance_worker_ia').catch(console.error);
            }, 10000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [connectingWs, isWaitingQr, isConnected, instanceName, createInstance]);

    // Auto-fill connected number (mock logic or real if available in instance)
    useEffect(() => {
        if (isConnected && !formData.whatsapp_number) {
            // If the instance has the phone number in its metadata, we could use it.
            // For now, simpler to just mark as connected visually.
        }
    }, [isConnected]);

    const handleConnectWhatsApp = async () => {
        setConnectingWs(true);
        try {
            await createInstance(instanceName, 'create_instance_worker_ia');
        } catch (error) {
            console.error('Error creating instance:', error);
            alert('Erro ao gerar QR Code. Tente novamente.');
            setConnectingWs(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Nome é obrigatório');
            return;
        }

        const whatsappRef = formData.whatsapp_number?.replace(/\D/g, '') || '';
        if (whatsappRef.length > 0) {
            if (!whatsappRef.startsWith('55')) {
                alert('O número do WhatsApp deve começar com 55 (Brasil)');
                return;
            }
            if (whatsappRef.length < 12) {
                alert('O número do WhatsApp parece incompleto (min 12 dígitos com DDD)');
                return;
            }
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

            let result;

            if (isEditing) {
                const { data, error } = await supabase
                    .from('workers_ia_agents')
                    .update(payload)
                    .eq('id', agent.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
                onSave?.(data as WorkerAgent);
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
                result = data;
                onSave?.(data as WorkerAgent);
            }
        } catch (error: any) {
            console.error('Error saving worker:', error);
            alert(`Erro ao salvar: ${error.message}`);
        }

        setSaving(false);
    };

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
                                {isEditing ? 'Ajuste o comportamento e os parâmetros' : 'Crie um novo agente inteligente'}
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

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-violet-400" />
                            Identidade & Papel
                        </h3>

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
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:outline-none opacity-50 cursor-not-allowed"
                                >
                                    <option value="sdr">SDR / Vendas</option>
                                </select>
                            </div>
                        </div>

                        {/* WhatsApp Connection Section */}
                        <div className="mt-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                    <Smartphone className="w-4 h-4 text-emerald-400" />
                                    Conexão WhatsApp
                                </label>
                                {isConnected ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                                        <CheckCircle className="w-3 h-3" />
                                        Conectado
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-xs font-medium">
                                        Desconectado
                                    </span>
                                )}
                            </div>

                            {isConnected ? (
                                <div className="space-y-4">
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-center gap-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-full">
                                            <Smartphone className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">WhatsApp Vinculado</p>
                                            <p className="text-xs text-slate-400 mt-0.5">O agente está pronto para enviar e receber mensagens.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                                            Número Confirmado
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.whatsapp_number}
                                            onChange={(e) => {
                                                const onlyNums = e.target.value.replace(/\D/g, '');
                                                setFormData({ ...formData, whatsapp_number: onlyNums });
                                            }}
                                            placeholder="Ex: 5511999999999"
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Este número será usado para validação e disparo.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {!connectingWs && !myInstance ? (
                                        <div className="text-center py-6">
                                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                                <QrCode className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="text-slate-300 font-medium mb-1">Nenhuma conexão ativa</p>
                                            <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">
                                                Conecte o WhatsApp do cliente para permitir que o SDR Max atue automaticamente.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleConnectWhatsApp}
                                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 mx-auto"
                                            >
                                                <Smartphone className="w-4 h-4" />
                                                Gerar QR Code
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4 animate-in fade-in duration-500">
                                            {myInstance?.qrCode ? (
                                                <div className="relative group">
                                                    <div className="bg-white p-3 rounded-2xl border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
                                                        <img
                                                            src={myInstance.qrCode}
                                                            alt="QR Code"
                                                            className="w-48 h-48"
                                                        />
                                                    </div>
                                                    <div className="text-center mt-4">
                                                        <p className="text-white font-bold animate-pulse">Aguardando leitura...</p>
                                                        <p className="text-xs text-slate-400 mt-1">Abra o WhatsApp &gt; Dispositivos Conectados</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-3" />
                                                    <p className="text-slate-300 font-medium">Gerando QR Code...</p>
                                                    <p className="text-xs text-slate-500 mt-1">Isso pode levar alguns segundos.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Brain Config */}
                    <div className="space-y-4 bg-violet-500/5 p-5 rounded-2xl border border-violet-500/20">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4 text-violet-400" />
                            Cérebro & Parâmetros
                        </h3>

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
                                    SLA de Resposta (Segundos)
                                </label>
                                <div className="relative">
                                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.sla_threshold_seconds}
                                        onChange={(e) => setFormData({ ...formData, sla_threshold_seconds: Number(e.target.value) })}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Meta de tempo para responder ao cliente.</p>
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
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-violet-400" />
                            System Prompt (Instruções Principais)
                        </label>
                        <textarea
                            value={formData.system_prompt}
                            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                            placeholder="Você é um assistente útil e amigável..."
                            className="w-full h-64 px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono text-sm leading-relaxed resize-none custom-scrollbar"
                        />
                        <p className="text-xs text-slate-500">Defina a personalidade, regras e comportamento base do agente aqui.</p>
                    </div>

                    {/* Status Toggle */}
                    {isEditing && (
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div>
                                <p className="text-sm font-medium text-white">Status do Worker</p>
                                <p className="text-xs text-slate-500">
                                    {formData.is_active ? 'Worker está ativo e operando' : 'Worker está pausado'}
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
                    )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end p-6 border-t border-slate-700/50 bg-slate-900/50 gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold hover:from-violet-500 hover:to-fuchsia-500 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Salvando...' : isEditing ? 'Salvar Configuração' : 'Criar Worker'}
                    </button>
                </div>
            </div>
        </div>
    );
};
