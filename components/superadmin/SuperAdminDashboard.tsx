import React, { useState, useEffect } from 'react';
import { Building2, DollarSign, Users, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import { PLANS } from '../../constants-superadmin';
import { Organization, PlanType } from '../../types';
import { Button } from '../ui';
import { MetricsCard } from './MetricsCard';
import { OrganizationTable } from './OrganizationTable';
import { OrganizationModal } from './OrganizationModal';
import { AdminOrgSetupModal } from './AdminOrgSetupModal';
import { useToast } from '../../contexts/ToastContext';
import {
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    toggleOrganizationStatus,
    changeOrganizationPlan
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
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    // Load organizations on mount
    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        try {
            setLoading(true);
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
        }
    };

    // Calculate Metrics
    const totalOrgs = organizations.length;
    const activeOrgs = organizations.filter(o => o.status === 'active').length;
    const mrr = organizations
        .filter(o => o.status === 'active')
        .reduce((sum, org) => {
            const plan = PLANS.find(p => p.id === org.plan);
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
            const currentPlanIndex = PLANS.findIndex(p => p.id === org.plan);
            const nextPlan = PLANS[(currentPlanIndex + 1) % PLANS.length];
            const currentPlanName = PLANS.find(p => p.id === org.plan)?.name;

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

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 h-full">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Carregando organizações...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 h-full">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={loadOrganizations} icon={<RefreshCw className="w-4 h-4" />}>
                        Tentar Novamente
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-slate-50 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Super Admin</h1>
                    <p className="text-slate-500 mt-1">Gerenciamento de organizações e planos</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        icon={<RefreshCw className="w-4 h-4" />}
                        onClick={loadOrganizations}
                        title="Recarregar"
                    />
                    <Button
                        icon={<Plus className="w-4 h-4" />}
                        onClick={handleAddNew}
                    >
                        Nova Organização
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                    color="bg-green-500"
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
                    title="Total de Usuários"
                    value={organizations.reduce((sum, o) => sum + o.stats.users, 0)}
                    icon={Users}
                    color="bg-purple-500"
                />
            </div>

            {/* Plan Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-slate-600">BASIC</h3>
                        <span className="text-2xl font-bold text-slate-800">{getPlanCount(PlanType.BASIC)}</span>
                    </div>
                    <div className="text-sm text-slate-500">$49/mês • {PLANS[0].maxUsers} usuários</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 border-2">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-indigo-600">PRO</h3>
                        <span className="text-2xl font-bold text-indigo-600">{getPlanCount(PlanType.PRO)}</span>
                    </div>
                    <div className="text-sm text-slate-500">$149/mês • {PLANS[1].maxUsers} usuários</div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 border-2">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-purple-600">ENTERPRISE</h3>
                        <span className="text-2xl font-bold text-purple-600">{getPlanCount(PlanType.ENTERPRISE)}</span>
                    </div>
                    <div className="text-sm text-slate-500">$499/mês • Ilimitado</div>
                </div>
            </div>

            {/* Organizations Table */}
            <OrganizationTable
                organizations={organizations}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onChangePlan={handleChangePlan}
                onOpenSetup={handleOpenSetup}
            />

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
        </div>
    );
};
