import React, { useState, useEffect } from 'react';
import { TeamMember } from '../../types';
import { supabase } from '../../lib/supabase';
import { TeamMemberFormModal } from './TeamMemberFormModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { UserPlus, Search, Edit2, Trash2, Shield, User, Eye, Loader2, MailPlus } from 'lucide-react';

export const TeamManagement: React.FC = () => {
    const { organizationId, isSuperAdmin, permissions } = useAuth();
    const canManage = isSuperAdmin || permissions?.can_manage_team;
    const { showToast } = useToast();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | undefined>();
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; member?: TeamMember }>({
        isOpen: false
    });

    useEffect(() => {
        if (!organizationId) return;

        fetchTeamMembers();

        // Subscribe to changes in team_members
        const channel = supabase
            .channel('team_management_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'team_members',
                    filter: `organization_id=eq.${organizationId}`
                },
                () => {
                    fetchTeamMembers();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `organization_id=eq.${organizationId}`
                },
                () => {
                    fetchTeamMembers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [organizationId]);

    const fetchTeamMembers = async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('team_members')
                .select(`
          *,
          profile:profiles!team_members_profile_id_fkey(name, email, avatar)
        `)
                .eq('organization_id', organizationId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setMembers(
                (data || []).map((m: any) => ({
                    id: m.id,
                    organizationId: m.organization_id,
                    profileId: m.profile_id,
                    profile: m.profile ? {
                        name: m.profile.name,
                        email: m.profile.email,
                        avatarUrl: m.profile.avatar
                    } : undefined,
                    role: m.role,
                    permissions: {
                        canManageClients: m.permissions?.can_manage_clients ?? true,
                        canManageTasks: m.permissions?.can_manage_tasks ?? true,
                        canManageTeam: m.permissions?.can_manage_team ?? false,
                        canManageMarketing: m.permissions?.can_manage_marketing ?? false,
                        canManageAutomation: m.permissions?.can_manage_automation ?? false
                    },
                    jobTitle: m.job_title,
                    status: m.status,
                    invitedBy: m.invited_by,
                    createdAt: new Date(m.created_at),
                    updatedAt: new Date(m.updated_at)
                }))
            );
        } catch (error) {
            console.error('Error fetching team members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMember = async (memberData: Partial<TeamMember>) => {
        if (!organizationId) return;
        setActionLoading(true);
        try {
            if (selectedMember) {
                // Update existing member
                const { error: memberError } = await supabase
                    .from('team_members')
                    .update({
                        role: memberData.role,
                        job_title: memberData.jobTitle,
                        permissions: {
                            can_manage_clients: memberData.permissions?.canManageClients ?? true,
                            can_manage_tasks: memberData.permissions?.canManageTasks ?? true,
                            can_manage_team: memberData.permissions?.canManageTeam ?? false,
                            can_manage_marketing: memberData.permissions?.canManageMarketing ?? false,
                            can_manage_automation: memberData.permissions?.canManageAutomation ?? false
                        }
                    })
                    .eq('id', selectedMember.id);

                if (memberError) throw memberError;

                // Update name in profile
                if (memberData.profile?.name) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update({ name: memberData.profile.name })
                        .eq('id', selectedMember.profileId);

                    if (profileError) throw profileError;
                }

                showToast('Membro atualizado com sucesso');
            } else {
                // Create new member (Invite via Edge Function)
                if (!memberData.profile?.email) throw new Error('Email é obrigatório');

                const { data: response, error: inviteError } = await supabase.functions.invoke('invite-team-member', {
                    body: {
                        email: memberData.profile.email,
                        name: memberData.profile.name,
                        job_title: memberData.jobTitle,
                        role: memberData.role || 'member',
                        organization_id: organizationId,
                        invited_by: (await supabase.auth.getUser()).data.user?.id,
                        permissions: {
                            can_manage_clients: memberData.permissions?.canManageClients ?? true,
                            can_manage_tasks: memberData.permissions?.canManageTasks ?? true,
                            can_manage_team: memberData.permissions?.canManageTeam ?? false,
                            can_manage_marketing: memberData.permissions?.canManageMarketing ?? false,
                            can_manage_automation: memberData.permissions?.canManageAutomation ?? false
                        }
                    }
                });

                if (inviteError || (response && response.error)) {
                    throw new Error(inviteError?.message || response?.error || 'Erro ao convidar membro');
                }

                showToast('Membro adicionado com sucesso');
            }

            await fetchTeamMembers();
            setIsFormOpen(false);
            setSelectedMember(undefined);
        } catch (error: any) {
            console.error('Error saving team member:', error);
            showToast(error.message || 'Erro ao salvar membro', 'error');
            throw error;
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteMember = async () => {
        if (!deleteDialog.member || !organizationId) return;
        setActionLoading(true);

        try {
            const { error } = await supabase
                .from('team_members')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', deleteDialog.member.id);

            if (error) throw error;

            await fetchTeamMembers();
            setDeleteDialog({ isOpen: false });
            showToast('Membro removido com sucesso');
        } catch (error: any) {
            console.error('Error deleting team member:', error);
            showToast(error.message || 'Erro ao remover membro', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResendInvite = async (member: TeamMember) => {
        if (!member.profile?.email) {
            showToast('Email do membro não encontrado', 'error');
            return;
        }
        setActionLoading(true);

        try {
            const { data: response, error } = await supabase.functions.invoke('resend-invite', {
                body: { email: member.profile.email }
            });

            if (error || (response && response.error)) {
                throw new Error(error?.message || response?.error || 'Erro ao reenviar convite');
            }

            showToast(response?.message || 'Convite reenviado com sucesso!');
        } catch (error: any) {
            console.error('Error resending invite:', error);
            showToast(error.message || 'Erro ao reenviar convite', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredMembers = members.filter((member) => {
        const name = member.profile?.name?.toLowerCase() || '';
        const email = member.profile?.email?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return name.includes(search) || email.includes(search);
    });

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'manager':
                return <Shield className="w-4 h-4" />;
            case 'member':
                return <User className="w-4 h-4" />;
            case 'viewer':
                return <Eye className="w-4 h-4" />;
            default:
                return <User className="w-4 h-4" />;
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'manager':
                return 'Gerente';
            case 'member':
                return 'Membro';
            case 'viewer':
                return 'Visualizador';
            default:
                return role;
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <UserPlus className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Equipe</h1>
                            <p className="text-sm text-slate-500">{members.length} membro(s) na equipe</p>
                        </div>
                    </div>
                    {canManage && (
                        <button
                            onClick={() => {
                                setSelectedMember(undefined);
                                setIsFormOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <UserPlus className="w-4 h-4" />
                            Convidar Membro
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar membros..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            {/* Member List */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Carregando...</div>
                ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        {searchTerm ? 'Nenhum membro encontrado' : 'Nenhum membro na equipe'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMembers.map((member) => (
                            <div
                                key={member.id}
                                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                                            {member.profile?.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-800">
                                                    {member.profile?.name || 'Nome não disponível'}
                                                </h3>
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                                    {getRoleIcon(member.role)}
                                                    <span>{getRoleLabel(member.role)}</span>
                                                </div>
                                                {member.status === 'pending' && (
                                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm text-slate-600">{member.profile?.email}</p>
                                                {member.jobTitle && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                            {member.jobTitle}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex gap-3 mt-2 text-xs text-slate-500">
                                                {member.permissions.canManageClients && (
                                                    <span>✓ Gerenciar clientes</span>
                                                )}
                                                {member.permissions.canManageTasks && (
                                                    <span>✓ Gerenciar tarefas</span>
                                                )}
                                                {member.permissions.canManageTeam && (
                                                    <span>✓ Gerenciar equipe</span>
                                                )}
                                                {member.permissions.canManageMarketing && (
                                                    <span>✓ Gerenciar marketing</span>
                                                )}
                                                {member.permissions.canManageAutomation && (
                                                    <span>✓ Gerenciar automações</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <div className="flex gap-1">
                                            {member.status === 'pending' && (
                                                <button
                                                    onClick={() => handleResendInvite(member)}
                                                    disabled={actionLoading}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                                                    title="Reenviar Convite"
                                                >
                                                    <MailPlus className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedMember(member);
                                                    setIsFormOpen(true);
                                                }}
                                                className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteDialog({ isOpen: true, member })}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <TeamMemberFormModal
                isOpen={isFormOpen}
                member={selectedMember}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedMember(undefined);
                }}
                onSave={handleSaveMember}
                availableSpecialties={Array.from(new Set(members.map(m => m.jobTitle).filter(Boolean))) as string[]}
            />

            <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                title="Remover Membro"
                message={`Tem certeza que deseja remover "${deleteDialog.member?.profile?.name}" da equipe? Esta ação não pode ser desfeita.`}
                confirmLabel="Remover"
                onConfirm={handleDeleteMember}
                onCancel={() => setDeleteDialog({ isOpen: false })}
            />
        </div>
    );
};
