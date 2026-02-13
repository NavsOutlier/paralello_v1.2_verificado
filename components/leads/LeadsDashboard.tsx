import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Search, Loader2, Send, Settings, LayoutGrid } from 'lucide-react';
import { ColdDispatchTool } from './ColdDispatchTool';
import { LeadsConfig } from './LeadsConfig';

interface Client {
    id: string;
    name: string;
}

type TabType = 'dispatch' | 'config';

export const LeadsDashboard: React.FC = () => {
    const { organizationId } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingClients, setLoadingClients] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('dispatch');

    // Fetch clients
    useEffect(() => {
        const fetchClients = async () => {
            if (!organizationId) {
                setLoadingClients(false);
                return;
            }
            setLoadingClients(true);

            const { data, error } = await supabase
                .from('clients')
                .select('id, name')
                .eq('organization_id', organizationId)
                .is('deleted_at', null)
                .order('name');

            if (data) {
                setClients(data);
                if (data.length > 0 && !selectedClient) {
                    setSelectedClient(data[0]);
                }
            }
            setLoadingClients(false);
        };

        fetchClients();
    }, [organizationId]);

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex bg-transparent relative z-10 w-full">
            {/* Client Sidebar */}
            <div className="w-72 bg-slate-900/40 backdrop-blur-2xl border-r border-white/5 flex flex-col shrink-0">
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
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-950/50 border border-white/5 rounded-xl text-xs font-medium text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none placeholder:text-slate-600 transition-all font-bold"
                        />
                    </div>
                </div>

                {/* Client List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loadingClients ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => setSelectedClient(client)}
                                    className={`w-full text-left p-3 rounded-xl transition-all ${selectedClient?.id === client.id
                                        ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 border border-indigo-500/30'
                                        : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <p className={`font-black text-xs uppercase tracking-widest ${selectedClient?.id === client.id ? 'text-indigo-300' : 'text-slate-300'
                                        }`}>
                                        {client.name}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Module Header */}
                <div className="bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 px-6 py-2 flex-none flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            {activeTab === 'dispatch' ? <Send className="w-4 h-4 text-white" /> : <Settings className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                            <h2 className="font-black text-white tracking-tight text-sm">Leads & Disparos</h2>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                {selectedClient ? selectedClient.name : 'Selecione um cliente'}
                            </p>
                        </div>
                    </div>

                    {/* Tabs Control */}
                    <div className="flex bg-slate-950/40 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setActiveTab('dispatch')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dispatch' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <LayoutGrid className="w-3 h-3" />
                            Disparo
                        </button>
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Settings className="w-3 h-3" />
                            Configurações
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950/20">
                    {selectedClient ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === 'dispatch' ? (
                                <ColdDispatchTool
                                    key={`dispatch-${selectedClient.id}`}
                                    preselectedClientId={selectedClient.id}
                                />
                            ) : (
                                <LeadsConfig
                                    key={`config-${selectedClient.id}`}
                                    selectedClientId={selectedClient.id}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center h-full">
                            {/* Empty State */}
                            <div className="text-center opacity-50">
                                <Users className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Aguardando seleção</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
