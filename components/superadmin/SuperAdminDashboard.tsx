import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, DollarSign, Users, TrendingUp, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { PLANS, PLAN_ARRAY } from '../../config/plans';
import { Organization, PlanType } from '../../types';
import { Button } from '../ui';
import { MetricsCard } from './MetricsCard';
import { OrganizationTable } from './OrganizationTable';
import { OrganizationModal } from './OrganizationModal';
import { AdminOrgSetupModal } from './AdminOrgSetupModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useToast } from '../../contexts/ToastContext';
import { SystemSettings } from './SystemSettings';
import {
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    toggleOrganizationStatus,
    changeOrganizationPlan,
    deleteOrganization
} from '../../lib/supabase-admin';

export const SuperAdminDashboard: React.FC = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [setupOrg, setSetupOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
    const [activeTab, setActiveTab] = useState<'organizations' | 'settings'>('organizations');
    const { showToast } = useToast();

    // Load organizations on mount
    useEffect(() => {
        loadOrganizations(true);

        // Realtime subscription for critical updates
        const channel = supabase
            .channel('super-admin-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'instances'
            }, () => {
                console.log('Instance change detected, refreshing organizations...');
                loadOrganizations();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'organizations'
            }, () => {
                console.log('Organization change detected, refreshing...');
                loadOrganizations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadOrganizations = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            else setIsRefreshing(true);

            setError(null);
            const data = await fetchOrganizations();
            setOrganizations(data);
        } catch (err) {
            const errorMsg = 'Erro ao carregar organizações';
            setError(errorMsg);
            showToast(errorMsg, 'error');
            console.error(err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Calculate Metrics
    const totalOrgs = organizations.length;
    const activeOrgs = organizations.filter(o => o.status === 'active').length;
    const mrr = organizations
        .filter(o => o.status === 'active')
        .reduce((sum, org) => {
            const plan = PLAN_ARRAY.find(p => p.id === org.plan);
            return sum + (plan?.price || 0);
        }, 0);

    const getPlanCount = (planType: PlanType) => {
        return organizations.filter(o => o.plan === planType).length;
    };

    // Handlers
    const handleAddNew = () => {
        setEditingOrg(null);
        setModalOpen(true);
    };

    const handleEdit = (org: Organization) => {
        setEditingOrg(org);
        setModalOpen(true);
    };

    const handleToggleStatus = async (org: Organization) => {
        try {
            const newStatus = org.status === 'active' ? 'inactive' : 'active';
            await toggleOrganizationStatus(org.id, newStatus);
            showToast(
                `${org.name} foi ${newStatus === 'active' ? 'ativada' : 'desativada'} com sucesso`,
                'success'
            );
            await loadOrganizations(); // Reload to get fresh data
        } catch (err) {
            showToast('Erro ao alterar status', 'error');
            console.error(err);
        }
    };

    const handleChangePlan = async (org: Organization) => {
        try {
            const currentIndex = PLAN_ARRAY.findIndex(p => p.id === org.plan);
            const nextPlan = currentIndex < PLAN_ARRAY.length - 1 ? PLAN_ARRAY[currentIndex + 1] : null;
            const prevPlan = currentIndex > 0 ? PLAN_ARRAY.find((p, i) => i === currentIndex - 1) : null;
            const currentPlanName = PLAN_ARRAY.find(p => p.id === org.plan)?.name;


            if (!nextPlan) {
                showToast('Não há um próximo plano disponível.', 'info');
                return;
            }

            await changeOrganizationPlan(org.id, nextPlan.id);
            showToast(
                `Plano de ${org.name} alterado de ${currentPlanName} para ${nextPlan.name}`,
                'success'
            );
            await loadOrganizations(); // Reload to get fresh data
        } catch (err) {
            showToast('Erro ao alterar plano', 'error');
            console.error(err);
        }
    };

    const handleSave = async (data: Partial<Organization>) => {
        try {
            if (editingOrg) {
                // Edit existing
                await updateOrganization(editingOrg.id, data);
                showToast(`${data.name} foi atualizada com sucesso`, 'success');
            } else {
                // Create new
                await createOrganization(data);
                showToast(`${data.name} foi criada com sucesso`, 'success');
            }
            await loadOrganizations(); // Reload to get fresh data
            setModalOpen(false);
        } catch (err) {
            showToast('Erro ao salvar organização', 'error');
            console.error(err);
        }
    };

    // Loading state
    const handleOpenSetup = (org: Organization) => {
        setSetupOrg(org);
        setIsSetupOpen(true);
    };

    const handleDelete = (org: Organization) => {
        setDeletingOrg(org);
    };

    const confirmDelete = async () => {
        if (!deletingOrg) return;

        try {
            const orgName = deletingOrg.name;
            // Now we just await, the modal itself manages the "Excluindo..." button state
            await deleteOrganization(deletingOrg.id);
            setDeletingOrg(null);
            showToast(`Organização ${orgName} excluída com sucesso`, 'success');
            await loadOrganizations();
        } catch (err: any) {
            showToast(err.message || 'Erro ao excluir organização', 'error');
            console.error(err);
        }
    };

    if (loading && !isRefreshing) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm h-full relative z-10">
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-2xl flex items-center justify-center text-white font-black text-2xl mb-6 animate-bounce">
                        B
                    </div>
                    <div className="text-cyan-400/50 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Sistema...</div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center bg-transparent h-full relative z-10">
                <div className="text-center bg-slate-900/40 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-red-500/20 shadow-2xl">
                    <p className="text-red-400 font-bold mb-6 uppercase tracking-widest text-xs italic">{error}</p>
                    <Button
                        variant="outline"
                        onClick={() => loadOrganizations(true)}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                        Tentar Novamente
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-transparent overflow-y-auto h-full custom-scrollbar relative z-10 animate-in fade-in duration-700">
            <div className="flex justify-between items-end mb-12">
                <div className="relative group flex items-center gap-4">
                    <div className="absolute -inset-10 bg-indigo-500/10 blur-[120px] rounded-full opacity-50 transition-opacity" />
                    <div className="flex flex-col">
                        <h1 className="relative text-4xl font-black text-white tracking-tighter mb-2 italic">Super Admin <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">Core</span></h1>
                        <p className="relative text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] pl-1">
                            Nível de Acesso: Segurança Máxima de Orquestração
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => loadOrganizations()}
                        disabled={isRefreshing}
                        className="p-4 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl text-slate-400 hover:text-cyan-400 transition-all shadow-xl active:scale-95"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all hover:-translate-y-1 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        NOVA ORGANIZAÇÃO
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-900/40 backdrop-blur-3xl p-1 rounded-2xl border border-white/5 shadow-2xl mb-12 w-fit">
                <button
                    onClick={() => setActiveTab('organizations')}
                    className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl ${activeTab === 'organizations'
                        ? 'bg-white/10 text-white shadow-inner border border-white/10'
                        : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Organizações
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-xl ${activeTab === 'settings'
                        ? 'bg-white/10 text-white shadow-inner border border-white/10'
                        : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Configurações Globais
                </button>
            </div>

            {activeTab === 'organizations' ? (
                <>
                    {/* Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                        <MetricsCard
                            title="Total de Organizações"
                            value={totalOrgs}
                            icon={Building2}
                            color="bg-blue-500"
                        />
                        <MetricsCard
                            title="Organizações Ativas"
                            value={activeOrgs}
                            icon={TrendingUp}
                            color="bg-emerald-500"
                            subtitle={`${((activeOrgs / totalOrgs) * 100).toFixed(0)}% do total`}
                        />
                        <MetricsCard
                            title="MRR Total"
                            value={`$${mrr.toLocaleString()}`}
                            icon={DollarSign}
                            color="bg-indigo-500"
                            subtitle="Monthly Recurring Revenue"
                        />
                        <MetricsCard
                            title="Membros da Equipe"
                            value={organizations.reduce((sum, o) => sum + o.stats.users, 0)}
                            icon={Users}
                            color="bg-violet-500"
                        />
                    </div>

                    {/* Plan Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        <div className="bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/5 shadow-2xl group hover:border-slate-500/20 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Protocolo BASIC</h3>
                                <span className="text-3xl font-black text-white">{getPlanCount(PlanType.BASIC)}</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">$49/mês • {PLANS[PlanType.BASIC].maxUsers} usuários</div>
                        </div>

                        <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2rem] border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.1)] group hover:border-indigo-500/50 transition-all">
                            <div className="absolute top-0 right-0 p-2">
                                <Sparkles className="w-5 h-5 text-indigo-400 opacity-20 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Protocolo PRO</h3>
                                <span className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">{getPlanCount(PlanType.PRO)}</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">$149/mês • {PLANS[PlanType.PRO].maxUsers} usuários</div>
                        </div>

                        <div className="bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-violet-500/20 shadow-2xl group hover:border-violet-500/40 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em]">Protocolo ENTERPRISE</h3>
                                <span className="text-3xl font-black text-white">{getPlanCount(PlanType.ENTERPRISE)}</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">$499/mês • Ilimitado</div>
                        </div>
                    </div>

                    {/* Organizations Table */}
                    <OrganizationTable
                        organizations={organizations}
                        onEdit={handleEdit}
                        onToggleStatus={handleToggleStatus}
                        onChangePlan={handleChangePlan}
                        onOpenSetup={handleOpenSetup}
                        onDelete={handleDelete}
                    />
                </>
            ) : (
                <SystemSettings />
            )}

            {/* Modal */}
            <OrganizationModal
                organization={editingOrg}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />

            <AdminOrgSetupModal
                isOpen={isSetupOpen}
                organization={setupOrg}
                onClose={() => setIsSetupOpen(false)}
            />

            <ConfirmModal
                isOpen={!!deletingOrg}
                onClose={() => setDeletingOrg(null)}
                onConfirm={confirmDelete}
                title="Excluir Organização"
                message={`Tem certeza que deseja excluir permanentemente a organização "${deletingOrg?.name}"? Todas as instâncias, chats e dados vinculados serão removidos. Esta ação não pode ser desfeita.`}
                confirmLabel="Sim, Excluir Tudo"
                cancelLabel="Manter Organização"
                variant="danger"
            />
        </div>
    );
};
