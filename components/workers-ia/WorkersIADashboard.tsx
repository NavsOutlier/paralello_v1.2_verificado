import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Bot, BarChart3, Settings, Search,
    Zap, Plus, ChevronRight, Activity, Sparkles, GripVertical, Briefcase, List
} from 'lucide-react';
import { WorkerConfig } from './WorkerConfig';
import { WorkerKanbanBoard } from './WorkerKanbanBoard';
import { WorkerAnalytics } from './WorkerAnalytics';
import { WorkerMessageAudit } from './WorkerMessageAudit';

type DashboardTab = 'analytics' | 'kanban' | 'audit' | 'config';

interface Client {
    id: string;
    name: string;
    company?: string;
}

// Circuit pattern SVG background (Same as AI Agents)
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
                <path d="M25 25l25 25M75 25l-25 25M25 75l-25-25M75 75l-25-25" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2,2" />
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

export const WorkersIADashboard: React.FC = () => {
    const { organizationId } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingClients, setLoadingClients] = useState(true);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [activeTab, setActiveTab] = useState<DashboardTab>('analytics');
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState<any | null>(null);
    const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);

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
        const fetchAgents = async () => {
            if (!selectedClient) {
                setAgents([]);
                setSelectedAgent(null);
                return;
            }
            setLoadingAgents(true);

            const { data, error } = await supabase
                .from('workers_ia_agents')
                .select('*')
                .eq('client_id', selectedClient.id)
                .order('created_at', { ascending: false });

            if (error) {
                // If error is code PGRST116 (0 rows) it's expected for empty, 
                // but .select('*') usually returns arrays, so shouldn't error on empty.
                console.error('Error fetching workers agents:', error);
            }

            const agentList = data || [];
            setAgents(agentList);

            // Auto-select first agent if none selected, or maintain current selection if valid
            if (agentList.length > 0) {
                // Check if we already have a selected agent that still exists in the fetched list
                const currentStillExists = selectedAgent && agentList.find(a => a.id === selectedAgent.id);
                if (!currentStillExists) {
                    setSelectedAgent(agentList[0]);
                } else {
                    // Update the selected agent object with fresh data
                    setSelectedAgent(currentStillExists);
                }
            } else {
                setSelectedAgent(null);
            }

            setLoadingAgents(false);
        };

        fetchAgents();
    }, [selectedClient]);

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tabs = [
        { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
        { id: 'kanban' as const, label: 'Funil de Leads', icon: GripVertical },
        { id: 'audit' as const, label: 'Auditoria', icon: Search },
        { id: 'config' as const, label: 'Configuração', icon: Settings },
    ];

    const handleAgentSaved = (savedAgent: any) => {
        // Update local state to reflect changes/creation
        setAgents(prev => {
            const exists = prev.find(a => a.id === savedAgent.id);
            if (exists) {
                return prev.map(a => a.id === savedAgent.id ? savedAgent : a);
            }
            return [savedAgent, ...prev];
        });
        setSelectedAgent(savedAgent);
        setShowConfigModal(false);
        setEditingAgent(null);
    };

    const handleCreateNew = () => {
        setEditingAgent(null); // Clear editing state for new creation
        setShowConfigModal(true);
    };

    const handleEditAgent = () => {
        if (selectedAgent) {
            setEditingAgent(selectedAgent);
            setShowConfigModal(true);
        }
    };

    // If active tab is config, we show the config for the selected agent.
    // If user wants to create NEW agent, they click the button in header.

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
                            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl shadow-lg shadow-violet-500/30">
                                <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            {/* Pulse animation */}
                            <div className="absolute inset-0 bg-violet-400 rounded-xl animate-ping opacity-20" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white flex items-center gap-2">
                                Workers IA
                                <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                            </h3>
                            <span className="text-xs text-violet-400/60">{clients.length} clientes conectados</span>
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
                                        ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30'
                                        : 'hover:bg-slate-800/50 border border-transparent'
                                        }`}
                                >
                                    {/* Active indicator line */}
                                    {selectedClient?.id === client.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-400 to-fuchsia-500" />
                                    )}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold relative ${selectedClient?.id === client.id
                                                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30'
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
                                            ? 'text-violet-400 translate-x-0'
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
                        <Activity className="w-3 h-3 text-violet-500 animate-pulse" />
                        <span>Worker Node Ativo</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Header */}
                <div className="bg-slate-900/50 backdrop-blur-xl border-b border-cyan-500/10 px-8 py-5 relative z-20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="p-3 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl shadow-lg shadow-violet-500/30">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                {selectedAgent?.is_active && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {selectedClient ? selectedClient.name : 'Selecione um Cliente'}
                                    {selectedAgent?.is_active && (
                                        <span className="text-xs font-normal text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                                            WORKER ONLINE
                                        </span>
                                    )}
                                </h2>

                                {selectedClient && agents.length > 0 ? (
                                    <div className="flex items-center gap-2 mt-1 relative z-50">
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                                                className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50 hover:border-violet-500/30"
                                            >
                                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                                <span className="font-medium text-violet-300">Agent:</span>
                                                {selectedAgent ? selectedAgent.name : 'Selecione um Agente'}
                                                <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${isAgentDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                                            </button>

                                            {/* Agent Selector Dropdown */}
                                            {isAgentDropdownOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-[100] backdrop-blur-xl">
                                                    <div className="p-2 border-b border-slate-800/50 bg-slate-900/50">
                                                        <span className="text-[10px] uppercase font-bold text-slate-500 px-2">Meus Agentes</span>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                                        {agents.map(a => (
                                                            <button
                                                                key={a.id}
                                                                onClick={() => {
                                                                    setSelectedAgent(a);
                                                                    setIsAgentDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-3 transition-all ${selectedAgent?.id === a.id
                                                                    ? 'bg-violet-500/10 text-white border border-violet-500/20'
                                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                                                                    }`}
                                                            >
                                                                <div className={`p-1.5 rounded-md ${selectedAgent?.id === a.id ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-800 text-slate-500'
                                                                    }`}>
                                                                    <Bot className="w-3.5 h-3.5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium truncate">{a.name}</div>
                                                                    {a.role && <div className="text-[10px] text-slate-500 truncate">{a.role}</div>}
                                                                </div>
                                                                {selectedAgent?.id === a.id && (
                                                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="p-2 border-t border-slate-800/50 bg-slate-900/50">
                                                        {agents.length === 0 && (
                                                            <button
                                                                onClick={() => {
                                                                    setIsAgentDropdownOpen(false);
                                                                    handleCreateNew();
                                                                }}
                                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-violet-400 hover:text-white hover:bg-violet-500/10 rounded-lg transition-colors border border-dashed border-violet-500/20 hover:border-violet-500/40"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                Novo Agente
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isAgentDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsAgentDropdownOpen(false)} />}

                                        <span className="text-xs text-slate-500 max-w-[200px] max-md:hidden truncate">
                                            Role: {selectedAgent?.role || 'Não definido'}
                                        </span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">Nenhum worker configurado</p>
                                )}
                            </div>
                        </div>

                        {selectedClient && (
                            <button
                                onClick={handleCreateNew}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl text-sm font-bold hover:from-violet-400 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-500/30 group"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                {agents.length > 0 ? 'Novo Worker' : 'Criar Worker'}
                                <Zap className="w-4 h-4 animate-pulse" />
                            </button>
                        )}
                    </div>
                </div>

                {selectedClient ? (
                    loadingAgents ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="relative inline-block">
                                    <div className="w-16 h-16 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                                    <div className="absolute inset-2 w-12 h-12 border-2 border-transparent border-t-fuchsia-500 rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
                                    <Bot className="absolute inset-0 m-auto w-6 h-6 text-violet-400" />
                                </div>
                                <p className="text-slate-400 mt-4">Carregando dados dos workers...</p>
                            </div>
                        </div>
                    ) : selectedAgent ? (
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
                                                    ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-400 border border-violet-500/30'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30 border border-transparent'
                                                    }`}
                                            >
                                                <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                                                <span className="text-sm font-bold">{tab.label}</span>
                                                {isActive && (
                                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-violet-400 to-fuchsia-500" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {activeTab === 'analytics' && (
                                    <div className="space-y-8">
                                        <WorkerAnalytics agentId={selectedAgent.id} />
                                    </div>
                                )}
                                {activeTab === 'kanban' && (
                                    <WorkerKanbanBoard agentId={selectedAgent.id} />
                                )}
                                {activeTab === 'audit' && (
                                    <WorkerMessageAudit agentId={selectedAgent.id} />
                                )}
                                {activeTab === 'config' && (
                                    <WorkerConfig
                                        agent={selectedAgent}
                                        clientId={selectedClient.id}
                                        onSave={handleAgentSaved}
                                        onClose={() => setActiveTab('analytics')}
                                    />
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center max-w-md">
                                {/* Robot illustration */}
                                <div className="relative inline-block mb-6">
                                    <div className="w-32 h-32 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-3xl flex items-center justify-center border border-violet-500/20 relative">
                                        <Bot className="w-16 h-16 text-violet-400" />
                                        {/* Decorative elements */}
                                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-violet-500/30 rounded-full animate-ping" />
                                        <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-fuchsia-500/30 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                                    </div>
                                    {/* Orbital ring */}
                                    <div className="absolute inset-0 border border-violet-500/10 rounded-full animate-spin" style={{ animationDuration: '10s' }}>
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-violet-400 rounded-full" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Configure seu primeiro Worker</h3>
                                <p className="text-slate-400 text-sm mb-8">
                                    Este cliente ainda não possui workers ativos.
                                    Crie um agente para começar.
                                </p>
                                <button
                                    onClick={handleCreateNew}
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-bold hover:from-violet-400 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-500/30 group"
                                >
                                    <Zap className="w-5 h-5 group-hover:animate-bounce" />
                                    Criar Worker Inicial
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
                                Escolha um cliente para gerenciar seus Workers
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Config Modal */}
            {showConfigModal && selectedClient && (
                <WorkerConfig
                    agent={editingAgent}
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
