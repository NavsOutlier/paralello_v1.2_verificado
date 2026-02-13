import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Users, Check, ChevronDown } from 'lucide-react';

interface Client {
    id: string;
    name: string;
}

interface ClientSelectorProps {
    selectedClientIds: string[];
    onChange: (clientIds: string[]) => void;
    mode?: 'single' | 'multiple';
    currentClientId?: string; // If opened from a specific client context
    excludeClientIds?: string[]; // For duplicate - exclude current client
    variant?: 'light' | 'dark';
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
    selectedClientIds,
    onChange,
    mode = 'multiple',
    currentClientId,
    excludeClientIds = [],
    variant = 'light'
}) => {
    const { organizationId } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            if (!organizationId) return;

            const { data, error } = await supabase
                .from('clients')
                .select('id, name')
                .eq('organization_id', organizationId)
                .order('name');

            if (!error && data) {
                // Filter out excluded clients
                const filtered = data.filter(c => !excludeClientIds.includes(c.id));
                setClients(filtered);

                // If currentClientId exists and no selection yet, auto-select it
                if (currentClientId && selectedClientIds.length === 0) {
                    onChange([currentClientId]);
                }
            }
            setLoading(false);
        };

        fetchClients();
    }, [organizationId, excludeClientIds]);

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleClient = (clientId: string) => {
        if (mode === 'single') {
            onChange([clientId]);
            setIsOpen(false);
        } else {
            if (selectedClientIds.includes(clientId)) {
                onChange(selectedClientIds.filter(id => id !== clientId));
            } else {
                onChange([...selectedClientIds, clientId]);
            }
        }
    };

    const handleSelectAll = () => {
        if (selectedClientIds.length === clients.length) {
            onChange([]);
        } else {
            onChange(clients.map(c => c.id));
        }
    };

    const isAllSelected = clients.length > 0 && selectedClientIds.length === clients.length;

    const getSelectionLabel = () => {
        if (selectedClientIds.length === 0) {
            return mode === 'single' ? 'Selecione um cliente...' : 'Selecione cliente(s)...';
        }
        if (selectedClientIds.length === 1) {
            const client = clients.find(c => c.id === selectedClientIds[0]);
            return client?.name || '1 cliente selecionado';
        }
        if (selectedClientIds.length === clients.length) return 'Todos os clientes';
        return `${selectedClientIds.length} clientes selecionados`;
    };

    // Styles Configuration
    const styles = {
        light: {
            trigger: 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300',
            triggerPlaceholder: 'text-slate-400',
            dropdown: 'bg-white border-slate-200 shadow-xl',
            searchContainer: 'border-slate-100',
            searchInput: 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-indigo-500',
            dropdownContent: 'bg-white border-slate-200',
            itemHover: 'hover:bg-slate-50',
            itemSelected: 'bg-indigo-50 text-indigo-700 font-bold',
            itemNormal: 'text-slate-700',
            checkboxSelected: 'bg-indigo-600 border-indigo-600',
            checkboxNormal: 'border-slate-300 bg-white',
            divider: 'border-slate-100',
            icon: 'text-slate-400'
        },
        dark: {
            trigger: 'bg-slate-950/50 border-white/5 text-slate-200 hover:bg-slate-900/50 hover:border-white/10',
            triggerPlaceholder: 'text-slate-500',
            dropdown: 'bg-[#0f172a] border-white/10 shadow-2xl shadow-black/50',
            searchContainer: 'border-white/5',
            searchInput: 'bg-slate-900/50 border-white/5 text-slate-200 placeholder:text-slate-600 focus:ring-indigo-500/30',
            dropdownContent: 'bg-[#0f172a] border-white/10',
            itemHover: 'hover:bg-white/5',
            itemSelected: 'bg-indigo-500/10 text-indigo-300 font-bold border-l-2 border-indigo-500 pl-3',
            itemNormal: 'text-slate-300 border-l-2 border-transparent pl-3',
            checkboxSelected: 'bg-indigo-500 border-indigo-500',
            checkboxNormal: 'border-white/10 bg-slate-900/50',
            divider: 'border-white/5',
            icon: 'text-slate-500'
        }
    };

    const currentStyles = styles[variant];

    if (loading) {
        return (
            <div className={`h-11 rounded-xl flex items-center justify-center border ${variant === 'dark' ? 'bg-slate-950/30 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative group">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 border rounded-xl text-sm text-left flex items-center justify-between transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${currentStyles.trigger}`}
            >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <Users className={`w-4 h-4 shrink-0 ${currentStyles.icon}`} />
                    <span className={`truncate ${selectedClientIds.length === 0 ? currentStyles.triggerPlaceholder : ''}`}>
                        {getSelectionLabel()}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${currentStyles.icon} ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Overlay */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className={`absolute top-full left-0 right-0 mt-2 border rounded-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 ${currentStyles.dropdown}`}>
                        {/* Search */}
                        <div className={`p-3 border-b ${currentStyles.searchContainer}`}>
                            <div className="relative">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${currentStyles.icon}`} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar cliente..."
                                    className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 transition-all ${currentStyles.searchInput}`}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Select All */}
                        {mode === 'multiple' && clients.length > 1 && (
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className={`w-full px-4 py-3 flex items-center gap-3 border-b transition-colors ${currentStyles.itemHover} ${currentStyles.divider}`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isAllSelected
                                    ? currentStyles.checkboxSelected
                                    : currentStyles.checkboxNormal
                                    }`}>
                                    {isAllSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <span className={`text-sm font-bold ${variant === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                    Selecionar todos ({clients.length})
                                </span>
                            </button>
                        )}

                        {/* List */}
                        <div className="overflow-y-auto max-h-60 custom-scrollbar p-1">
                            {filteredClients.length === 0 ? (
                                <div className={`p-8 text-center text-sm ${currentStyles.triggerPlaceholder}`}>
                                    Nenhum cliente encontrado
                                </div>
                            ) : (
                                filteredClients.map(client => {
                                    const isSelected = selectedClientIds.includes(client.id);
                                    return (
                                        <button
                                            key={client.id}
                                            type="button"
                                            onClick={() => handleToggleClient(client.id)}
                                            className={`w-full px-4 py-2.5 flex items-center gap-3 rounded-lg transition-all mb-0.5 text-left ${isSelected ? currentStyles.itemSelected : currentStyles.itemNormal} ${currentStyles.itemHover}`}
                                        >
                                            {mode === 'multiple' ? (
                                                <div className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-all ${isSelected
                                                    ? currentStyles.checkboxSelected
                                                    : currentStyles.checkboxNormal
                                                    }`}>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                            ) : (
                                                <div className={`w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                    ? 'border-indigo-500'
                                                    : currentStyles.checkboxNormal
                                                    }`}>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                                </div>
                                            )}
                                            <span className="text-sm truncate font-medium">
                                                {client.name}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Action */}
                        {mode === 'multiple' && (
                            <div className={`p-3 border-t ${currentStyles.divider}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    Confirmar Seleção ({selectedClientIds.length})
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
