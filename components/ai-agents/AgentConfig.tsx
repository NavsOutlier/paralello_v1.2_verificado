import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Settings, Save, X, Globe, Key, Webhook, Zap, CheckCircle,
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
        api_endpoint: agent?.api_endpoint || '',
        webhook_metrics_url: agent?.webhook_metrics_url || '',
        webhook_prompt_url: agent?.webhook_prompt_url || '',
        is_active: agent?.is_active ?? true
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
            if (isEditing) {
                const { data, error } = await supabase
                    .from('ai_agents')
                    .update({
                        name: formData.name,
                        provider: formData.provider,
                        api_endpoint: formData.api_endpoint || null,
                        webhook_metrics_url: formData.webhook_metrics_url || null,
                        webhook_prompt_url: formData.webhook_prompt_url || null,
                        is_active: formData.is_active
                    })
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
                        name: formData.name,
                        provider: formData.provider,
                        api_endpoint: formData.api_endpoint || null,
                        webhook_metrics_url: formData.webhook_metrics_url || null,
                        webhook_prompt_url: formData.webhook_prompt_url || null
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
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
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
                                    Provider
                                </label>
                                <select
                                    value={formData.provider}
                                    onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                >
                                    <option value="custom">Custom</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                API Endpoint (opcional)
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="url"
                                    value={formData.api_endpoint}
                                    onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                                    placeholder="https://api.seu-agente.com"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Webhooks */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Webhook className="w-4 h-4 text-violet-400" />
                            Webhooks
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Webhook para Receber Métricas (Simplificado - Recomendado)
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                                Envie resumos diários para este endpoint. O Paralello calculará as taxas de resolução e custos.
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

                                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <p className="text-[11px] text-slate-400 font-bold mb-2 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            EXEMPLO DE PAYLOAD (n8n / HTTP Request)
                                        </p>
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                            <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto">
                                                {`{
  "date": "2026-01-20",
  "conversations": 45,
  "messages_sent": 320,
  "escalated": 3,
  "tokens_in": 45000,
  "tokens_out": 28000
}`}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Webhook para Enviar Prompts
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                                URL onde o Paralello enviará atualizações de prompt para seu agente
                            </p>
                            <input
                                type="url"
                                value={formData.webhook_prompt_url}
                                onChange={(e) => setFormData({ ...formData, webhook_prompt_url: e.target.value })}
                                placeholder="https://api.seu-agente.com/update-prompt"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* API Key */}
                    {isEditing && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Key className="w-4 h-4 text-violet-400" />
                                API Key
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
                                                <strong>Importante:</strong> Copie esta chave agora. Ela não será exibida novamente.
                                                Use esta chave no header <code className="bg-amber-500/20 px-1.5 py-0.5 rounded">X-API-Key</code> ao enviar métricas.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                {agent?.api_key_hash ? 'API Key configurada' : 'Nenhuma API Key configurada'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                A API Key é usada para autenticar requisições de métricas
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleGenerateApiKey}
                                            disabled={generatingKey}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${generatingKey ? 'animate-spin' : ''}`} />
                                            {agent?.api_key_hash ? 'Regenerar' : 'Gerar'} API Key
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status */}
                    {isEditing && (
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div>
                                <p className="text-sm font-medium text-white">Status do Agente</p>
                                <p className="text-xs text-slate-500">
                                    {formData.is_active ? 'Agente está ativo e coletando métricas' : 'Agente pausado'}
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
