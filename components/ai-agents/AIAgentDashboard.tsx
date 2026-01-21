import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Bot, BarChart3, FileText, Settings, Search,
    Zap, Plus, ChevronRight, Cpu, Activity, Sparkles, GripVertical
} from 'lucide-react';
import { AIAgent } from '../../types/ai-agents';
import { AgentMetricsCards } from './AgentMetricsCards';
import { AgentPromptEditor } from './AgentPromptEditor';
import { AgentConfig } from './AgentConfig';
import { AgentKanbanBoard } from './AgentKanbanBoard';
import { AgentDeepMetrics } from './AgentDeepMetrics';
import { AgentConversationAnalytic } from './AgentConversationAnalytic';
import { AgentConversationAudit } from './AgentConversationAudit';

type DashboardTab = 'metrics' | 'prompts' | 'config' | 'kanban' | 'metrics-deep' | 'audit';

interface Client {
    id: string;
    name: string;
    company?: string;
}

// Circuit pattern SVG background
const CircuitPattern = () => (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M10 10h80v80H10z" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="10" cy="10" r="3" fill="currentColor" />
                <circle cx="90" cy="10" r="3" fill="currentColor" />
                <circle cx="10" cy="90" r="3" fill="currentColor" />
                <circle cx="90" cy="90" r="3" fill="currentColor" />
                <circle cx="50" cy="50" r="4" fill="currentColor" />
                <path d="M10 50h30M60 50h30M50 10v30M50 60v30" stroke="currentColor" strokeWidth="0.5" />
                <path d="M25 25l25 25M75 25l-25 25M25 75l25-25M75 75l-25-25" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2,2" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" className="text-cyan-400" />
    </svg>
);

// Animated grid lines
const GridLines = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
            backgroundImage: `
        linear-gradient(to right, rgba(6, 182, 212, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
      `,
            backgroundSize: '40px 40px'
        }} />
        {/* Scanning line animation */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent animate-scan" />
    </div>
);

