import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import { supabase } from '../../lib/supabase';
import { ClientFormModal } from './ClientFormModal';
import { ClientAssignmentModal } from './ClientAssignmentModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, Loader2, UserCog, MessageCircle, Briefcase } from 'lucide-react';

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
        <div className="flex-1 flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header - Premium Dark */}
            <div className="bg-slate-900/40 backdrop-blur-xl border-b border-white/5 p-6 sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10 group">
                            <Users className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Gestão de Clientes</h1>
                            <p className="text-sm text-slate-400 font-medium">
                                <span className="text-cyan-400 font-bold">{clients.length}</span> {clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <button
                            onClick={() => {
                                setSelectedClient(undefined);
                                setIsFormOpen(true);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-lg shadow-blue-500/20 border border-white/10"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Cliente
                        </button>
                    )}
                </div>

                {/* Search - Premium Dark */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Client List - Premium Dark */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                        <p className="text-sm font-medium">Carregando carteira de clientes...</p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-60">
                        <Briefcase className="w-16 h-16 mb-4 text-slate-600" />
                        <p className="text-lg font-bold text-slate-400">
                            {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                        </p>
                        <p className="text-sm text-slate-600">
                            {searchTerm ? 'Tente buscar por outro termo' : 'Comece adicionando seu primeiro cliente'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredClients.map((client) => (
                            <div
                                key={client.id}
                                className="group relative bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-5 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Status Badge */}
                                <div className="absolute top-5 right-5 z-10">
                                    <span
                                        className={`text-[10px] uppercase font-black px-2 py-1 rounded-lg border tracking-wider ${client.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}
                                    >
                                        {client.status === 'active' ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>

                                <div className="flex items-start gap-4 mb-5">
                                    <div className="relative">
                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-500/10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                            {client.name.charAt(0).toUpperCase()}
                                        </div>
                                        {client.status === 'active' && (
                                            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <h3 className="text-lg font-bold text-white truncate pr-16" title={client.name}>
                                            {client.name}
                                        </h3>
                                        {client.notes && (
                                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{client.notes}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2.5 mb-5">
                                    {client.email ? (
                                        <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-300 transition-colors bg-white/5 p-2 rounded-lg border border-white/5">
                                            <Mail className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-xs font-medium truncate">{client.email}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-slate-600 bg-white/[0.02] p-2 rounded-lg border border-dashed border-white/5">
                                            <Mail className="w-3.5 h-3.5" />
                                            <span className="text-xs italic">Sem email</span>
                                        </div>
                                    )}

                                    {client.phone ? (
                                        <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-300 transition-colors bg-white/5 p-2 rounded-lg border border-white/5">
                                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-xs font-medium">{client.phone}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-slate-600 bg-white/[0.02] p-2 rounded-lg border border-dashed border-white/5">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span className="text-xs italic">Sem telefone</span>
                                        </div>
                                    )}

                                    {client.whatsappGroupId ? (
                                        <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-mono tracking-wide truncate flex-1">
                                                ID: {client.whatsappGroupId}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-slate-500 bg-white/[0.02] p-2 rounded-lg border border-dashed border-white/5">
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            <span className="text-xs italic">Sem grupo vinculado</span>
                                        </div>
                                    )}
                                </div>

                                {canManage && (
                                    <div className="flex items-center gap-2 pt-4 border-t border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setAssignmentModal({ isOpen: true, client })}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/5 hover:border-white/10"
                                        >
                                            <UserCog className="w-3.5 h-3.5" />
                                            Acesso
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedClient(client);
                                                setIsFormOpen(true);
                                            }}
                                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-lg transition-colors border border-blue-500/20"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteDialog({ isOpen: true, client })}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-500/20"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
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

