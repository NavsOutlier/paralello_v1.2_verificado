import React from 'react';
import { SubscriptionPanel } from '../billing/SubscriptionPanel';
import { InvoiceList } from '../billing/InvoiceList';

/**
 * Página de configurações de Billing para o Owner da organização.
 * Exibe status da assinatura, faturas e opções de pagamento.
 */
export const BillingSettings: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-white">Assinatura e Pagamentos</h2>
                <p className="text-slate-400 text-sm mt-1">
                    Gerencie sua assinatura, visualize faturas e atualize método de pagamento
                </p>
            </div>

            {/* Subscription Panel */}
            <SubscriptionPanel />

            {/* Invoice List */}
            <InvoiceList />
        </div>
    );
};