// Floating particles
const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
            <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-float"
                style={{
                    left: `${15 + i * 15}%`,
                    top: `${20 + (i % 3) * 25}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${3 + i * 0.5}s`
                }}
            />
        ))}
    </div>
);

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
        { id: 'metrics-deep' as const, label: 'Deep Dive', icon: Activity },
        { id: 'kanban' as const, label: 'Atendimentos', icon: GripVertical },
        { id: 'audit' as const, label: 'Auditoria', icon: Star },
        { id: 'prompts' as const, label: 'Prompts', icon: FileText },
        { id: 'config' as const, label: 'Configuração', icon: Settings },
    ];

    const handleAgentSaved = (savedAgent: AIAgent) => {
        setAgent(savedAgent);
        setShowConfigModal(false);
    };

    return (
        <div className="h-full w-full flex bg-[#0a0f1a] relative overflow-hidden">
            {/* Background Effects */}
            <CircuitPattern />
            <GridLines />
            <FloatingParticles />

            {/* Gradient overlays */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />

            {/* Client Sidebar */}
            <div className="w-80 bg-slate-900/80 backdrop-blur-xl border-r border-cyan-500/10 flex flex-col relative z-10">
                {/* Sidebar Header */}
                <div className="p-5 border-b border-cyan-500/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30">
                                <Cpu className="w-5 h-5 text-white" />
                            </div>
                            {/* Pulse animation */}
                            <div className="absolute inset-0 bg-cyan-400 rounded-xl animate-ping opacity-20" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white flex items-center gap-2">
                                AI Agents
                                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                            </h3>
                            <span className="text-xs text-cyan-400/60">{clients.length} clientes conectados</span>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-cyan-500/20 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Client List */}
                <div className="flex-1 overflow-y-auto p-3">
                    {loadingClients ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="relative">
                                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 w-8 h-8 border-2 border-transparent border-t-cyan-300/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                            </div>
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
                                    className={`w-full text-left p-3 rounded-xl transition-all group relative overflow-hidden ${selectedClient?.id === client.id
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                                        : 'hover:bg-slate-800/50 border border-transparent'
                                        }`}
                                >
                                    {/* Active indicator line */}
                                    {selectedClient?.id === client.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 to-blue-500" />
                                    )}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold relative ${selectedClient?.id === client.id
                                                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                                                : 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50'
                                                }`}>
                                                {client.name.charAt(0).toUpperCase()}
                                                {selectedClient?.id === client.id && (
                                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                )}
                                            </div>
                                            <span className={`font-medium text-sm ${selectedClient?.id === client.id ? 'text-white' : 'text-slate-300'
                                                }`}>
                                                {client.name}
                                            </span>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-all ${selectedClient?.id === client.id
                                            ? 'text-cyan-400 translate-x-0'
                                            : 'text-slate-600 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                                            }`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar Footer with neural network decoration */}
                <div className="p-4 border-t border-cyan-500/10">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Activity className="w-3 h-3 text-cyan-500 animate-pulse" />
                        <span>Sistema Neural Ativo</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Header */}
                <div className="bg-slate-900/50 backdrop-blur-xl border-b border-cyan-500/10 px-8 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/30">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                {agent?.is_active && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {selectedClient ? selectedClient.name : 'Selecione um Cliente'}
                                    {agent?.is_active && (
                                        <span className="text-xs font-normal text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                                            ONLINE
                                        </span>
                                    )}
                                </h2>
                                <p className="text-sm text-slate-400">
                                    {agent ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                            Agente: {agent.name}
                                        </span>
                                    ) : 'Nenhum agente integrado'}
                                </p>
                            </div>
                        </div>
                        {selectedClient && !agent && (
                            <button
                                onClick={() => setShowConfigModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-bold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/30 group"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                Integrar Agente
                                <Zap className="w-4 h-4 animate-pulse" />
                            </button>
                        )}
                    </div>
                </div>

                {selectedClient ? (
                    loadingAgent ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="relative inline-block">
                                    <div className="w-16 h-16 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                    <div className="absolute inset-2 w-12 h-12 border-2 border-transparent border-t-blue-500 rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
                                    <Bot className="absolute inset-0 m-auto w-6 h-6 text-cyan-400" />
                                </div>
                                <p className="text-slate-400 mt-4">Carregando dados do agente...</p>
                            </div>
                        </div>
                    ) : agent ? (
                        <>
                            {/* Tabs */}
                            <div className="bg-slate-900/30 backdrop-blur-sm border-b border-cyan-500/10 px-8 py-4">
                                <div className="flex gap-2">
                                    {tabs.map(tab => {
                                        const isActive = activeTab === tab.id;
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all relative ${isActive
                                                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30 border border-transparent'
                                                    }`}
                                            >
                                                <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                                                <span className="text-sm font-bold">{tab.label}</span>
                                                {isActive && (
                                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500" />
                                                )}
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
                                {activeTab === 'kanban' && (
                                    <AgentKanbanBoard agentId={agent.id} />
                                )}
                                {activeTab === 'metrics-deep' && (
                                    <div className="space-y-8">
                                        <AgentDeepMetrics agentId={agent.id} />
                                        <AgentConversationAnalytic agentId={agent.id} />
                                    </div>
                                )}
                                {activeTab === 'audit' && (
                                    <AgentConversationAudit agentId={agent.id} />
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
                                {/* Robot illustration */}
                                <div className="relative inline-block mb-6">
                                    <div className="w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-3xl flex items-center justify-center border border-cyan-500/20 relative">
                                        <Bot className="w-16 h-16 text-cyan-400" />
                                        {/* Decorative elements */}
                                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-500/30 rounded-full animate-ping" />
                                        <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-500/30 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                                        <div className="absolute top-1/2 -left-4 w-8 h-px bg-gradient-to-r from-transparent to-cyan-500/50" />
                                        <div className="absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-l from-transparent to-cyan-500/50" />
                                    </div>
                                    {/* Orbital ring */}
                                    <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-spin" style={{ animationDuration: '10s' }}>
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-400 rounded-full" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Nenhum Agente Integrado</h3>
                                <p className="text-slate-400 text-sm mb-8">
                                    Este cliente ainda não possui um agente de IA integrado.
                                    Integre um agente para começar a monitorar métricas em tempo real.
                                </p>
                                <button
                                    onClick={() => setShowConfigModal(true)}
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/30 group"
                                >
                                    <Zap className="w-5 h-5 group-hover:animate-bounce" />
                                    Integrar Agente
                                    <Sparkles className="w-4 h-4 animate-pulse" />
                                </button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/10">
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

            {/* Custom animations */}
            <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(calc(100vh + 100%)); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.3; }
          75% { transform: translateY(-30px) translateX(5px); opacity: 0.5; }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};

export default AIAgentDashboard;
