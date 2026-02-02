import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Zap, Send, BarChart3, Sparkles, ListChecks, Users, Search, Building2, Loader2
} from 'lucide-react';

// Import automation components
import { ScheduledDispatchList } from './ScheduledDispatchList';
import { ReportList } from './ReportList';
import { ActiveSuggestionQueue } from './ActiveSuggestionQueue';
import { ActiveAutomationConfig } from './ActiveAutomationConfig';
import { ActiveAutomationsList } from './ActiveAutomationsList';
import { ActiveAutomation } from '../../types/automation';

type AutomationSection = 'dispatches' | 'reports' | 'active' | 'task-reports';

interface Client {
    id: string;
    name: string;
}

export const AutomationTab: React.FC = () => {
    const { organizationId } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingClients, setLoadingClients] = useState(true);
    const [activeSection, setActiveSection] = useState<AutomationSection>('dispatches');
    const [counts, setCounts] = useState({
        dispatches: 0,
        reports: 0,
        active: 0,
        taskReports: 0
    });
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [editingAutomation, setEditingAutomation] = useState<ActiveAutomation | undefined>(undefined);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch clients
    useEffect(() => {
        const fetchClients = async () => {
            console.log('Fetching clients for org:', organizationId);
            if (!organizationId) {
                console.log('No organizationId, skipping fetch');
                return;
            }
            setLoadingClients(true);

            const { data, error } = await supabase
                .from('clients')
                .select('id, name')
                .eq('organization_id', organizationId)
                .order('name');

            console.log('Clients fetch result:', { data, error });

            if (error) {
                console.error('Error fetching clients:', error);
            }

            if (data) {
                setClients(data);
                // Auto-select first client
                if (data.length > 0 && !selectedClient) {
                    setSelectedClient(data[0]);
                }
            }
            setLoadingClients(false);
        };

        fetchClients();
    }, [organizationId]);

    // Fetch counts for badges when client changes
    useEffect(() => {
        const fetchCounts = async () => {
            if (!organizationId || !selectedClient) {
                setCounts({ dispatches: 0, reports: 0, active: 0, taskReports: 0 });
                return;
            }

            const [dispatchRes, reportRes, activeRes] = await Promise.all([
                supabase
                    .from('scheduled_messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', selectedClient.id)
                    .eq('status', 'pending'),
                supabase
                    .from('scheduled_reports')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', selectedClient.id)
                    .eq('is_active', true),
                supabase
                    .from('active_suggestions')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', selectedClient.id)
                    .eq('status', 'pending')
            ]);

            setCounts({
                dispatches: dispatchRes.count || 0,
                reports: reportRes.count || 0,
                active: activeRes.count || 0,
                taskReports: 0
            });
        };

        fetchCounts();
    }, [organizationId, selectedClient]);

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sections = [
        { id: 'dispatches' as const, label: 'Disparos', icon: Send, count: counts.dispatches },
        { id: 'reports' as const, label: 'Relatórios', icon: BarChart3, count: counts.reports },
        { id: 'active' as const, label: 'Active', icon: Sparkles, count: counts.active, badge: counts.active > 0 ? 'Pendente' : undefined },
        { id: 'task-reports' as const, label: 'Task Report', icon: ListChecks, count: counts.taskReports }
    ];

    return (
        <div className="h-full flex bg-transparent relative z-10">
            {/* Client Sidebar - Premium Dark */}
            <div className="w-72 bg-slate-900/40 backdrop-blur-2xl border-r border-white/5 flex flex-col">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                            <Users className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h3 className="font-black text-white text-sm uppercase tracking-widest">Clientes</h3>
                        <span className="text-[10px] text-slate-500 font-bold">({clients.length})</span>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-950/50 border border-white/5 rounded-xl text-xs font-medium text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none placeholder:text-slate-600 transition-all"
                        />
                    </div>
                </div>

                {/* Client List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loadingClients ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-bold uppercase tracking-widest">
                            {searchTerm ? 'Nenhum encontrado' : 'Sem clientes'}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => setSelectedClient(client)}
                                    className={`w-full text-left p-3 rounded-xl transition-all ${selectedClient?.id === client.id
                                        ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                        : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <p className={`font-black text-xs uppercase tracking-widest ${selectedClient?.id === client.id ? 'text-indigo-300' : 'text-slate-300'
                                        }`}>
                                        {client.name}
                                    </p>
                                    {client.company && (
                                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                                            <Building2 className="w-3 h-3" />
                                            {client.company}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header - Premium Dark */}
                <div className="bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-black text-white tracking-tight">Automações</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                {selectedClient ? selectedClient.name : 'Selecione um cliente'}
                            </p>
                        </div>
                    </div>
                </div>

                {selectedClient ? (
                    <>
                        {/* Section Tabs - Premium Dark */}
                        <div className="bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 px-4 py-3">
                            <div className="flex gap-2 overflow-x-auto bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner w-fit">
                                {sections.map(section => {
                                    const isActive = activeSection === section.id;
                                    const Icon = section.icon;

                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${isActive
                                                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg font-black'
                                                : 'text-slate-400 hover:text-slate-200 font-bold'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-xs uppercase tracking-widest">{section.label}</span>
                                            {section.badge && (
                                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[9px] font-black tracking-widest">
                                                    {section.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content - Premium Dark */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {activeSection === 'dispatches' && (
                                <ScheduledDispatchList clientId={selectedClient.id} clientName={selectedClient.name} />
                            )}
                            {activeSection === 'reports' && (
                                <ReportList clientId={selectedClient.id} clientName={selectedClient.name} />
                            )}
                            {activeSection === 'active' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-black text-white tracking-tight">Sugestões e Automações</h3>
                                        <button
                                            onClick={() => {
                                                setEditingAutomation(undefined);
                                                setShowConfigModal(true);
                                            }}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Nova Automação
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Left Column: Active Automations List */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-2 bg-slate-800 rounded-xl border border-white/5">
                                                    <Zap className="w-4 h-4 text-cyan-400" />
                                                </div>
                                                <h4 className="font-black text-slate-300 text-xs uppercase tracking-widest">Automações Ativas</h4>
                                            </div>
                                            <ActiveAutomationsList
                                                clientId={selectedClient.id}
                                                refreshTrigger={refreshKey}
                                                onEdit={(auto) => {
                                                    setEditingAutomation(auto);
                                                    setShowConfigModal(true);
                                                }}
                                            />
                                        </div>

                                        {/* Right Column: Suggestions Feed */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                                                    <Sparkles className="w-4 h-4 text-violet-400" />
                                                </div>
                                                <h4 className="font-black text-slate-300 text-xs uppercase tracking-widest">Fila de Sugestões</h4>
                                            </div>
                                            <ActiveSuggestionQueue clientId={selectedClient.id} key={`queue-${refreshKey}`} />
                                        </div>
                                    </div>

                                    {/* Config Modal */}
                                    {showConfigModal && (
                                        <ActiveAutomationConfig
                                            clientId={selectedClient.id}
                                            clientName={selectedClient.name}
                                            editingAutomation={editingAutomation}
                                            onClose={() => {
                                                setShowConfigModal(false);
                                                setEditingAutomation(undefined);
                                            }}
                                            onSuccess={() => {
                                                setShowConfigModal(false);
                                                setEditingAutomation(undefined);
                                                setRefreshKey(prev => prev + 1);
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                            {activeSection === 'task-reports' && (
                                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-10 text-center border border-white/5 shadow-2xl">
                                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                                        <ListChecks className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <p className="text-slate-400 text-sm font-bold">
                                        Relatórios de tarefas são gerados automaticamente ao mudar o status de uma task.
                                    </p>
                                    <p className="text-slate-600 text-xs mt-2 font-medium">
                                        Histórico de atualizações aparecerá aqui.
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
                                <Users className="w-10 h-10 text-slate-600" />
                            </div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Selecione um cliente</p>
                            <p className="text-slate-600 text-xs mt-2 font-medium">
                                Escolha um cliente na lista à esquerda para gerenciar suas automações
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutomationTab;
