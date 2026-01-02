import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
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
        }
    }, [isOpen, organizationId, clientId]);

    const fetchAssignments = async () => {
        try {
            const { data, error } = await supabase
                .from('client_assignments')
                .select(`
                    *,
                    team_member:team_members!client_assignments_team_member_id_fkey(
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
                member_email: a.team_member?.profile?.email
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Gerenciar Acesso</h2>
                        <p className="text-sm text-slate-500">{clientName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                    {/* Add Assignment */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                            Atribuir Novo Membro
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <select
                                value={selectedMember}
                                onChange={(e) => setSelectedMember(e.target.value)}
                                className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Selecionar membro...</option>
                                {availableMembers.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.profile?.name || 'Sem nome'} ({member.profile?.email})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddAssignment}
                                disabled={!selectedMember || loading}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="text-sm font-semibold">Adicionar</span>
                            </button>
                        </div>
                    </div>

                    {/* Current Assignments */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3">
                            Membros com Acesso ({assignments.length})
                        </h3>
                        {assignments.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-sm">Nenhum membro atribuído ainda</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {assignments.map(assignment => (
                                    <div
                                        key={assignment.id}
                                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-slate-800">
                                                {assignment.member_name}
                                            </p>
                                            <p className="text-xs text-slate-500">{assignment.member_email}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                                {assignment.role === 'primary' ? 'Principal' : assignment.role === 'support' ? 'Suporte' : 'Visualizador'}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveAssignment(assignment.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
