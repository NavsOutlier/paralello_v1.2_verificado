import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Users, Check, X } from 'lucide-react';

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
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
    selectedClientIds,
    onChange,
    mode = 'multiple',
    currentClientId,
    excludeClientIds = []
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
        if (selectedClientIds.length === 0) return 'Selecione cliente(s)...';
        if (selectedClientIds.length === 1) {
            const client = clients.find(c => c.id === selectedClientIds[0]);
            return client?.name || '1 cliente selecionado';
        }
        if (selectedClientIds.length === clients.length) return 'Todos os clientes';
        return `${selectedClientIds.length} clientes selecionados`;
    };

    if (loading) {
        return (
            <div className="h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left flex items-center justify-between hover:border-slate-300 transition-colors"
            >
                <span className={selectedClientIds.length === 0 ? 'text-slate-400' : 'text-slate-700'}>
                    {getSelectionLabel()}
                </span>
                <Users className="w-4 h-4 text-slate-400" />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Content */}
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-72 overflow-hidden">
                        {/* Search */}
                        <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar cliente..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Select All (only for multiple mode) */}
                        {mode === 'multiple' && clients.length > 1 && (
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-50 border-b border-slate-100 transition-colors"
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isAllSelected
                                        ? 'bg-indigo-600 border-indigo-600'
                                        : 'border-slate-300'
                                    }`}>
                                    {isAllSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm font-bold text-indigo-600">
                                    Selecionar todos ({clients.length})
                                </span>
                            </button>
                        )}

                        {/* Client List */}
                        <div className="overflow-y-auto max-h-48">
                            {filteredClients.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-500">
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
                                            className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''
                                                }`}
                                        >
                                            {mode === 'multiple' ? (
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600'
                                                        : 'border-slate-300'
                                                    }`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            ) : (
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected
                                                        ? 'border-indigo-600'
                                                        : 'border-slate-300'
                                                    }`}>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                                </div>
                                            )}
                                            <span className={`text-sm ${isSelected ? 'font-bold text-indigo-700' : 'text-slate-700'}`}>
                                                {client.name}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Done Button */}
                        {mode === 'multiple' && (
                            <div className="p-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    Confirmar ({selectedClientIds.length} selecionado{selectedClientIds.length !== 1 ? 's' : ''})
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
