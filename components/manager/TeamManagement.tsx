import React, { useState, useEffect } from 'react';
import { TeamMember } from '../../types';
import { supabase } from '../../lib/supabase';
import { TeamMemberFormModal } from './TeamMemberFormModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useOrganizationPlan } from '../../hooks/useOrganizationPlan';
import { UserPlus, Search, Edit2, Trash2, Shield, User, Eye, Loader2, MailPlus, Briefcase, Zap, Lock, Users } from 'lucide-react';

export const TeamManagement: React.FC = () => {
    const { organizationId, isSuperAdmin, permissions } = useAuth();
    const { plan, loading: planLoading } = useOrganizationPlan();
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
                        canManageAutomation: m.permissions?.can_manage_automation ?? false,
                        canManageAIAgents: m.permissions?.can_manage_ai_agents ?? false
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

        // Check Limit for new members
        if (!selectedMember && !isSuperAdmin && plan) {
            if (members.length >= plan.max_users) {
                showToast(`Limite de usuários atingido (${plan.max_users}). Faça upgrade do seu plano para adicionar mais membros.`, 'error');
                return;
            }
        }

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
                            can_manage_automation: memberData.permissions?.canManageAutomation ?? false,
                            can_manage_ai_agents: memberData.permissions?.canManageAIAgents ?? false
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
                            can_manage_automation: memberData.permissions?.canManageAutomation ?? false,
                            can_manage_ai_agents: memberData.permissions?.canManageAIAgents ?? false
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
                return <Shield className="w-3.5 h-3.5" />;
            case 'member':
                return <User className="w-3.5 h-3.5" />;
            case 'viewer':
                return <Eye className="w-3.5 h-3.5" />;
            default:
                return <User className="w-3.5 h-3.5" />;
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
        <div className="flex-1 flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header - Premium Dark */}
            <div className="bg-slate-900/40 backdrop-blur-xl border-b border-white/5 p-6 sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/10 group">
                            <UserPlus className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Equipe & Acessos</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-slate-400 font-medium">
                                    <span className="text-violet-400 font-bold">{members.length}</span> {members.length === 1 ? 'membro ativo' : 'membros ativos'}
                                </p>
                                {plan && !isSuperAdmin && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/5">
                                        <div className="w-1 h-1 rounded-full bg-violet-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            {plan.max_users >= 999999 ? 'Ilimitado' : `Limite: ${plan.max_users}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {canManage && (
                        <button
                            onClick={() => {
                                if (!isSuperAdmin && plan && members.length >= plan.max_users) {
                                    showToast(`Seu plano permite até ${plan.max_users} usuários.`, 'info');
                                    return;
                                }
                                setSelectedMember(undefined);
                                setIsFormOpen(true);
                            }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all border border-white/10 ${!isSuperAdmin && plan && members.length >= plan.max_users
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed grayscale'
                                : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:scale-105 shadow-lg shadow-violet-500/20'
                                }`}
                        >
                            {!isSuperAdmin && plan && members.length >= plan.max_users ? (
                                <Lock className="w-4 h-4" />
                            ) : (
                                <UserPlus className="w-4 h-4" />
                            )}
                            Convidar Membro
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
                        className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Member List - Premium Dark */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Loader2 className="w-10 h-10 animate-spin text-violet-500 mb-4" />
                        <p className="text-sm font-medium">Carregando equipe...</p>
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-60">
                        <Users className="w-16 h-16 mb-4 text-slate-600" />
                        <p className="text-lg font-bold text-slate-400">
                            {searchTerm ? 'Nenhum membro encontrado' : 'Equipe vazia'}
                        </p>
                        <p className="text-sm text-slate-600">
                            {searchTerm ? 'Tente buscar por outro termo' : 'Comece convidando seu time'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {filteredMembers.map((member) => (
                            <div
                                key={member.id}
                                className="group relative bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-5 hover:border-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/5 transition-all duration-300"
                            >
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-violet-500/10 border border-white/10 group-hover:scale-105 transition-transform duration-300">
                                            {member.profile?.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide shadow-sm
                                            ${member.role === 'manager'
                                                ? 'bg-amber-500 text-slate-900 border-amber-400'
                                                : 'bg-slate-800 text-slate-300 border-white/10'
                                            }`}
                                        >
                                            {getRoleLabel(member.role)}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 text-center sm:text-left min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-white truncate">
                                                {member.profile?.name || 'Convite Pendente'}
                                            </h3>
                                            {member.status === 'pending' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase border border-yellow-500/20">
                                                    Pendente
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-sm text-slate-400 mb-3 truncate">{member.profile?.email}</div>

                                        {member.jobTitle && (
                                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                                                <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-violet-300 font-medium flex items-center gap-1.5">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    {member.jobTitle}
                                                </div>
                                            </div>
                                        )}

                                        {/* Permissions Badges (Mini) */}
                                        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mb-4">
                                            {member.permissions.canManageClients && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500" title="Clientes" />
                                            )}
                                            {member.permissions.canManageTasks && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Tarefas" />
                                            )}
                                            {member.permissions.canManageTeam && (
                                                <span className="w-2 h-2 rounded-full bg-violet-500" title="Equipe" />
                                            )}
                                            {member.permissions.canManageAutomation && (
                                                <span className="w-2 h-2 rounded-full bg-cyan-500" title="Automação" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {canManage && (
                                        <div className="flex sm:flex-col gap-2 opacity-100 sm:opacity-80 sm:group-hover:opacity-100 transition-opacity">
                                            {member.status === 'pending' && (
                                                <button
                                                    onClick={() => handleResendInvite(member)}
                                                    disabled={actionLoading}
                                                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-colors"
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
                                                className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 rounded-xl transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteDialog({ isOpen: true, member })}
                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl transition-colors"
                                                title="Remover"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Permissions Detail (Hover only) */}
                                <div className="mt-4 pt-4 border-t border-white/5 hidden sm:block">
                                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-medium">
                                        {member.permissions.canManageClients && <span className="text-slate-400">Clientes</span>}
                                        {member.permissions.canManageTasks && <span className="text-slate-400">• Tarefas</span>}
                                        {member.permissions.canManageTeam && <span className="text-slate-400">• Equipe</span>}
                                        {member.permissions.canManageMarketing && <span className="text-slate-400">• Marketing</span>}
                                        {member.permissions.canManageAutomation && <span className="text-slate-400">• Automação</span>}
                                        {member.permissions.canManageAIAgents && <span className="text-slate-400">• IA</span>}
                                    </div>
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
