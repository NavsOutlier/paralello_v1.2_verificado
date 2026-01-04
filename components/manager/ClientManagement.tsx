import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import { supabase } from '../../lib/supabase';
import { ClientFormModal } from './ClientFormModal';
import { ClientAssignmentModal } from './ClientAssignmentModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, Loader2, UserCog } from 'lucide-react';

export const ClientManagement: React.FC = () => {
    const { organizationId, isSuperAdmin, permissions } = useAuth();
    const canManage = isSuperAdmin || permissions?.can_manage_clients;
    const { showToast } = useToast();
    const { createGroup } = useWhatsApp();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | undefined>();
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; client?: Client }>({
        isOpen: false
    });
    const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean; client?: Client }>({
        isOpen: false
    });

    useEffect(() => {
        if (organizationId) {
            fetchClients();

            const channel = supabase
                .channel('client_management_realtime')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'clients',
                        filter: `organization_id=eq.${organizationId}`
                    },
                    () => {
                        fetchClients();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [organizationId]);

    const fetchClients = async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('organization_id', organizationId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setClients(
                (data || []).map((c) => ({
                    id: c.id,
                    organizationId: c.organization_id,
                    name: c.name,
                    email: c.email,
                    phone: c.phone,
                    whatsapp: c.whatsapp,
                    avatarUrl: c.avatar_url,
                    status: c.status,
                    notes: c.notes,
                    whatsappGroupId: c.whatsapp_group_id,
                    createdAt: new Date(c.created_at),
                    updatedAt: new Date(c.updated_at)
                }))
            );
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClient = async (clientData: Partial<Client>) => {
        if (!organizationId) return;
        setActionLoading(true);
        try {
            const payload = {
                organization_id: organizationId,
                name: clientData.name,
                email: clientData.email || null,
                phone: clientData.phone || null,
                whatsapp: clientData.whatsapp || null,
                whatsapp_group_id: clientData.whatsappGroupId || null,
                notes: clientData.notes || null,
                status: clientData.status || 'active'
            };

            if (selectedClient) {
                // Update existing client
                const { error } = await supabase
                    .from('clients')
                    .update(payload)
                    .eq('id', selectedClient.id);

                if (error) throw error;
            } else {
                // Create new client
                const { data: newClient, error } = await supabase.from('clients').insert(payload).select().single();

                if (error) throw error;

                // Handle automatic group creation
                const clientDataExtended = clientData as any;
                if (clientDataExtended.autoCreateGroup && newClient) {
                    showToast('Solicitando criação do grupo WhatsApp...');
                    // Use custom groupName if provided, otherwise fallback to client name
                    const customName = clientDataExtended.groupName || newClient.name;
                    // Pass the phone number to createGroup
                    const customPhone = clientDataExtended.phone || clientDataExtended.whatsapp;
                    createGroup(customName, newClient.id, customPhone).then(({ error: groupError }) => {
                        if (groupError) {
                            showToast('Erro ao solicitar criação do grupo', 'error');
                        }
                    });
                }
            }

            await fetchClients();
            setIsFormOpen(false);
            setSelectedClient(undefined);
            showToast(selectedClient ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso');
        } catch (error: any) {
            console.error('Error saving client:', error);
            showToast(error.message || 'Erro ao salvar cliente', 'error');
            throw error;
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteClient = async () => {
        if (!deleteDialog.client || !organizationId) return;
        setActionLoading(true);

        try {
            const { error } = await supabase
                .from('clients')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', deleteDialog.client.id);

            if (error) throw error;

            await fetchClients();
            setDeleteDialog({ isOpen: false });
            showToast('Cliente removido com sucesso');
        } catch (error: any) {
            console.error('Error deleting client:', error);
            showToast(error.message || 'Erro ao remover cliente', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredClients = clients.filter((client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
                            <p className="text-sm text-slate-500">{clients.length} cliente(s) cadastrado(s)</p>
                        </div>
                    </div>
                    {canManage && (
                        <button
                            onClick={() => {
                                setSelectedClient(undefined);
                                setIsFormOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Cliente
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar clientes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Carregando...</div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredClients.map((client) => (
                            <div
                                key={client.id}
                                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                            {client.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800">{client.name}</h3>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${client.status === 'active'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {client.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setAssignmentModal({ isOpen: true, client })}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Gerenciar acesso"
                                            >
                                                <UserCog className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedClient(client);
                                                    setIsFormOpen(true);
                                                }}
                                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteDialog({ isOpen: true, client })}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 text-sm">
                                    {client.email && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Mail className="w-4 h-4" />
                                            <span className="truncate">{client.email}</span>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone className="w-4 h-4" />
                                            <span>{client.phone}</span>
                                        </div>
                                    )}
                                    {client.whatsappGroupId && (
                                        <div className="flex items-center gap-2 text-emerald-600 font-mono text-[10px] bg-emerald-50 px-2 py-1 rounded">
                                            <span>ID: {client.whatsappGroupId}</span>
                                        </div>
                                    )}
                                    {client.notes && (
                                        <p className="text-slate-500 text-xs line-clamp-2 mt-2">{client.notes}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ClientFormModal
                isOpen={isFormOpen}
                client={selectedClient}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedClient(undefined);
                }}
                onSave={handleSaveClient}
            />

            <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                title="Excluir Cliente"
                message={`Tem certeza que deseja excluir o cliente "${deleteDialog.client?.name}"? Esta ação não pode ser desfeita.`}
                confirmLabel="Excluir"
                onConfirm={handleDeleteClient}
                onCancel={() => setDeleteDialog({ isOpen: false })}
            />

            <ClientAssignmentModal
                isOpen={assignmentModal.isOpen}
                clientId={assignmentModal.client?.id || ''}
                clientName={assignmentModal.client?.name || ''}
                onClose={() => setAssignmentModal({ isOpen: false })}
            />
        </div>
    );
};
