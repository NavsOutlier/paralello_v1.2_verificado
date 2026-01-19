import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Zap, Send, BarChart3, Sparkles, ListChecks, Users, Search, Building2
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
        { id: 'dispatches' as const, label: 'Disparos', icon: Send, color: 'indigo', count: counts.dispatches },
        { id: 'reports' as const, label: 'Relatórios', icon: BarChart3, color: 'emerald', count: counts.reports },
        { id: 'active' as const, label: 'Active', icon: Sparkles, color: 'purple', count: counts.active, badge: counts.active > 0 ? 'Pendente' : undefined },
        { id: 'task-reports' as const, label: 'Task Report', icon: ListChecks, color: 'blue', count: counts.taskReports }
    ];

    const getColorClasses = (color: string, isActive: boolean) => {
        const colors: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
            indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-500', activeBg: 'bg-indigo-100' },
            emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-500', activeBg: 'bg-emerald-100' },
            purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-500', activeBg: 'bg-purple-100' },
            blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500', activeBg: 'bg-blue-100' }
        };
        return colors[color] || colors.indigo;
    };

    return (
        <div className="h-full flex bg-slate-50">
            {/* Client Sidebar */}
            <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-800">Clientes</h3>
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
                            {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
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
                                    <p className={`font-bold text-sm ${selectedClient?.id === client.id ? 'text-indigo-700' : 'text-slate-800'
                                        }`}>
                                        {client.name}
                                    </p>
                                    {client.company && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
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
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Automações</h2>
                            <p className="text-xs text-slate-500">
                                {selectedClient ? selectedClient.name : 'Selecione um cliente'}
                            </p>
                        </div>
                    </div>
                </div>

                {selectedClient ? (
                    <>
                        {/* Section Tabs */}
                        <div className="bg-white border-b border-slate-200 px-4 py-3">
                            <div className="flex gap-2 overflow-x-auto">
                                {sections.map(section => {
                                    const isActive = activeSection === section.id;
                                    const colorClasses = getColorClasses(section.color, isActive);
                                    const Icon = section.icon;

                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${isActive
                                                ? `${colorClasses.activeBg} ${colorClasses.text} border-2 ${colorClasses.border}`
                                                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-sm font-bold">{section.label}</span>
                                            {section.badge && (
                                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[9px] font-bold">
                                                    {section.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content */}
                        <div className={`flex-1 p-6 ${activeSection === 'active' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
                            {activeSection === 'dispatches' && (
                                <ScheduledDispatchList clientId={selectedClient.id} clientName={selectedClient.name} />
                            )}
                            {activeSection === 'reports' && (
                                <ReportList clientId={selectedClient.id} clientName={selectedClient.name} />
                            )}
                            {activeSection === 'active' && (
                                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                                    <div className="flex justify-between items-center shrink-0">
                                        <h3 className="text-lg font-bold text-slate-800">Sugestões e Automações</h3>
                                        <button
                                            onClick={() => {
                                                setEditingAutomation(undefined);
                                                setShowConfigModal(true);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Nova Automação
                                        </button>
                                    </div>

                                    <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                                        {/* Left Column: Suggestions Feed */}
                                        <div className="flex flex-col h-full min-h-0 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                                            <div className="flex items-center gap-2 mb-3 shrink-0">
                                                <div className="p-1.5 bg-purple-100 rounded-lg">
                                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <h4 className="font-bold text-slate-700">Fila de Sugestões</h4>
                                                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-purple-100">
                                                    Arraste para ver mais
                                                </span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                                <ActiveSuggestionQueue clientId={selectedClient.id} key={`queue-${refreshKey}`} />
                                            </div>
                                        </div>

                                        {/* Right Column: Active Automations List */}
                                        <div className="flex flex-col h-full min-h-0 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                            <div className="flex items-center gap-2 mb-3 shrink-0">
                                                <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                                                    <Zap className="w-4 h-4 text-slate-600" />
                                                </div>
                                                <h4 className="font-bold text-slate-700">Automações Ativas</h4>
                                            </div>
                                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                                <ActiveAutomationsList
                                                    clientId={selectedClient.id}
                                                    refreshTrigger={refreshKey}
                                                    onEdit={(auto) => {
                                                        setEditingAutomation(auto);
                                                        setShowConfigModal(true);
                                                    }}
                                                />
                                            </div>
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
                                <div className="bg-slate-50 rounded-xl p-8 text-center">
                                    <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm">
                                        Relatórios de tarefas são gerados automaticamente ao mudar o status de uma task.
                                    </p>
                                    <p className="text-slate-400 text-xs mt-1">
                                        Histórico de atualizações aparecerá aqui.
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Selecione um cliente</p>
                            <p className="text-slate-400 text-sm mt-1">
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
