import React from 'react';
import {
    FileText,
    ExternalLink,
    CheckCircle2,
    Clock,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import { Invoice, PAYMENT_STATUS_LABELS } from '../../types/billing';

interface InvoiceListProps {
    className?: string;
    limit?: number;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ className = '', limit }) => {
    const { invoices, loading } = useBilling();

    const displayInvoices = limit ? invoices.slice(0, limit) : invoices;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getStatusIcon = (status: Invoice['status']) => {
        switch (status) {
            case 'confirmed':
                return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-amber-400" />;
            case 'overdue':
                return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'refunded':
                return <RefreshCw className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusColor = (status: Invoice['status']) => {
        switch (status) {
            case 'confirmed':
                return 'text-emerald-400 bg-emerald-500/10';
            case 'pending':
                return 'text-amber-400 bg-amber-500/10';
            case 'overdue':
                return 'text-red-400 bg-red-500/10';
            case 'refunded':
                return 'text-slate-400 bg-slate-500/10';
        }
    };

    if (loading) {
        return (
            <div className={`bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 ${className}`}>
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-700/50 rounded w-1/4" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-700/50 rounded" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800/50 rounded-xl">
                        <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Histórico de Faturas</h3>
                        <p className="text-sm text-slate-400">
                            {invoices.length} {invoices.length === 1 ? 'fatura' : 'faturas'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Lista */}
            <div className="divide-y divide-white/5">
                {displayInvoices.length === 0 ? (
                    <div className="p-8 text-center">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Nenhuma fatura encontrada</p>
                    </div>
                ) : (
                    displayInvoices.map((invoice) => (
                        <div
                            key={invoice.id}
                            className="p-4 hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {getStatusIcon(invoice.status)}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white">
                                                {formatCurrency(invoice.amount)}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                                                {PAYMENT_STATUS_LABELS[invoice.status]}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                                            <span>Vencimento: {formatDate(invoice.due_date)}</span>
                                            {invoice.paid_at && (
                                                <span>• Pago em: {formatDate(invoice.paid_at)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {invoice.asaas_invoice_url && (
                                        <a
                                            href={invoice.asaas_invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
                                            title="Ver fatura"
                                        >
                                            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white" />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Detalhes expandidos para faturas pendentes/vencidas */}
                            {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                                <div className="mt-4 flex gap-2">
                                    {invoice.asaas_boleto_url && (
                                        <a
                                            href={invoice.asaas_boleto_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-sm text-white transition-colors"
                                        >
                                            📄 Boleto
                                        </a>
                                    )}
                                    {invoice.asaas_pix_code && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(invoice.asaas_pix_code || '');
                                                // TODO: Mostrar toast de sucesso
                                            }}
                                            className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-sm text-white transition-colors"
                                        >
                                            📱 Copiar PIX
                                        </button>
                                    )}
                                    {invoice.asaas_invoice_url && (
                                        <a
                                            href={invoice.asaas_invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-sm text-emerald-400 transition-colors"
                                        >
                                            💳 Pagar com Cartão
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer com link para ver mais */}
            {limit && invoices.length > limit && (
                <div className="p-4 border-t border-white/5">
                    <button className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors">
                        Ver todas as {invoices.length} faturas
                    </button>
                </div>
            )}
        </div>
    );
};
