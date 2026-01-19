import React, { useState } from 'react';
import { TeamMember } from '../../types';

interface TeamMemberFormModalProps {
    isOpen: boolean;
    member?: TeamMember;
    onClose: () => void;
    onSave: (member: Partial<TeamMember>) => Promise<void>;
    availableSpecialties?: string[];
}

export const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({
    isOpen,
    member,
    onClose,
    onSave,
    availableSpecialties = []
}) => {
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        jobTitle: '',
        role: 'member',
        canManageTasks: true,
        canManageClients: false,
        canManageTeam: false,
        canManageMarketing: false,
        canManageAutomation: false
    });
    const [loading, setLoading] = useState(false);
    const [isCreatingSpecialty, setIsCreatingSpecialty] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                email: member?.profile?.email || '',
                name: member?.profile?.name || '',
                jobTitle: member?.jobTitle || '',
                role: member?.role || 'member',
                canManageClients: member?.permissions?.canManageClients ?? true,
                canManageTasks: member?.permissions?.canManageTasks ?? true,
                canManageTeam: member?.permissions?.canManageTeam ?? false,
                canManageMarketing: member?.permissions?.canManageMarketing ?? false,
                canManageAutomation: member?.permissions?.canManageAutomation ?? false
            });
        }
    }, [isOpen, member]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                role: formData.role as 'manager' | 'member' | 'viewer',
                profile: {
                    email: formData.email,
                    name: formData.name
                } as any,
                jobTitle: formData.jobTitle,
                permissions: {
                    canManageClients: formData.canManageClients,
                    canManageTasks: formData.canManageTasks,
                    canManageTeam: formData.canManageTeam,
                    canManageMarketing: formData.canManageMarketing,
                    canManageAutomation: formData.canManageAutomation
                }
            });
            onClose();
        } catch (error) {
            console.error('Error saving team member:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-800">
                        {member ? 'Editar Membro' : 'Convidar Membro'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nome *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: João Silva"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                required
                                disabled={!!member}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="email@exemplo.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Especialidade
                        </label>
                        {!isCreatingSpecialty && availableSpecialties.length > 0 ? (
                            <div className="flex gap-2">
                                <select
                                    value={formData.jobTitle}
                                    onChange={(e) => {
                                        if (e.target.value === 'new') {
                                            setIsCreatingSpecialty(true);
                                            setFormData({ ...formData, jobTitle: '' });
                                        } else {
                                            setFormData({ ...formData, jobTitle: e.target.value });
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                >
                                    <option value="">Selecione uma especialidade...</option>
                                    {availableSpecialties.map(specialty => (
                                        <option key={specialty} value={specialty}>{specialty}</option>
                                    ))}
                                    <option value="new" className="text-purple-600 font-semibold">+ Criar nova...</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.jobTitle}
                                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Ex: Gestor de Tráfego"
                                    autoFocus
                                />
                                {availableSpecialties.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingSpecialty(false);
                                            setFormData({ ...formData, jobTitle: '' });
                                        }}
                                        className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Função
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="viewer">Visualizador</option>
                            <option value="member">Membro</option>
                            <option value="manager">Gerente</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            {formData.role === 'manager' && 'Acesso completo ao painel de gerenciamento'}
                            {formData.role === 'member' && 'Pode gerenciar clientes e tarefas'}
                            {formData.role === 'viewer' && 'Acesso apenas para visualização'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Permissões
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.canManageTasks}
                                onChange={(e) => setFormData({ ...formData, canManageTasks: e.target.checked })}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                disabled={formData.role === 'manager'}
                            />
                            <span className="text-sm text-slate-700">Gerenciar tarefas</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.canManageClients}
                                onChange={(e) => setFormData({ ...formData, canManageClients: e.target.checked })}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                disabled={formData.role === 'manager'}
                            />
                            <span className="text-sm text-slate-700">Gerenciar clientes</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.canManageTeam}
                                onChange={(e) => setFormData({ ...formData, canManageTeam: e.target.checked })}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                disabled={formData.role === 'manager'}
                            />
                            <span className="text-sm text-slate-700">Gerenciar equipe</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.canManageMarketing}
                                onChange={(e) => setFormData({ ...formData, canManageMarketing: e.target.checked })}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                disabled={formData.role === 'manager'}
                            />
                            <span className="text-sm text-slate-700">Gerenciar marketing</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.canManageAutomation}
                                onChange={(e) => setFormData({ ...formData, canManageAutomation: e.target.checked })}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                disabled={formData.role === 'manager'}
                            />
                            <span className="text-sm text-slate-700">Gerenciar automações</span>
                        </label>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : member ? 'Salvar' : 'Convidar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
