import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Search, Briefcase, Sparkles, ChevronRight, Activity } from 'lucide-react';

interface Client {
    id: string;
    name: string;
}

interface ClientSidebarProps {
    selectedClientId: string | null;
    onSelectClient: (client: Client) => void;
}

export const ClientSidebar: React.FC<ClientSidebarProps> = ({
    selectedClientId,
    onSelectClient
}) => {
    const { organizationId } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClients = async () => {
            if (!organizationId) return;
            setLoading(true);

            const { data, error } = await supabase
                .from('clients')
                .select('id, name')
                .eq('organization_id', organizationId)
                .order('name');

            if (error) {
                console.error('Error fetching clients:', error);
            } else {
                setClients(data || []);
                if (data && data.length > 0 && !selectedClientId) {
                    onSelectClient(data[0]);
                }
            }
            setLoading(false);
        };

        fetchClients();
    }, [organizationId]);

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-80 bg-slate-900/80 backdrop-blur-xl border-r border-cyan-500/10 flex flex-col relative z-20 h-full shrink-0">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-cyan-500/10">
                <div className="flex items-center gap-3 mb-5">
                    <div className="relative">
                        <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-fuchsia-600 rounded-xl shadow-lg shadow-cyan-500/30">
                            <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute inset-0 bg-cyan-400 rounded-xl animate-ping opacity-20" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 pl-0.5">
                            Clientes <Sparkles className="w-3 h-3 text-cyan-400" />
                        </h2>
                        <span className="text-[10px] text-slate-500 pl-0.5 mt-0.5 block font-bold uppercase tracking-widest">{clients.length} Conectados</span>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/5 rounded-2xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 focus:outline-none transition-all font-bold tracking-wide"
                    />
                </div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="p-8 text-center text-[10px] text-slate-500 uppercase font-black tracking-widest opacity-50">
                        Nenhum cliente
                    </div>
                ) : (
                    filteredClients.map(client => (
                        <button
                            key={client.id}
                            onClick={() => onSelectClient(client)}
                            className={`w-full text-left p-4 rounded-[24px] transition-all group relative overflow-hidden border ${selectedClientId === client.id
                                    ? 'bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                                    : 'hover:bg-white/5 border-transparent'
                                }`}
                        >
                            {selectedClientId === client.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-fuchsia-500" />
                            )}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${selectedClientId === client.id
                                            ? 'bg-gradient-to-br from-cyan-500 to-fuchsia-600 text-white shadow-xl shadow-cyan-500/30 ring-2 ring-white/10'
                                            : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
                                        }`}>
                                        {client.name.charAt(0).toUpperCase()}
                                        {selectedClientId === client.id && (
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${selectedClientId === client.id ? 'text-white' : 'text-slate-400'
                                            }`}>
                                            {client.name}
                                        </span>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Ativo</span>
                                    </div>
                                </div>
                                <ChevronRight className={`w-4 h-4 transition-all ${selectedClientId === client.id
                                        ? 'text-cyan-400 translate-x-0'
                                        : 'text-slate-700 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                                    }`} />
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-cyan-500/10 bg-slate-900/40">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                    <div className="relative">
                        <Activity className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                        <div className="absolute inset-0 bg-cyan-400 blur-sm rounded-full animate-pulse opacity-20" />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Black BI System Active</span>
                </div>
            </div>
        </div>
    );
};
