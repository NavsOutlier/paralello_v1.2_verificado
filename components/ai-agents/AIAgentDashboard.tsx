import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Bot, BarChart3, FileText, Settings, Search,
    Zap, Plus, ChevronRight
} from 'lucide-react';
import { AIAgent } from '../../types/ai-agents';
import { AgentMetricsCards } from './AgentMetricsCards';
import { AgentPromptEditor } from './AgentPromptEditor';
import { AgentConfig } from './AgentConfig';

type DashboardTab = 'metrics' | 'prompts' | 'config';

interface Client {
    id: string;
    name: string;
    company?: string;
}

export const AIAgentDashboard: React.FC = () => {
    const { organizationId } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [agent, setAgent] = useState<AIAgent | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingClients, setLoadingClients] = useState(true);
    const [loadingAgent, setLoadingAgent] = useState(false);
    const [activeTab, setActiveTab] = useState<DashboardTab>('metrics');
    const [showConfigModal, setShowConfigModal] = useState(false);

    // Fetch all clients
    useEffect(() => {
        const fetchClients = async () => {
            if (!organizationId) return;
            setLoadingClients(true);

            const { data, error } = await supabase
                .from('clients')
                .select('id, name')
                .eq('organization_id', organizationId)
                .order('name');

            if (error) {
                console.error('Error fetching clients:', error);
            } else {
                setClients(data || []);
                if (data && data.length > 0 && !selectedClient) {
                    setSelectedClient(data[0]);
                }
            }
            setLoadingClients(false);
        };

        fetchClients();
    }, [organizationId]);

    // Fetch agent for selected client
    useEffect(() => {
        const fetchAgent = async () => {
            if (!selectedClient) {
                setAgent(null);
                return;
            }
            setLoadingAgent(true);

            const { data, error } = await supabase
                .from('ai_agents')
                .select('*')
                .eq('client_id', selectedClient.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching agent:', error);
            }
            setAgent(data || null);
            setLoadingAgent(false);
        };

        fetchAgent();
    }, [selectedClient]);

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tabs = [
        { id: 'metrics' as const, label: 'Métricas', icon: BarChart3 },
        { id: 'prompts' as const, label: 'Prompts', icon: FileText },
        { id: 'config' as const, label: 'Configuração', icon: Settings },
    ];

    const handleAgentSaved = (savedAgent: AIAgent) => {
        setAgent(savedAgent);
        setShowConfigModal(false);
    };

    return (
        <div className="h-full w-full flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Client Sidebar */}
            <div className="w-80 bg-slate-900/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
                {/* Sidebar Header */}
                <div className="p-5 border-b border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/20">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">AI Agents</h3>
                            <span className="text-xs text-slate-400">{clients.length} clientes</span>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Client List */}
                <div className="flex-1 overflow-y-auto p-3">
                    {loadingClients ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                            {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente disponível'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => setSelectedClient(client)}
                                    className={`w-full text-left p-3 rounded-xl transition-all group ${selectedClient?.id === client.id
                                            ? 'bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/50'
                                            : 'hover:bg-slate-800/50 border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${selectedClient?.id === client.id
                                                    ? 'bg-violet-500 text-white'
                                                    : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'
                                                }`}>
                                                {client.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={`font-medium text-sm ${selectedClient?.id === client.id ? 'text-white' : 'text-slate-300'
                                                }`}>
                                                {client.name}
                                            </span>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedClient?.id === client.id
                                                ? 'text-violet-400 translate-x-0'
                                                : 'text-slate-600 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                                            }`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900/30 backdrop-blur-sm border-b border-slate-700/50 px-8 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/20">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {selectedClient ? selectedClient.name : 'Selecione um Cliente'}
                                </h2>
                                <p className="text-sm text-slate-400">
                                    {agent ? `Agente: ${agent.name}` : 'Nenhum agente integrado'}
                                </p>
                            </div>
                        </div>
                        {selectedClient && !agent && (
                            <button
                                onClick={() => setShowConfigModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25"
                            >
                                <Plus className="w-4 h-4" />
                                Integrar Agente
                            </button>
                        )}
                    </div>
                </div>

                {selectedClient ? (
                    loadingAgent ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-10 h-10 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                        </div>
                    ) : agent ? (
                        <>
                            {/* Tabs */}
                            <div className="bg-slate-900/20 backdrop-blur-sm border-b border-slate-700/50 px-8 py-4">
                                <div className="flex gap-2">
                                    {tabs.map(tab => {
                                        const isActive = activeTab === tab.id;
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${isActive
                                                        ? 'bg-gradient-to-r from-violet-600/20 to-purple-600/20 text-violet-400 border border-violet-500/50'
                                                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span className="text-sm font-bold">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-8">
                                {activeTab === 'metrics' && (
                                    <AgentMetricsCards agentId={agent.id} />
                                )}
                                {activeTab === 'prompts' && (
                                    <AgentPromptEditor agentId={agent.id} />
                                )}
                                {activeTab === 'config' && (
                                    <AgentConfig
                                        agent={agent}
                                        clientId={selectedClient.id}
                                        onSave={handleAgentSaved}
                                        onClose={() => setActiveTab('metrics')}
                                    />
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center max-w-md">
                                <div className="w-24 h-24 bg-gradient-to-br from-violet-600/20 to-purple-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-violet-500/30">
                                    <Bot className="w-12 h-12 text-violet-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Nenhum Agente Integrado</h3>
                                <p className="text-slate-400 text-sm mb-8">
                                    Este cliente ainda não possui um agente de IA integrado.
                                    Integre um agente para começar a monitorar métricas.
                                </p>
                                <button
                                    onClick={() => setShowConfigModal(true)}
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/25"
                                >
                                    <Zap className="w-5 h-5" />
                                    Integrar Agente
                                </button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                <Search className="w-10 h-10 text-slate-600" />
                            </div>
                            <p className="text-slate-400 font-medium">Selecione um cliente</p>
                            <p className="text-slate-600 text-sm mt-1">
                                Escolha um cliente na lista à esquerda
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Config Modal */}
            {showConfigModal && selectedClient && (
                <AgentConfig
                    agent={agent || undefined}
                    clientId={selectedClient.id}
                    onSave={handleAgentSaved}
                    onClose={() => setShowConfigModal(false)}
                />
            )}
        </div>
    );
};

export default AIAgentDashboard;
