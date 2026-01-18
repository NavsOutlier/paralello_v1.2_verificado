import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
    Zap, Send, BarChart3, Sparkles, ListChecks, ChevronRight, Settings
} from 'lucide-react';

// Import automation components
import { ScheduledDispatchList } from './ScheduledDispatchList';
import { ReportList } from './ReportList';
import { ActiveSuggestionQueue } from './ActiveSuggestionQueue';

type AutomationSection = 'dispatches' | 'reports' | 'active' | 'task-reports';

interface AutomationTabProps {
    clientId: string;
    clientName: string;
}

export const AutomationTab: React.FC<AutomationTabProps> = ({
    clientId,
    clientName
}) => {
    const [activeSection, setActiveSection] = useState<AutomationSection>('dispatches');
    const [counts, setCounts] = useState({
        dispatches: 0,
        reports: 0,
        active: 0,
        taskReports: 0
    });

    const { organizationId } = useOrganization();

    // Fetch counts for badges
    useEffect(() => {
        const fetchCounts = async () => {
            if (!organizationId || !clientId) return;

            const [dispatchRes, reportRes, activeRes] = await Promise.all([
                supabase
                    .from('scheduled_messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', clientId)
                    .eq('status', 'pending'),
                supabase
                    .from('scheduled_reports')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', clientId)
                    .eq('is_active', true),
                supabase
                    .from('active_suggestions')
                    .select('id', { count: 'exact', head: true })
                    .eq('client_id', clientId)
                    .eq('status', 'pending')
            ]);

            setCounts({
                dispatches: dispatchRes.count || 0,
                reports: reportRes.count || 0,
                active: activeRes.count || 0,
                taskReports: 0
            });
        };

        fetchCounts();
    }, [organizationId, clientId]);

    const sections = [
        {
            id: 'dispatches' as const,
            label: 'Disparos',
            icon: Send,
            color: 'indigo',
            count: counts.dispatches,
            description: 'Mensagens agendadas'
        },
        {
            id: 'reports' as const,
            label: 'Relatórios',
            icon: BarChart3,
            color: 'emerald',
            count: counts.reports,
            description: 'Resumos automáticos'
        },
        {
            id: 'active' as const,
            label: 'Active',
            icon: Sparkles,
            color: 'purple',
            count: counts.active,
            description: 'Sugestões com IA',
            badge: counts.active > 0 ? 'Pendente' : undefined
        },
        {
            id: 'task-reports' as const,
            label: 'Task Report',
            icon: ListChecks,
            color: 'blue',
            count: counts.taskReports,
            description: 'Atualizações de tarefas'
        }
    ];

    const getColorClasses = (color: string, isActive: boolean) => {
        const colors: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
            indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-500', activeBg: 'bg-indigo-100' },
            emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-500', activeBg: 'bg-emerald-100' },
            purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-500', activeBg: 'bg-purple-100' },
            blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500', activeBg: 'bg-blue-100' }
        };
        return colors[color] || colors.indigo;
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800">Automações</h2>
                        <p className="text-xs text-slate-500">{clientName}</p>
                    </div>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="bg-white border-b border-slate-200 px-4 py-3">
                <div className="flex gap-2 overflow-x-auto">
                    {sections.map(section => {
                        const isActive = activeSection === section.id;
                        const colorClasses = getColorClasses(section.color, isActive);
                        const Icon = section.icon;

                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${isActive
                                        ? `${colorClasses.activeBg} ${colorClasses.text} border-2 ${colorClasses.border}`
                                        : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="text-sm font-bold">{section.label}</span>
                                {section.badge && (
                                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[9px] font-bold">
                                        {section.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeSection === 'dispatches' && (
                    <ScheduledDispatchList clientId={clientId} clientName={clientName} />
                )}
                {activeSection === 'reports' && (
                    <ReportList clientId={clientId} clientName={clientName} />
                )}
                {activeSection === 'active' && (
                    <div className="space-y-6">
                        <ActiveSuggestionQueue clientId={clientId} />
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                            <p className="text-xs text-purple-700">
                                Configure automações Active no painel de configurações do cliente.
                            </p>
                        </div>
                    </div>
                )}
                {activeSection === 'task-reports' && (
                    <div className="bg-slate-50 rounded-xl p-8 text-center">
                        <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">
                            Relatórios de tarefas são gerados automaticamente ao mudar o status de uma task.
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                            Histórico de atualizações aparecerá aqui.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutomationTab;
