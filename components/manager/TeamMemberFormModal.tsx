import React, { useState } from 'react';
import { TeamMember } from '../../types';
import { UserPlus, X, Mail, User, Briefcase, Shield, CheckSquare, Users, MessageSquare, Zap, Bot } from 'lucide-react';

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
        canManageAutomation: false,
        canManageAIAgents: false
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
                canManageAutomation: member?.permissions?.canManageAutomation ?? false,
                canManageAIAgents: member?.permissions?.canManageAIAgents ?? false
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
                    canManageAutomation: formData.canManageAutomation,
                    canManageAIAgents: formData.canManageAIAgents
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                            <UserPlus className="w-5 h-5 text-violet-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            {member ? 'Editar Membro' : 'Convidar Membro'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Nome do Membro *
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                                    placeholder="Ex: Ana Souza"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Email Corporativo *
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    disabled={!!member}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 placeholder:text-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="ana@empresa.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Especialidade / Cargo
                        </label>
                        {!isCreatingSpecialty && availableSpecialties.length > 0 ? (
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
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
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 transition-all appearance-none cursor-pointer"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    <option value="" className="bg-slate-900">Selecione uma especialidade...</option>
                                    {availableSpecialties.map(specialty => (
                                        <option key={specialty} value={specialty} className="bg-slate-900 text-white">{specialty}</option>
                                    ))}
                                    <option value="new" className="bg-slate-900 text-violet-400 font-bold">+ Criar nova...</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={formData.jobTitle}
                                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                                        placeholder="Ex: Gestor de Tráfego"
                                        autoFocus
                                    />
                                </div>
                                {availableSpecialties.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingSpecialty(false);
                                            setFormData({ ...formData, jobTitle: '' });
                                        }}
                                        className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Nível de Acesso
                        </label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 transition-all appearance-none cursor-pointer"
                                style={{ backgroundImage: 'none' }}
                            >
                                <option value="viewer" className="bg-slate-900">Visualizador (Apenas leitura)</option>
                                <option value="member" className="bg-slate-900">Membro (Operacional)</option>
                                <option value="manager" className="bg-slate-900">Gerente (Acesso total)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Permissões Granulares
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <PermissionToggle
                                label="Gerenciar Tarefas"
                                icon={<CheckSquare className="w-4 h-4 text-emerald-400" />}
                                checked={formData.canManageTasks}
                                onChange={(checked) => setFormData({ ...formData, canManageTasks: checked })}
                                disabled={formData.role === 'manager'}
                            />
                            <PermissionToggle
                                label="Gerenciar Clientes"
                                icon={<Users className="w-4 h-4 text-blue-400" />}
                                checked={formData.canManageClients}
                                onChange={(checked) => setFormData({ ...formData, canManageClients: checked })}
                                disabled={formData.role === 'manager'}
                            />
                            <PermissionToggle
                                label="Gerenciar Equipe"
                                icon={<UserPlus className="w-4 h-4 text-violet-400" />}
                                checked={formData.canManageTeam}
                                onChange={(checked) => setFormData({ ...formData, canManageTeam: checked })}
                                disabled={formData.role === 'manager'}
                            />
                            <PermissionToggle
                                label="Gerenciar Marketing"
                                icon={<Zap className="w-4 h-4 text-amber-400" />}
                                checked={formData.canManageMarketing}
                                onChange={(checked) => setFormData({ ...formData, canManageMarketing: checked })}
                                disabled={formData.role === 'manager'}
                            />
                            <PermissionToggle
                                label="Gerenciar Automação"
                                icon={<MessageSquare className="w-4 h-4 text-cyan-400" />}
                                checked={formData.canManageAutomation}
                                onChange={(checked) => setFormData({ ...formData, canManageAutomation: checked })}
                                disabled={formData.role === 'manager'}
                            />
                            <PermissionToggle
                                label="Gerenciar IA Agents"
                                icon={<Bot className="w-4 h-4 text-pink-400" />}
                                checked={formData.canManageAIAgents}
                                onChange={(checked) => setFormData({ ...formData, canManageAIAgents: checked })}
                                disabled={formData.role === 'manager'}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-6 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-violet-500/20 transition-all disabled:opacity-50 border border-white/10"
                            disabled={loading}
                        >
                            {loading ? 'Processando...' : member ? 'Salvar Alterações' : 'Enviar Convite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PermissionToggle = ({ label, icon, checked, onChange, disabled }: { label: string, icon: React.ReactNode, checked: boolean, onChange: (c: boolean) => void, disabled: boolean }) => (
    <label className={`flex items-center gap-3 p-3 rounded-xl border border-white/5 transition-all ${checked && !disabled ? 'bg-slate-800/50 border-violet-500/30' : 'bg-slate-900/30 hover:bg-slate-800/50'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${checked ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-600 bg-transparent'}`}>
            {checked && <CheckSquare className="w-3.5 h-3.5" />}
        </div>
        <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
        />
        <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium text-slate-300 select-none">{label}</span>
        </div>
    </label>
);
