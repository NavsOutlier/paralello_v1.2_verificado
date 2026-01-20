import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Settings, Save, X, Globe, Key, Webhook, Zap, CheckCircle,
    AlertCircle, Copy, Eye, EyeOff, RefreshCw, Trash2
} from 'lucide-react';
import { AIAgent, CreateAgentPayload, UpdateAgentPayload } from '../../types/ai-agents';

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
                // Update existing agent
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
                // Create new agent
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
            // Generate a random API key
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const apiKey = 'pak_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('');

            // Hash the API key for storage
            const encoder = new TextEncoder();
            const data = encoder.encode(apiKey);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Store the hash
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Settings className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800">
                                {isEditing ? 'Configurar Agente' : 'Novo Agente de IA'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {isEditing ? 'Edite as configurações do agente' : 'Configure um novo agente de IA para este cliente'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Informações Básicas
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nome do Agente *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Assistente de Vendas"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Provider
                                </label>
                                <select
                                    value={formData.provider}
                                    onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="custom">Custom</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                API Endpoint (opcional)
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="url"
                                    value={formData.api_endpoint}
                                    onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                                    placeholder="https://api.seu-agente.com"
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Webhooks */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Webhook className="w-4 h-4" />
                            Webhooks
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Webhook para Receber Métricas
                            </label>
                            <p className="text-xs text-slate-500 mb-2">
                                URL onde seu agente deve enviar as métricas para o Paralello
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={formData.webhook_metrics_url}
                                    onChange={(e) => setFormData({ ...formData, webhook_metrics_url: e.target.value })}
                                    placeholder="https://..."
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                            {agent && (
                                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-600 font-medium mb-1">Endpoint Paralello:</p>
                                    <code className="text-xs text-indigo-600 break-all">
                                        {import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-metrics-webhook
                                    </code>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
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
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* API Key */}
                    {isEditing && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <Key className="w-4 h-4" />
                                API Key
                            </h3>

                            <div className="p-4 bg-slate-50 rounded-lg">
                                {generatedApiKey ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                            <span className="text-sm font-medium text-green-700">API Key gerada!</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type={showApiKey ? 'text' : 'password'}
                                                value={generatedApiKey}
                                                readOnly
                                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCopyApiKey}
                                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                            >
                                                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs">
                                                <strong>Importante:</strong> Copie esta chave agora. Ela não será exibida novamente.
                                                Use esta chave no header <code className="bg-amber-100 px-1 rounded">X-API-Key</code> ao enviar métricas.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
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
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-slate-700">Status do Agente</p>
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
                                <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
                    <div>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
