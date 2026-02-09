import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Loader2, CreditCard, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui';
import { useToast } from '../../contexts/ToastContext';

interface PaymentPendingModalProps {
    isOpen: boolean;
    pendingPaymentId: string;
    paymentUrl: string;
    orgName: string;
    amount: number;
    onClose: () => void;
    onConfirmed: () => void;
}

export const PaymentPendingModal: React.FC<PaymentPendingModalProps> = ({
    isOpen,
    pendingPaymentId,
    paymentUrl,
    orgName,
    amount,
    onClose,
    onConfirmed
}) => {
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);
    const [status, setStatus] = useState<'pending' | 'confirmed' | 'canceled'>('pending');
    const [canceling, setCanceling] = useState(false);

    // Subscribe to realtime changes
    useEffect(() => {
        if (!isOpen || !pendingPaymentId) return;

        const channel = supabase
            .channel(`pending_payment_${pendingPaymentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pending_payments',
                    filter: `id=eq.${pendingPaymentId}`
                },
                (payload) => {
                    const newStatus = payload.new.status;
                    setStatus(newStatus);

                    if (newStatus === 'confirmed') {
                        showToast('Pagamento confirmado!', 'success');
                        onConfirmed();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, pendingPaymentId, onConfirmed, showToast]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(paymentUrl);
            setCopied(true);
            showToast('Link copiado!', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            showToast('Erro ao copiar', 'error');
        }
    };

    const handleCancel = async () => {
        setCanceling(true);
        try {
            // Cancel the pending payment
            const { error } = await supabase
                .from('pending_payments')
                .update({ status: 'canceled' })
                .eq('id', pendingPaymentId);

            if (error) throw error;

            showToast('Pagamento cancelado', 'info');
            onClose();
        } catch (err) {
            console.error('Error canceling payment:', err);
            showToast('Erro ao cancelar', 'error');
        } finally {
            setCanceling(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (!isOpen) return null;

    if (status === 'confirmed') {
        return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[60]">
                <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="p-12 flex flex-col items-center text-center space-y-6">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce-subtle">
                            <Check className="w-12 h-12 text-emerald-400" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white">Pagamento Confirmado!</h2>
                            <p className="text-slate-400">
                                A organização <strong>{orgName}</strong> foi criada com sucesso e já está pronta para uso.
                            </p>
                        </div>

                        <div className="w-full pt-4">
                            <Button
                                type="button"
                                variant="primary"
                                onClick={onConfirmed}
                                className="w-full py-6 text-lg font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/20"
                            >
                                Acessar Painel
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[60]">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-orange-500/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-xl">
                            <CreditCard className="w-5 h-5 text-amber-400" />
                        </div>
                        <h2 className="text-lg font-black text-white">Aguardando Pagamento</h2>
                    </div>
                    <button
                        onClick={handleCancel}
                        disabled={canceling}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status Indicator */}
                    <div className="flex flex-col items-center py-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center border-2 border-amber-500/30">
                                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mt-4 text-center px-8">
                            Aguardando confirmação do pagamento... Isso pode levar alguns minutos.
                        </p>
                    </div>

                    {/* Order Summary */}
                    <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Organização</span>
                            <span className="text-sm font-bold text-white">{orgName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Valor</span>
                            <span className="text-lg font-black text-emerald-400">{formatCurrency(amount)}</span>
                        </div>
                    </div>

                    {/* Payment Link */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                            Link de Pagamento
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={paymentUrl}
                                readOnly
                                className="flex-1 px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-300 font-mono truncate"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleCopy}
                                className="px-4 bg-white/5 border-white/10"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => window.open(paymentUrl, '_blank')}
                                className="px-4 bg-white/5 border-white/10"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-400 uppercase tracking-wider">Atenção</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Se você fechar esta janela antes do pagamento ser confirmado,
                                a organização <strong>não será criada</strong>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancel}
                        disabled={canceling}
                        className="w-full bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-2xl py-4"
                    >
                        {canceling ? 'Cancelando...' : 'Cancelar e Fechar'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
