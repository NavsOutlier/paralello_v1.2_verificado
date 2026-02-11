import React, { useState } from 'react';
import {
    DollarSign,
    TrendingUp,
    Users,
    AlertTriangle,
    Clock,
    Ban,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import { useSuperAdminBilling } from '../../hooks/useSuperAdminBilling';
import { MetricsCard } from './MetricsCard';
import {
    PLAN_LABELS,
    BILLING_STATUS_LABELS,
    BillingStatus
} from '../../types/billing';

export const BillingDashboard: React.FC = () => {
    const {
        metrics,
        overdueInvoices,
        subscriptions, // Add this
        loading,
        refreshData,
    } = useSuperAdminBilling();

    const [expandedSection, setExpandedSection] = useState<'overdue' | 'trials' | null>('overdue');

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-28 bg-slate-800/50 rounded-2xl animate-pulse" />
                    ))}
                </div>
                <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Billing Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1">Gerenciamento de assinaturas e cobranças</p>
                </div>
                <button
                    onClick={refreshData}
                    className="flex items-center gap-2 px-6 py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all shadow-lg shadow-black/20"
                >
                    <RefreshCw className="w-4 h-4" />
                    RECALCULAR MÉTRICAS
                </button>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricsCard
                    title="MRR"
                    value={formatCurrency(metrics.totalMRR)}
                    icon={DollarSign}
                    color="bg-emerald-500"
                    subtitle="Receita mensal recorrente"
                />
                <MetricsCard
                    title="Assinantes Ativos"
                    value={metrics.activeSubscriptions}
                    icon={TrendingUp}
                    color="bg-blue-500"
                />
                <MetricsCard
                    title="Em Trial"
                    value={metrics.trialingCount}
                    icon={Clock}
                    color="bg-amber-500"
                />
                <MetricsCard
                    title="Inadimplentes"
                    value={metrics.pastDueCount + metrics.suspendedCount}
                    icon={AlertTriangle}
                    color="bg-red-500"
                    subtitle={metrics.suspendedCount > 0 ? `${metrics.suspendedCount} suspensos` : undefined}
                />
            </div>

            {/* Distribuição por Plano */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Distribuição por Plano
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    {(['gestor_solo', 'agencia', 'enterprise'] as const).map((plan) => (
                        <div key={plan} className="bg-slate-800/30 rounded-xl p-4 text-center">
                            <p className="text-3xl font-black text-white">
                                {metrics.planDistribution[plan]}
                            </p>
                            <p className="text-sm text-slate-400 mt-1">{PLAN_LABELS[plan]}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Faturas Vencidas */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'overdue' ? null : 'overdue')}
                    className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-white">Faturas Vencidas</h3>
                            <p className="text-sm text-slate-400">{overdueInvoices.length} faturas pendentes</p>
                        </div>
                    </div>
                    {expandedSection === 'overdue' ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </button>

                {expandedSection === 'overdue' && overdueInvoices.length > 0 && (
                    <div className="border-t border-white/5 divide-y divide-white/5">
                        {overdueInvoices.map((invoice) => (
                            <div key={invoice.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-white">{invoice.organization_name}</p>
                                    <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                        <span>{formatCurrency(invoice.amount)}</span>
                                        <span>•</span>
                                        <span>Venceu em {formatDate(invoice.due_date)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {invoice.asaas_invoice_url && (
                                        <a
                                            href={invoice.asaas_invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4 text-slate-500" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Trials em Andamento (Novo) */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'trials' ? null : 'trials')}
                    className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-xl">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-white">Monitor de Trials (Garantia 30 dias)</h3>
                            <p className="text-sm text-slate-400">
                                {metrics.trialingCount} clientes em período de garantia
                            </p>
                        </div>
                    </div>
                    {expandedSection === 'trials' ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </button>

                {expandedSection === 'trials' && (
                    <div className="border-t border-white/5 divide-y divide-white/5">
                        {subscriptions
                            .filter(sub => sub.status === 'trialing')
                            .sort((a, b) => {
                                const dateA = a.trial_ends_at ? new Date(a.trial_ends_at).getTime() : 0;
                                const dateB = b.trial_ends_at ? new Date(b.trial_ends_at).getTime() : 0;
                                return dateA - dateB; // Ordem crescente (quem acaba antes primeiro)
                            })
                            .map((sub) => {
                                const daysLeft = sub.trial_ends_at
                                    ? Math.ceil((new Date(sub.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    : 0;
                                const isUrgent = daysLeft <= 7;

                                return (
                                    <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                                        <div>
                                            <p className="font-medium text-white">{sub.organization_name}</p>
                                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                                <span>{sub.organization_email}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                <span>{PLAN_LABELS[sub.plan as keyof typeof PLAN_LABELS]}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isUrgent
                                                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Expirado'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        {metrics.trialingCount === 0 && (
                            <div className="p-8 text-center text-slate-500">
                                Nenhum cliente em período de trial no momento.
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
};
