import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Settings, Save, X, Key, Webhook, Zap, CheckCircle,
    AlertCircle, Copy, Eye, EyeOff, RefreshCw, Trash2, Bot, Code, Info
} from 'lucide-react';
import { AIAgent } from '../../types/ai-agents';

interface AgentConfigProps {
    agent?: AIAgent;
    clientId: string;
    onSave?: (agent: AIAgent) => void;
    onClose: () => void;
}

export const AgentConfig: React.FC<AgentConfigProps> = ({
    agent,
    clientId,
    onSave,
    onClose
}) => {
    const { organizationId } = useAuth();
    const [saving, setSaving] = useState(false);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState({
        name: agent?.name || '',
        provider: agent?.provider || 'custom',
        is_active: agent?.is_active ?? true,
        // Hosting Config
        model: agent?.model || 'gpt-4o',
        temperature: agent?.temperature || 0.7,
        max_tokens: agent?.max_tokens || 1000,
        api_key: agent?.api_key || '',
        agent_type: agent?.agent_type || 'sdr',
    });

    const isEditing = !!agent;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Nome é obrigatório');
            return;
        }

        setSaving(true);

        try {
            const payload: any = {
                name: formData.name,
                provider: formData.provider,
                is_active: formData.is_active,
                model: formData.model,
                temperature: Number(formData.temperature),
                max_tokens: Number(formData.max_tokens),
                agent_type: formData.agent_type,
            };

            // Only update API key if provided (security)
            if (formData.api_key && formData.api_key.trim() !== '') {
                payload.api_key = formData.api_key;
            }

            if (isEditing) {
                const { data, error } = await supabase
                    .from('ai_agents')
                    .update(payload)
                    .eq('id', agent.id)
                    .select()
                    .single();

                if (error) throw error;
                onSave?.(data);
            } else {
                const { data, error } = await supabase
                    .from('ai_agents')
                    .insert({
                        organization_id: organizationId,
                        client_id: clientId,
                        ...payload
                    })
                    .select()
                    .single();

                if (error) throw error;
                onSave?.(data);
            }
        } catch (error: any) {
            console.error('Error saving agent:', error);
            alert(`Erro ao salvar: ${error.message}`);
        }

        setSaving(false);
    };

    const handleGenerateApiKey = async () => {
        if (!agent) {
            alert('Salve o agente primeiro antes de gerar uma API key');
            return;
        }

        setGeneratingKey(true);

        try {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const apiKey = 'pak_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');

            const encoder = new TextEncoder();
            const data = encoder.encode(apiKey);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const { error } = await supabase
                .from('ai_agents')
                .update({ api_key_hash: hashHex })
                .eq('id', agent.id);

            if (error) throw error;

            setGeneratedApiKey(apiKey);
            setShowApiKey(true);
        } catch (error: any) {
            console.error('Error generating API key:', error);
            alert(`Erro ao gerar API key: ${error.message}`);
        }

        setGeneratingKey(false);
    };

    const handleCopyApiKey = () => {
        if (generatedApiKey) {
            navigator.clipboard.writeText(generatedApiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDelete = async () => {
        if (!agent) return;

        if (!confirm('Tem certeza que deseja excluir este agente? Todas as métricas e prompts serão perdidos.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('ai_agents')
                .delete()
                .eq('id', agent.id);

            if (error) throw error;
            onClose();
        } catch (error: any) {
            console.error('Error deleting agent:', error);
            alert(`Erro ao excluir: ${error.message}`);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/20">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-white">
                                {isEditing ? 'Configurar Agente' : 'Novo Agente de IA'}
                            </h2>
                            <p className="text-sm text-slate-400">
                                {isEditing ? 'Edite as configurações do agente' : 'Configure um novo agente de IA'}
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
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] custom-scrollbar">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-violet-400" />
                            Informações Básicas
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Nome do Agente *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Assistente de Vendas"
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Provider (Hospedagem)
                                </label>
                                <select
                                    value={formData.provider}
                                    onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                >
                                    <option value="custom">Externo (Apenas Métricas)</option>
                                    <option value="custom">Externo (Apenas Métricas)</option>
                                    <option value="openai">OpenAI (GPT-4o)</option>
                                    <option value="anthropic">Anthropic (Claude 3.5)</option>
                                    <option value="google">Google (Gemini 2.0)</option>
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Tipo de Agente (Persona)
                                </label>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { id: 'sdr', label: 'SDR / Vendas', icon: '💰' },
                                        { id: 'scheduler', label: 'Agendamento', icon: '📅' },
                                        { id: 'support', label: 'Suporte', icon: '🎧' },
                                        { id: 'custom', label: 'Outro', icon: '🤖' }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, agent_type: type.id as any })}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${formData.agent_type === type.id
                                                ? 'bg-violet-600/20 border-violet-500 text-white'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                                }`}
                                        >
                                            <span className="text-xl mb-1">{type.icon}</span>
                                            <span className="text-xs font-medium">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">
                                    Isso adapta o dashboard para mostrar as métricas mais relevantes para este papel.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* HOSTING CONFIGURATION (Only if NOT custom) */}
                    {formData.provider !== 'custom' && (
                        <div className="space-y-4 bg-violet-500/5 p-4 rounded-2xl border border-violet-500/20">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Bot className="w-4 h-4 text-violet-400" />
                                Hospedagem & Execução
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Modelo de IA
                                    </label>
                                    <select
                                        value={formData.model}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                    >
                                        {formData.provider === 'openai' && (
                                            <>
                                                <option value="gpt-4o">GPT-4o</option>
                                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                            </>
                                        )}
                                        {formData.provider === 'anthropic' && (
                                            <>
                                                <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                                                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                                            </>
                                        )}
                                        {formData.provider === 'google' && (
                                            <>
                                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Temperatura ({formData.temperature})
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
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                        <span>Preciso</span>
                                        <span>Criativo</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Chave de API do Cliente ({formData.provider.toUpperCase()})
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="password"
                                        value={formData.api_key}
                                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                        placeholder={`sk-... (Sua chave da ${formData.provider})`}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    A chave será armazenada de forma segura e usada apenas para execuções deste agente.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Webhooks (Legacy/Combined) */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Webhook className="w-4 h-4 text-violet-400" />
                            Integração / Webhooks
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Webhook para Receber Métricas
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                                {formData.provider === 'custom'
                                    ? 'Envie resumos diários para este endpoint.'
                                    : 'Como o agente é hospedado, as métricas serão coletadas automaticamente! Use este endpoint apenas se quiser enviar dados externos.'}
                            </p>

                            {agent && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-slate-800/50 rounded-xl border border-cyan-500/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs text-cyan-400 font-bold flex items-center gap-1">
                                                <Code className="w-3 h-3" />
                                                ENDPOINT POST
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-daily-metrics`;
                                                    navigator.clipboard.writeText(url);
                                                    alert('URL copiada!');
                                                }}
                                                className="text-[10px] text-slate-500 hover:text-white transition-colors flex items-center gap-1"
                                            >
                                                <Copy className="w-3 h-3" />
                                                Copiar URL
                                            </button>
                                        </div>
                                        <code className="text-[11px] text-cyan-300/80 break-all bg-slate-900/50 p-2 rounded block border border-slate-700/50">
                                            {import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-daily-metrics
                                        </code>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Paralello API Key (For external calls) */}
                    {isEditing && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Key className="w-4 h-4 text-violet-400" />
                                Chave de Acesso (Paralello)
                            </h3>

                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                {generatedApiKey ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                                            <span className="text-sm font-medium text-emerald-400">API Key gerada!</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type={showApiKey ? 'text' : 'password'}
                                                value={generatedApiKey}
                                                readOnly
                                                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl font-mono text-sm text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="p-3 hover:bg-slate-700 rounded-xl transition-colors"
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCopyApiKey}
                                                className="p-3 hover:bg-slate-700 rounded-xl transition-colors"
                                            >
                                                {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                            </button>
                                        </div>
                                        <div className="flex items-start gap-2 text-amber-400 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs">
                                                <strong>Importante:</strong> Esta chave autentica requisições externas para a API do Paralello.
                                                Não confunda com a chave da OpenAI/Anthropic acima.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                {agent?.api_key_hash ? 'Chave de Acesso configurada' : 'Nenhuma Chave de Acesso configurada'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Gere esta chave se precisar enviar métricas de fontes externas.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleGenerateApiKey}
                                            disabled={generatingKey}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${generatingKey ? 'animate-spin' : ''}`} />
                                            {agent?.api_key_hash ? 'Regenerar' : 'Gerar'} Chave
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* n8n / HTTP Request Snippet */}
                    {isEditing && generatedApiKey && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Zap className="w-4 h-4 text-violet-400" />
                                Snippet para n8n (HTTP Request)
                            </h3>
                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <p className="text-xs text-slate-400 mb-2">
                                    Copie este JSON e cole dentro de um node <strong>HTTP Request</strong> no n8n.
                                </p>
                                <div className="relative">
                                    <pre className="text-[10px] text-cyan-300 font-mono bg-slate-900 p-3 rounded-xl overflow-x-auto border border-slate-700/50">
                                        {`{
  "method": "POST",
  "url": "${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent-executor",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${generatedApiKey}"
  },
  "body": {
    "agent_id": "${agent.id}",
    "message": "{{$json.message}}",
    "session_id": "{{$json.sessionId}}"
  }
}`}
                                    </pre>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const snippet = JSON.stringify({
                                                method: "POST",
                                                url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent-executor`,
                                                headers: {
                                                    "Content-Type": "application/json",
                                                    "Authorization": `Bearer ${generatedApiKey}`
                                                },
                                                body: {
                                                    agent_id: agent.id,
                                                    message: "{{$json.message}}",
                                                    session_id: "{{$json.sessionId}}"
                                                }
                                            }, null, 2);
                                            navigator.clipboard.writeText(snippet);
                                            alert('Snippet copiado!');
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-600"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status */}
                    {isEditing && (
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div>
                                <p className="text-sm font-medium text-white">Status do Agente</p>
                                <p className="text-xs text-slate-500">
                                    {formData.is_active ? 'Agente está ativo' : 'Agente pausado'}
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
                <div className="flex items-center justify-between p-6 border-t border-slate-700/50 bg-slate-900/50">
                    <div>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-4 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Excluir Agente
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
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
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Agente'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentConfig;
