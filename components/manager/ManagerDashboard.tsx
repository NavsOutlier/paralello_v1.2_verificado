import React, { useState, useEffect } from 'react';
import { ClientManagement } from './ClientManagement';
import { TeamManagement } from './TeamManagement';
import { SettingsPanel } from '../../views/SettingsPanel';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, UserPlus, LayoutDashboard, Loader2, Settings } from 'lucide-react';

type Tab = 'overview' | 'clients' | 'team' | 'settings';

export const ManagerDashboard: React.FC = () => {
    const { isSuperAdmin, permissions, organizationId } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const canSeeClients = isSuperAdmin || permissions?.can_manage_clients;
    const canSeeTeam = isSuperAdmin || permissions?.can_manage_team;

    return (
        <div className="flex-1 flex flex-col bg-slate-50">
            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200">
                <div className="flex gap-1 p-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'overview'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Visão Geral
                    </button>
                    {canSeeClients && (
                        <button
                            onClick={() => setActiveTab('clients')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'clients'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Clientes
                        </button>
                    )}
                    {canSeeTeam && (
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'team'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <UserPlus className="w-4 h-4" />
                            Equipe
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'settings'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        Configurações
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} canSeeClients={!!canSeeClients} canSeeTeam={!!canSeeTeam} />}
            {activeTab === 'clients' && canSeeClients && <ClientManagement />}
            {activeTab === 'team' && canSeeTeam && <TeamManagement />}
            {activeTab === 'settings' && organizationId && (
                <SettingsPanel
                    onBack={() => setActiveTab('overview')}
                    organizationId={organizationId}
                />
            )}
        </div>
    );
};

interface OverviewTabProps {
    onNavigate: (tab: Tab) => void;
    canSeeClients: boolean;
    canSeeTeam: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigate, canSeeClients, canSeeTeam }) => {
    const { organizationId } = useAuth();
    const [stats, setStats] = useState({ clients: 0, members: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (organizationId) {
            fetchStats();
        }
    }, [organizationId]);

    const fetchStats = async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const [clientsRes, membersRes] = await Promise.all([
                supabase
                    .from('clients')
                    .select('id', { count: 'exact', head: true })
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null),
                supabase
                    .from('team_members')
                    .select('id', { count: 'exact', head: true })
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null)
            ]);

            setStats({
                clients: clientsRes.count || 0,
                members: membersRes.count || 0
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Painel do Gestor</h1>
                <p className="text-slate-600 mb-8">
                    Gerencie os ativos e a equipe da sua organização em tempo real.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Clients Card */}
                    {canSeeClients && (
                        <div
                            onClick={() => onNavigate('clients')}
                            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">Clientes</h2>
                                    <p className="text-blue-100">Base de clientes ativa</p>
                                </div>
                                <div className="p-3 bg-white/20 rounded-lg">
                                    <Users className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="flex items-end gap-2 text-4xl font-bold">
                                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : stats.clients}
                                <span className="text-lg font-normal text-blue-100">cadastrados</span>
                            </div>
                        </div>
                    )}

                    {/* Team Card */}
                    {canSeeTeam && (
                        <div
                            onClick={() => onNavigate('team')}
                            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">Equipe</h2>
                                    <p className="text-purple-100">Membros colaboradores</p>
                                </div>
                                <div className="p-3 bg-white/20 rounded-lg">
                                    <UserPlus className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="flex items-end gap-2 text-4xl font-bold">
                                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : stats.members}
                                <span className="text-lg font-normal text-purple-100">membros</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="mt-8 bg-white rounded-xl shadow-md p-6 border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Ações Rápidas</h3>
                    <div className="flex flex-wrap gap-3">
                        {canSeeClients && (
                            <button
                                onClick={() => onNavigate('clients')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Users className="w-4 h-4" />
                                Gerenciar Clientes
                            </button>
                        )}
                        {canSeeTeam && (
                            <button
                                onClick={() => onNavigate('team')}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                Gerenciar Equipe
                            </button>
                        )}
                    </div>
                </div>

                {/* Productivity Hint */}
                <div className="mt-6 p-4 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full text-blue-600">
                        <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-slate-700">
                        <strong>Dica:</strong> Navegue pelas abas superiores para acessar ferramentas específicas de gestão e controle de permissões.
                    </p>
                </div>
            </div>
        </div>
    );
};
