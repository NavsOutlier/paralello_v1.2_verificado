import React, { useState, useEffect } from 'react';
import { ClientManagement } from './ClientManagement';
import { TeamManagement } from './TeamManagement';
import { SettingsPanel } from '../../views/SettingsPanel';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, UserPlus, LayoutDashboard, Loader2, Settings, MessageSquare, Sparkles, ShieldCheck } from 'lucide-react';
import { OnboardingChecklist } from './OnboardingChecklist';
import { OnboardingWizard } from './OnboardingWizard';
import { Badge } from '../ui';

type Tab = 'overview' | 'clients' | 'team' | 'settings';

export const ManagerDashboard: React.FC = () => {
    const { isSuperAdmin, permissions, organizationId } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);

    const handleNavigate = (tab: Tab, subTab?: string) => {
        setSettingsInitialTab(subTab);
        setActiveTab(tab);
    };

    const canSeeClients = isSuperAdmin || permissions?.can_manage_clients;
    const canSeeTeam = isSuperAdmin || permissions?.can_manage_team;

    return (
        <div className="flex-1 flex flex-col bg-slate-50">
            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200">
                <div className="flex gap-1 p-4">
                    <button
                        onClick={() => handleNavigate('overview')}
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
                            onClick={() => handleNavigate('clients')}
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
                            onClick={() => handleNavigate('team')}
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
                        onClick={() => handleNavigate('settings')}
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
            {activeTab === 'overview' && <OverviewTab
                onNavigate={handleNavigate as any}
                canSeeClients={!!canSeeClients}
                canSeeTeam={!!canSeeTeam}
                isSuperAdmin={!!isSuperAdmin}
            />}
            {activeTab === 'clients' && canSeeClients && <ClientManagement />}
            {activeTab === 'team' && canSeeTeam && <TeamManagement />}
            {activeTab === 'settings' && organizationId && (
                <SettingsPanel
                    onBack={() => handleNavigate('overview')}
                    organizationId={organizationId}
                    initialTab={settingsInitialTab as any}
                />
            )}
        </div>
    );
};

