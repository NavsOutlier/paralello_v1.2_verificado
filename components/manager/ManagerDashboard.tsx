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
import { useOrganizationPlan } from '../../hooks/useOrganizationPlan';

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
        <div className="flex-1 flex flex-col bg-transparent relative z-10">
            {/* Navigation Tabs */}
            <div className="bg-slate-900/40 backdrop-blur-3xl border-b border-white/5 px-8 py-5 shadow-2xl z-20">
                <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner w-fit">
                    <button
                        onClick={() => handleNavigate('overview')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'overview'
                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        VISÃO GERAL
                    </button>
                    {canSeeClients && (
                        <button
                            onClick={() => handleNavigate('clients')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'clients'
                                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            CLIENTES
                        </button>
                    )}
                    {canSeeTeam && (
                        <button
                            onClick={() => handleNavigate('team')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'team'
                                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <UserPlus className="w-4 h-4" />
                            EQUIPE
                        </button>
                    )}
                    <button
                        onClick={() => handleNavigate('settings')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'settings'
                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        NÚCLEO
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'overview' && <OverviewTab
                    onNavigate={handleNavigate as any}
                    canSeeClients={!!canSeeClients}
                    canSeeTeam={!!canSeeTeam}
                    isSuperAdmin={!!isSuperAdmin}
                />}
                {activeTab === 'clients' && canSeeClients && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-8">
                        <ClientManagement />
                    </div>
                )}
                {activeTab === 'team' && canSeeTeam && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-8">
                        <TeamManagement />
                    </div>
                )}
                {activeTab === 'settings' && organizationId && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-8">
                        <SettingsPanel
                            onBack={() => handleNavigate('overview')}
                            organizationId={organizationId}
                            initialTab={settingsInitialTab as any}
                        />
                    </div>
                )}
            </div>
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
    const { plan, loading: planLoading } = useOrganizationPlan();
    const [stats, setStats] = useState({ clients: 0, members: 0, hasWhatsApp: false });
    const [statsLoading, setStatsLoading] = useState(true);

    // Combine loadings or use specific ones depending on section
    const loading = statsLoading || planLoading;

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
            setStatsLoading(true);
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
            setStatsLoading(false);
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
        "☕ Organização nota 10! Seu Blackback está pronto. Só falta o café, mas isso a gente ainda está tentando integrar via USB!"
    ];

    const getWeeklyMessage = () => {
        const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        return engagementMessages[weekIndex % engagementMessages.length];
    };

    return (
        <div className="flex-1 h-full p-8 pb-20 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-700">
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

            <div className="max-w-7xl mx-auto space-y-10">
                <div className="flex flex-col">
                    <h1 className="relative text-4xl font-black text-white tracking-tighter mb-1">
                        {loading ? (
                            <span className="animate-pulse bg-white/10 rounded h-10 w-64 block" />
                        ) : (
                            <>
                                {plan?.id === 'gestor_solo' && 'Painel Gestor Solo'}
                                {plan?.id === 'agencia' && 'Painel Agência'}
                                {plan?.id === 'enterprise' && 'Painel Enterprise'}
                                {(!plan || !['gestor_solo', 'agencia', 'enterprise'].includes(plan.id)) && 'Painel do Gestor'}
                            </>
                        )}
                    </h1>
                    <p className="relative text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] pl-1">
                        Orquestração de ativos e capital humano em tempo real
                    </p>
                </div>

                {/* Onboarding Checklist */}
                {!loading && (
                    <div className="relative bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-3xl group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
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
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Clients Card */}
                    {canSeeClients && (
                        <div
                            onClick={() => onNavigate('clients')}
                            className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-3xl cursor-pointer hover:scale-[1.02] transition-all hover:border-blue-500/30"
                        >
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] mb-2">Engajamento</h2>
                                    <p className="text-2xl font-black text-white">Base de Clientes</p>
                                </div>
                                <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:rotate-12 transition-transform">
                                    <Users className="w-10 h-10" />
                                </div>
                            </div>
                            <div className="flex items-end gap-3">
                                <span className="text-5xl font-black text-white tracking-tighter">
                                    {loading ? <Loader2 className="w-10 h-10 animate-spin text-slate-700" /> : stats.clients}
                                </span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Ativos no Sistema</span>
                            </div>
                        </div>
                    )}

                    {/* Team Card */}
                    {canSeeTeam && (
                        <div
                            onClick={() => onNavigate('team')}
                            className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-3xl cursor-pointer hover:scale-[1.02] transition-all hover:border-violet-500/30"
                        >
                            <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-xs font-black text-violet-400 uppercase tracking-[0.3em] mb-2">Capital Humano</h2>
                                    <p className="text-2xl font-black text-white">Equipe Interna</p>
                                </div>
                                <div className="p-4 bg-violet-500/10 text-violet-400 rounded-2xl group-hover:rotate-12 transition-transform">
                                    <UserPlus className="w-10 h-10" />
                                </div>
                            </div>
                            <div className="flex items-end gap-3">
                                <span className="text-5xl font-black text-white tracking-tighter">
                                    {loading ? <Loader2 className="w-10 h-10 animate-spin text-slate-700" /> : stats.members}
                                </span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Membros Integrados</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-3xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Protocolos Rápidos</h3>
                            <p className="text-lg font-black text-white">Ações Inteligentes</p>
                        </div>
                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">ORDENADO POR USO</span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {sortedActions.map((action) => (
                            <button
                                key={action.id}
                                onClick={() => {
                                    trackAction(action.id);
                                    onNavigate(action.targetTab as any, action.subTab);
                                }}
                                className={`flex items-center gap-3 px-6 py-3.5 ${action.color.replace('bg-', 'bg-')}/10 border border-white/5 rounded-2xl transition-all hover:bg-white/5 group shadow-lg active:scale-95`}
                            >
                                <action.icon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{action.label}</span>
                                {usageStats[action.id] > 0 && (
                                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-[8px] font-black text-slate-100">
                                        {usageStats[action.id]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Engagement / Productivity Card */}
                {!showWizard && !loading && (
                    <div className="relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 animate-pulse rounded-[3rem]" />
                        <div className="relative p-10 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-3xl flex flex-col md:flex-row items-center gap-8">
                            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transform group-hover:rotate-12 transition-all duration-500 border border-white/20">
                                <Sparkles className="w-10 h-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase italic">Status: Modo Lendário Ativado! 🥂</h3>
                                <p className="text-slate-400 font-bold leading-relaxed italic text-sm">
                                    "{getWeeklyMessage()}"
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="px-5 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black tracking-[0.2em] shadow-[0_0_20px_rgba(52,211,153,0.1)]">
                                    SISTEMA 100% OPERACIONAL
                                </div>
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Latência: 24ms</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

