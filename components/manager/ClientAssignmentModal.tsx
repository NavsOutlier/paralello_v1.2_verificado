import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, User, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface ClientAssignment {
    id: string;
    client_id: string;
    team_member_id: string;
    role: 'primary' | 'support' | 'viewer';
    member_name?: string;
    member_email?: string;
    member_job_title?: string;
}

interface ClientAssignmentModalProps {
    clientId: string;
    clientName: string;
    isOpen: boolean;
    onClose: () => void;
}

export const ClientAssignmentModal: React.FC<ClientAssignmentModalProps> = ({
    clientId,
    clientName,
    isOpen,
    onClose
}) => {
    const { organizationId } = useAuth();
    const { showToast } = useToast();
    const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [selectedMember, setSelectedMember] = useState('');
    const [selectedRole, setSelectedRole] = useState<'primary' | 'support' | 'viewer'>('support');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && organizationId) {
            fetchAssignments();
            fetchTeamMembers();

            const channel = supabase
                .channel(`client_assignments_${clientId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'client_assignments',
                        filter: `client_id=eq.${clientId}`
                    },
                    () => {
                        fetchAssignments();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isOpen, organizationId, clientId]);

    const fetchAssignments = async () => {
        try {
            const { data, error } = await supabase
                .from('client_assignments')
                .select(`
                    *,
                    team_member:team_members!client_assignments_team_member_id_fkey(
                        job_title,
                        profile:profiles!team_members_profile_id_fkey(name, email)
                    )
                `)
                .eq('client_id', clientId);

            if (error) throw error;

            setAssignments((data || []).map((a: any) => ({
                id: a.id,
                client_id: a.client_id,
                team_member_id: a.team_member_id,
                role: a.role,
                member_name: a.team_member?.profile?.name || 'Desconhecido',
                member_email: a.team_member?.profile?.email,
                member_job_title: a.team_member?.job_title
            })));
        } catch (error) {
            console.error('Error fetching assignments:', error);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*, profile:profiles!team_members_profile_id_fkey(name, email)')
                .eq('organization_id', organizationId)
                .is('deleted_at', null);

            if (error) throw error;
            setTeamMembers(data || []);
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    const handleAddAssignment = async () => {
        if (!selectedMember || !organizationId) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('client_assignments')
                .insert({
                    organization_id: organizationId,
                    client_id: clientId,
                    team_member_id: selectedMember,
                    role: selectedRole
                });

            if (error) throw error;

            showToast('Membro atribuído com sucesso');
            setSelectedMember('');
            await fetchAssignments();
        } catch (error: any) {
            console.error('Error adding assignment:', error);
            showToast(error.message || 'Erro ao atribuir membro', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        try {
            const { error } = await supabase
                .from('client_assignments')
                .delete()
                .eq('id', assignmentId);

            if (error) throw error;

            showToast('Atribuição removida');
            await fetchAssignments();
        } catch (error: any) {
            console.error('Error removing assignment:', error);
            showToast(error.message || 'Erro ao remover atribuição', 'error');
        }
    };

    if (!isOpen) return null;

    // Get members not yet assigned
    const assignedMemberIds = new Set(assignments.map(a => a.team_member_id));
    const availableMembers = teamMembers.filter(tm => !assignedMemberIds.has(tm.id));

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-2xl shadow-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Gerenciar Acesso</h2>
                            <p className="text-sm text-slate-400">{clientName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Add Assignment */}
                    <div className="p-5 bg-slate-900/50 rounded-xl border border-white/5">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Atribuir Novo Membro
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2 relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    value={selectedMember}
                                    onChange={(e) => setSelectedMember(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-slate-900">Selecionar membro...</option>
                                    {availableMembers.map(member => (
                                        <option key={member.id} value={member.id} className="bg-slate-900">
                                            {member.profile?.name || 'Sem nome'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as any)}
                                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none cursor-pointer"
                                >
                                    <option value="support" className="bg-slate-900">Suporte</option>
                                    <option value="primary" className="bg-slate-900">Principal</option>
                                    <option value="viewer" className="bg-slate-900">Visualizador</option>
                                </select>
                            </div>
                            <button
                                onClick={handleAddAssignment}
                                disabled={!selectedMember || loading}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-purple-500/50 shadow-lg shadow-purple-500/20"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="text-sm font-bold">Adicionar</span>
                            </button>
                        </div>
                    </div>

                    {/* Current Assignments */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Membros com Acesso ({assignments.length})
                        </h3>
                        {assignments.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-white/5">
                                <p className="text-sm">Nenhum membro atribuído ainda</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {assignments.map(assignment => (
                                    <div
                                        key={assignment.id}
                                        className="flex items-center justify-between p-3 bg-slate-900/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                                                {assignment.member_name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">
                                                    {assignment.member_name}
                                                </p>
                                                <p className="text-xs text-slate-400">{assignment.member_email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${assignment.role === 'primary' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                assignment.role === 'support' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                }`}>
                                                {assignment.role === 'primary' ? 'Principal' :
                                                    assignment.role === 'support' ? 'Suporte' : 'Visualizador'}
                                            </span>

                                            <button
                                                onClick={() => handleRemoveAssignment(assignment.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Remover acesso"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