interface OverviewTabProps {
    onNavigate: (tab: Tab, subTab?: string) => void;
    canSeeClients: boolean;
    canSeeTeam: boolean;
    isSuperAdmin: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigate, canSeeClients, canSeeTeam, isSuperAdmin }) => {
    const { organizationId } = useAuth();
    const [stats, setStats] = useState({ clients: 0, members: 0, hasWhatsApp: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!organizationId) return;

        // Fetch initial stats
        fetchStats();

        // Realtime subscription to keep stats updated
        const statsChannel = supabase
            .channel('dashboard-stats')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'instances',
                filter: `organization_id=eq.${organizationId}`
            }, () => fetchStats())
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'clients',
                filter: `organization_id=eq.${organizationId}`
            }, () => fetchStats())
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'team_members',
                filter: `organization_id=eq.${organizationId}`
            }, () => fetchStats())
            .subscribe();

        return () => {
            supabase.removeChannel(statsChannel);
        };
    }, [organizationId]);

    const fetchStats = async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const [clientsRes, membersRes, whatsappRes] = await Promise.all([
                supabase
                    .from('clients')
                    .select('id', { count: 'exact', head: true })
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null),
                supabase
                    .from('team_members')
                    .select('id', { count: 'exact', head: true })
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null),
                supabase
                    .from('instances')
                    .select('id')
                    .eq('organization_id', organizationId)
                    .in('status', ['connected', 'conectado'])
                    .limit(1)
            ]);

            setStats({
                clients: clientsRes.count || 0,
                members: membersRes.count || 0,
                hasWhatsApp: (whatsappRes.data && whatsappRes.data.length > 0) || false
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const [showWizard, setShowWizard] = useState(false);
    const [hasDismissedWizard, setHasDismissedWizard] = useState(false);
    const [usageStats, setUsageStats] = useState<Record<string, number>>({});

    const trackAction = async (actionId: string) => {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return;

        try {
            const currentCount = usageStats[actionId] || 0;
            const { error } = await supabase
                .from('usage_stats')
                .upsert({
                    profile_id: userId,
                    action_id: actionId,
                    count: currentCount + 1,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'profile_id,action_id' });

            if (!error) {
                setUsageStats(prev => ({ ...prev, [actionId]: currentCount + 1 }));
            }
        } catch (error) {
            console.error('Error tracking action:', error);
        }
    };

    const fetchUsageStats = async () => {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('usage_stats')
                .select('action_id, count')
                .eq('profile_id', userId);

            if (error) throw error;
            const statsMap = (data || []).reduce((acc: any, curr: any) => {
                acc[curr.action_id] = curr.count;
                return acc;
            }, {});
            setUsageStats(statsMap);
        } catch (error) {
            console.error('Error fetching usage stats:', error);
        }
    };

    useEffect(() => {
        if (organizationId) {
            fetchUsageStats();
        }
    }, [organizationId]);

    const quickActions = [
        { id: 'whatsapp', label: 'Configurar WhatsApp', icon: MessageSquare, color: 'bg-emerald-600', hover: 'hover:bg-emerald-700', canSee: true, targetTab: 'settings', subTab: 'whatsapp' },
        { id: 'settings', label: 'Perfil da Organização', icon: Settings, color: 'bg-slate-600', hover: 'hover:bg-slate-700', canSee: true, targetTab: 'settings', subTab: 'info' },
        { id: 'security', label: 'Segurança & RLS', icon: ShieldCheck, color: 'bg-indigo-600', hover: 'hover:bg-indigo-700', canSee: isSuperAdmin, targetTab: 'settings', subTab: 'security' }
    ];

    const sortedActions = [...quickActions]
        .filter(a => a.canSee)
        .sort((a, b) => (usageStats[b.id] || 0) - (usageStats[a.id] || 0));

    // We no longer auto-show the wizard to let users see the dashboard first
    /*
    useEffect(() => {
        if (!loading && !hasDismissedWizard) {
            // Show wizard if haven't connected WhatsApp OR have no clients OR no team members invited
            const isIncomplete = !stats.hasWhatsApp || stats.clients === 0 || stats.members <= 1;
            setShowWizard(isIncomplete);
        }
    }, [loading, stats.hasWhatsApp, stats.clients, hasDismissedWizard, stats.members]);
    */

    const engagementMessages = [
        "🚀 Integração concluída! Agora você é oficialmente o Capitão do Navio. Só não deixe ele bater no iceberg dos prazos!",
        "📱 Tudo pronto! Seu WhatsApp está tão conectado que se bobear ele responde até sua sogra por engano. Brincadeira... ou não!",
        "⚡ Configuração finalizada! Agora você tem superpoderes de gestão! Use-os com sabedoria, ou use para impressionar seus clientes.",
        "🎯 Onboarding feito! Você configurou tudo tão rápido que o sistema ainda está no vácuo. Relaxa e aproveita o dashboard!",
        "🏎️ Parabéns! Sua agência agora está no modo Turbo. Tira o pé do freio e vamos escalar esses resultados!",
        "🏆 Fim do setup! Se a eficiência fosse esporte, você já estaria no pódio assistindo aos outros começarem.",
        "☕ Organização nota 10! Seu Paralello está pronto. Só falta o café, mas isso a gente ainda está tentando integrar via USB!"
    ];

    const getWeeklyMessage = () => {
        const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        return engagementMessages[weekIndex % engagementMessages.length];
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto">
            {/* Onboarding Wizard Overlay */}
            {showWizard && (
                <OnboardingWizard
                    stats={stats}
                    onComplete={() => {
                        setShowWizard(false);
                        setHasDismissedWizard(true);
                    }}
                />
            )}

            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Painel do Gestor</h1>
                <p className="text-slate-600 mb-8">
                    Gerencie os ativos e a equipe da sua organização em tempo real.
                </p>

                {/* Onboarding Checklist - Only show if not loading */}
                {!loading && (
                    <OnboardingChecklist
                        stats={stats}
                        onNavigate={(tab) => {
                            if (tab === 'open_wizard') {
                                setShowWizard(true);
                            } else {
                                onNavigate(tab);
                            }
                        }}
                    />
                )}

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
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Ações Inteligentes</h3>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Ordenado por uso</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {sortedActions.map((action) => (
                            <button
                                key={action.id}
                                onClick={() => {
                                    trackAction(action.id);
                                    onNavigate(action.targetTab as any, action.subTab);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 ${action.color} ${action.hover} text-white rounded-lg transition-all shadow-sm active:scale-95`}
                            >
                                <action.icon className="w-4 h-4" />
                                {action.label}
                                {usageStats[action.id] > 0 && (
                                    <span className="ml-1 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-black">
                                        {usageStats[action.id]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Engagement / Productivity Card */}
                {!showWizard && !loading && (
                    <div className="mt-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 animate-pulse" />
                        <div className="relative p-8 bg-white border-2 border-indigo-50 rounded-3xl shadow-xl shadow-indigo-100/20 flex flex-col md:flex-row items-center gap-6">
                            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg transform group-hover:rotate-6 transition-transform">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Status: Modo Lendário Ativado! 🥂</h3>
                                <p className="text-slate-600 font-medium leading-relaxed italic">
                                    "{getWeeklyMessage()}"
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black">100% CONFIGURADO</Badge>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
