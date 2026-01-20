import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Bot, BarChart3, FileText, Settings, Users, Search, Building2,
    TrendingUp, MessageSquare, Clock, DollarSign, CheckCircle, XCircle,
    AlertTriangle, Zap, RefreshCw
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

    // Fetch all clients (we'll show if they have agents or not)
    useEffect(() => {
        const fetchClients = async () => {
            if (!organizationId) return;
            setLoadingClients(true);

            // Get all clients for this organization
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
        { id: 'metrics' as const, label: 'Métricas', icon: BarChart3, color: 'indigo' },
        { id: 'prompts' as const, label: 'Prompts', icon: FileText, color: 'purple' },
        { id: 'config' as const, label: 'Configuração', icon: Settings, color: 'slate' },
    ];

    const handleAgentSaved = (savedAgent: AIAgent) => {
        setAgent(savedAgent);
        setShowConfigModal(false);
    };

    return (
        <div className="h-full flex bg-slate-50">
            {/* Client Sidebar */}
            <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Bot className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-800">AI Agents</h3>
                        <span className="text-xs text-slate-400">({clients.length})</span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Client List */}
                <div className="flex-1 overflow-y-auto">
                    {loadingClients ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                            {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente com AI Agent'}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => setSelectedClient(client)}
                                    className={`w-full text-left p-3 rounded-xl transition-all ${selectedClient?.id === client.id
                                        ? 'bg-indigo-50 border-2 border-indigo-500'
                                        : 'hover:bg-slate-50 border-2 border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Bot className={`w-4 h-4 ${selectedClient?.id === client.id ? 'text-indigo-600' : 'text-slate-400'
                                            }`} />
                                        <p className={`font-bold text-sm ${selectedClient?.id === client.id ? 'text-indigo-700' : 'text-slate-800'
                                            }`}>
                                            {client.name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">AI Agent Metrics</h2>
                                <p className="text-xs text-slate-500">
                                    {selectedClient ? selectedClient.name : 'Selecione um cliente'}
                                </p>
                            </div>
                        </div>
                        {selectedClient && !agent && (
                            <button
                                onClick={() => setShowConfigModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                <Zap className="w-4 h-4" />
                                Integrar Agente
                            </button>
                        )}
                    </div>
                </div>

                {selectedClient ? (
                    loadingAgent ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                    ) : agent ? (
                        <>
                            {/* Tabs */}
                            <div className="bg-white border-b border-slate-200 px-4 py-3">
                                <div className="flex gap-2">
                                    {tabs.map(tab => {
                                        const isActive = activeTab === tab.id;
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${isActive
                                                    ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-500'
                                                    : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
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
                            <div className="flex-1 overflow-y-auto p-6">
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
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bot className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="font-bold text-slate-700 mb-2">Nenhum Agente Integrado</h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    Este cliente ainda não possui um agente de IA integrado.
                                    Integre um agente para começar a monitorar métricas.
                                </p>
                                <button
                                    onClick={() => setShowConfigModal(true)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
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
                            <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Selecione um cliente</p>
                            <p className="text-slate-400 text-sm mt-1">
                                Escolha um cliente na lista à esquerda para ver as métricas do agente
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
