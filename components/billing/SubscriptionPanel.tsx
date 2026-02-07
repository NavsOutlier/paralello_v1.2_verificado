import React from 'react';
import {
    CreditCard,
    Calendar,
    TrendingUp,
    AlertTriangle,
    Crown,
    Building,
    User,
    MessageCircle
} from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import {
    BillingPlan,
    PLAN_LABELS,
    BILLING_STATUS_LABELS,
} from '../../types/billing';

interface SubscriptionPanelProps {
    className?: string;
}

// Número de WhatsApp do suporte (ajustar conforme necessário)
const SUPPORT_WHATSAPP = '5535999713729';
const SUPPORT_MESSAGE = 'Olá! Gostaria de alterar meu plano de assinatura do Paralello.';

export const SubscriptionPanel: React.FC<SubscriptionPanelProps> = ({ className = '' }) => {
    const { subscription, loading } = useBilling();

    if (loading) {
        return (
            <div className={`bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 ${className}`}>
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-700/50 rounded w-1/3" />
                    <div className="h-12 bg-slate-700/50 rounded w-1/2" />
                    <div className="h-4 bg-slate-700/50 rounded w-2/3" />
                </div>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className={`bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 ${className}`}>
                <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-slate-400">Nenhuma assinatura encontrada</p>
                </div>
            </div>
        );
    }

    const isTrialing = subscription.status === 'trialing';
    const isPastDue = subscription.status === 'past_due' || subscription.status === 'suspended';
    const trialDaysLeft = subscription.trial_ends_at
        ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getPlanIcon = (plan: BillingPlan) => {
        switch (plan) {
            case 'enterprise': return Crown;
            case 'agencia': return Building;
            default: return User;
        }
    };

    const handleContactSupport = () => {
        const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(SUPPORT_MESSAGE)}`;
        window.open(url, '_blank');
    };

    const orgData = (subscription as any).organizations;
    const PlanIcon = getPlanIcon(orgData?.plan);

    return (
        <div className={`bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden ${className}`}>
            {/* Header com status */}
            <div className="relative p-6 border-b border-white/5">
                {isPastDue && (
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent" />
                )}
                {isTrialing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent" />
                )}

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isPastDue ? 'bg-red-500/20' : isTrialing ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                            }`}>
                            <PlanIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">
                                {PLAN_LABELS[orgData?.plan as BillingPlan]}
                            </h3>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isPastDue ? 'text-red-400' : isTrialing ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                {BILLING_STATUS_LABELS[subscription.status]}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleContactSupport}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-sm font-medium text-emerald-400 transition-all"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Alterar Plano
                    </button>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
                {/* Trial warning */}
                {isTrialing && trialDaysLeft > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-amber-200">
                                Período de teste: {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'} restantes
                            </p>
                            <p className="text-xs text-amber-300/70 mt-0.5">
                                Após o trial, sua assinatura será cobrada automaticamente.
                            </p>
                        </div>
                    </div>
                )}

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
                            <CreditCard className="w-4 h-4" />
                            Valor Mensal
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {formatCurrency(orgData?.billing_value || 0)}
                        </p>
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
                            <TrendingUp className="w-4 h-4" />
                            Clientes Ativos
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {orgData?.contracted_clients || 0}
                        </p>
                    </div>
                </div>

                {/* Próxima cobrança */}
                <div className="flex items-center justify-between py-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-slate-500" />
                        <div>
                            <p className="text-sm text-slate-400">Próxima cobrança</p>
                            <p className="text-white font-medium">
                                {formatDate(subscription.current_period_end)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Período atual</p>
                        <p className="text-white font-medium">
                            {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                        </p>
                    </div>
                </div>

                {/* Info de suporte */}
                <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl">
                    <MessageCircle className="w-5 h-5 text-slate-500" />
                    <p className="text-sm text-slate-400">
                        Para alterar seu plano ou tirar dúvidas, fale com nosso suporte.
                    </p>
                </div>
            </div>
        </div>
    );
};
