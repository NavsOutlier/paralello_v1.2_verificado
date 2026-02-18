import React, { useState, useEffect } from 'react';
import { X, User, Building, Crown, Check, RefreshCw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Organization, PlanType } from '../../types';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui';
import { PaymentPendingModal } from './PaymentPendingModal';

interface OrganizationModalProps {
    organization?: Organization | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Organization>) => Promise<void>;
}

interface PlanConfig {
    id: string;
    name: string;
    price_base: number;
    price_per_client: number;
    max_users: number;
    trial_days: number;
    features: string[];
    modules: string[];
    is_active: boolean;
}

// Fallback plans if database not available
const FALLBACK_PLANS: PlanConfig[] = [
    { id: 'gestor_solo', name: 'Gestor Solo', price_base: 397, price_per_client: 0, max_users: 1, trial_days: 7, features: [], modules: ['dash', 'workspace', 'kanban'], is_active: true },
    { id: 'agencia', name: 'Agência', price_base: 97, price_per_client: 7, max_users: 10, trial_days: 7, features: [], modules: ['dash', 'workspace', 'kanban', 'marketing', 'automation'], is_active: true },
    { id: 'enterprise', name: 'Enterprise', price_base: 297, price_per_client: 5, max_users: 999999, trial_days: 14, features: [], modules: ['dash', 'workspace', 'kanban', 'marketing', 'automation', 'workers_ia', 'manager'], is_active: true },
];

export const OrganizationModal: React.FC<OrganizationModalProps> = ({
    organization,
    isOpen,
    onClose,
    onSave
}) => {
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [plan, setPlan] = useState<PlanType>(PlanType.AGENCIA);
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [billingDocument, setBillingDocument] = useState('');
    const [billingEmail, setBillingEmail] = useState('');
    const [billingPhone, setBillingPhone] = useState('');
    const [maxUsers, setMaxUsers] = useState<number | ''>(10);
    const [contractedClients, setContractedClients] = useState<number | ''>(10);
    const [activateBilling, setActivateBilling] = useState(false);
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<PlanConfig[]>(FALLBACK_PLANS);
    const [loadingPlans, setLoadingPlans] = useState(true);

    // Payment pending state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingPaymentId, setPendingPaymentId] = useState('');
    const [paymentUrl, setPaymentUrl] = useState('');


    // Calcula valor mensal baseado no plano e clientes contratados
    const calculateTotalValue = () => {
        const selectedPlan = plans.find(p => p.id === plan);
        if (!selectedPlan) return 0;
        const clients = typeof contractedClients === 'number' ? contractedClients : 0;
        return selectedPlan.price_base + (selectedPlan.price_per_client * clients);
    };

    // Load plans from database
    useEffect(() => {
        if (isOpen) {
            loadPlans();
        }
    }, [isOpen]);

    const loadPlans = async () => {
        try {
            setLoadingPlans(true);
            const { data, error } = await supabase
                .from('plan_configurations')
                .select('*')
                .eq('is_active', true)
                .order('price_base');

            if (error) {
                console.log('Using fallback plans:', error.message);
                setPlans(FALLBACK_PLANS);
            } else if (data && data.length > 0) {
                setPlans(data as PlanConfig[]);
            } else {
                setPlans(FALLBACK_PLANS);
            }
        } catch (err) {
            console.log('Using fallback plans');
            setPlans(FALLBACK_PLANS);
        } finally {
            setLoadingPlans(false);
        }
    };

    useEffect(() => {
        if (organization) {
            setName(organization.name);
            setSlug(organization.slug);
            setPlan(organization.plan);
            setOwnerName(organization.owner.name);
            setOwnerEmail(organization.owner.email);
            setBillingDocument(organization.billingDocument || '');
            setBillingEmail(organization.billingEmail || '');
            setBillingPhone(organization.billingPhone || '');
            setMaxUsers(organization.maxUsers || 10);
            setContractedClients(organization.contractedClients || 10);
        } else {
            setName('');
            setSlug('');
            setPlan(PlanType.AGENCIA);
            setOwnerName('');
            setOwnerEmail('');
            setBillingDocument('');
            setBillingEmail('');
            setBillingPhone('');
            setMaxUsers(10);
            setContractedClients(10);
            setActivateBilling(false);
        }
    }, [organization, isOpen]);

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    };

    const handleNameChange = (value: string) => {
        setName(value);
        if (!organization) {
            setSlug(generateSlug(value));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const totalValue = calculateTotalValue();
            const clients = contractedClients === '' ? undefined : contractedClients;
            if (clients !== undefined && clients % 5 !== 0) {
                showToast('A quantidade de clientes deve ser múltiplo de 5.', 'error');
                setLoading(false);
                return;
            }

            // Unify flow: Always use onSave
            const data: Partial<Organization> = {
                name,
                slug,
                plan,
                owner: {
                    name: ownerName,
                    email: ownerEmail
                },
                billingDocument,
                billingEmail,
                billingPhone,
                maxUsers: maxUsers === '' ? undefined : maxUsers,
                contractedClients: clients,
                billingValue: totalValue,
                activateBilling: activateBilling
            };

            if (organization) {
                data.id = organization.id;
            }

            const result = await onSave(data);

            // Handle transition to payment modal if needed
            if (!organization && activateBilling && result?.pendingPaymentId) {
                setPendingPaymentId(result.pendingPaymentId);
                setPaymentUrl(result.paymentUrl || 'Link será gerado...');
                setShowPaymentModal(true);
            } else {
                onClose();
            }
        } catch (error) {
            console.error('Error in OrganizationModal handleSubmit:', error);
            showToast('Erro ao salvar organização', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle payment confirmed - create the actual organization
    const handlePaymentConfirmed = async () => {
        setLoading(true);
        try {
            const { data: response, error } = await supabase.functions.invoke('create-org-with-owner', {
                body: {
                    action: 'confirm_pending_payment',
                    pending_payment_id: pendingPaymentId
                }
            });

            if (error || response?.error) {
                console.error('Error confirming payment:', error || response?.error);
                showToast('Erro ao criar organização após pagamento', 'error');
                return;
            }

            showToast('Organização criada com sucesso!', 'success');
            setShowPaymentModal(false);
            onClose();
            // Trigger refresh of organization list
            window.location.reload();
        } catch (err) {
            console.error('Error in handlePaymentConfirmed:', err);
            showToast('Erro ao finalizar criação', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle payment modal close (cancel)
    const handlePaymentModalClose = () => {
        setShowPaymentModal(false);
        setPendingPaymentId('');
        setPaymentUrl('');
    };


    const getPlanIcon = (planId: string) => {
        switch (planId) {
            case 'enterprise': return Crown;
            case 'agencia': return Building;
            default: return User;
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl max-w-2xl w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-xl font-black text-white tracking-tight">
                            {organization ? 'Editar Organização' : 'Nova Organização'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                Nome da Organização *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                                placeholder="Ex: Acme Corporation"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                Slug {organization && '(não editável)'}
                            </label>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="acme-corporation"
                                disabled={!!organization}
                                required
                            />
                            {!organization && (
                                <p className="text-xs text-slate-500 mt-1">Gerado automaticamente do nome</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                    CPF / CNPJ *
                                </label>
                                <input
                                    type="text"
                                    value={billingDocument}
                                    onChange={(e) => setBillingDocument(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                                    placeholder="00.000.000/0001-00"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                    Email Financeiro
                                </label>
                                <input
                                    type="email"
                                    value={billingEmail}
                                    onChange={(e) => setBillingEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                                    placeholder="financeiro@empresa.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                    WhatsApp de Cobrança
                                </label>
                                <input
                                    type="text"
                                    value={billingPhone}
                                    onChange={(e) => setBillingPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                                    placeholder="5511999999999"
                                />
                            </div>
                        </div>

                        {!organization && (
                            <div className="flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl group cursor-pointer hover:bg-indigo-500/10 transition-all" onClick={() => setActivateBilling(!activateBilling)}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${activateBilling ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-950/50 border-white/10 group-hover:border-indigo-500/50'}`}>
                                    {activateBilling && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <span className="text-sm font-bold text-white">Ativar Cobrança</span>
                            </div>
                        )}

                        {/* Plan Selection */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                                Plano *
                            </label>

                            {loadingPlans ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {plans.map((planData) => {
                                        const Icon = getPlanIcon(planData.id);
                                        const isSelected = plan === planData.id;

                                        return (
                                            <button
                                                key={planData.id}
                                                type="button"
                                                onClick={() => {
                                                    setPlan(planData.id as PlanType);
                                                    // Atualiza limite de usuários ao mudar o plano
                                                    if (!organization) {
                                                        setMaxUsers(planData.max_users || 10);
                                                    }
                                                }}
                                                className={`relative p-4 rounded-xl border text-left transition-all ${isSelected
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20'
                                                    : 'bg-slate-800/30 border-white/5 hover:border-white/20 hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2">
                                                        <Check className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className={`p-2 rounded-lg ${planData.id === 'enterprise' ? 'bg-amber-500/20' :
                                                        planData.id === 'agencia' ? 'bg-blue-500/20' : 'bg-slate-500/20'
                                                        }`}>
                                                        <Icon className="w-4 h-4 text-white" />
                                                    </div>
                                                    <span className="font-bold text-white text-sm">{planData.name}</span>
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="text-lg font-black text-white">
                                                        {formatCurrency(planData.price_base)}
                                                        <span className="text-xs text-slate-400 font-normal">/mês</span>
                                                    </p>
                                                    {planData.price_per_client > 0 && (
                                                        <p className="text-xs text-slate-400">
                                                            + {formatCurrency(planData.price_per_client)}/cliente
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-500">
                                                        {planData.max_users >= 999999 ? 'Usuários ilimitados' : `Até ${planData.max_users} usuário${planData.max_users > 1 ? 's' : ''}`}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Contrato de Clientes */}
                        <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-2xl border border-emerald-500/20">
                            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">Contrato de Clientes</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                                        Qtd. Clientes Contratados *
                                    </label>
                                    <input
                                        type="number"
                                        min={5}
                                        step={5}
                                        value={contractedClients}
                                        onChange={(e) => setContractedClients(e.target.value === '' ? '' : Number(e.target.value))}
                                        onBlur={(e) => {
                                            if (e.target.value !== '') {
                                                const val = Number(e.target.value);
                                                const rounded = Math.max(5, Math.round(val / 5) * 5);
                                                setContractedClients(rounded);
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-bold"
                                        placeholder="10"
                                        required
                                    />
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Valor Mensal</p>
                                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(calculateTotalValue())}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        {(() => {
                                            const selectedPlan = plans.find(p => p.id === plan);
                                            if (!selectedPlan) return '';
                                            return `Base: ${formatCurrency(selectedPlan.price_base)} + ${typeof contractedClients === 'number' ? contractedClients : 0} clientes × ${formatCurrency(selectedPlan.price_per_client)}`;
                                        })()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-6 mt-6">
                            <h3 className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.3em] mb-4">Informações do Owner</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                        Nome *
                                    </label>
                                    <input
                                        type="text"
                                        value={ownerName}
                                        onChange={(e) => setOwnerName(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                                        placeholder="João Silva"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={ownerEmail}
                                        onChange={(e) => setOwnerEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                                        placeholder="joao@acme.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-6">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                                className="flex-1 bg-white/5 border-white/10 text-slate-300"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                className="flex-1"
                                disabled={loading || loadingPlans}
                            >
                                {loading ? (organization ? 'Salvando...' : 'Criando...') : (organization ? 'Salvar' : 'Criar')}
                            </Button>
                        </div>
                    </form>
                </div >
            </div >

            {/* Payment Pending Modal */}
            <PaymentPendingModal
                isOpen={showPaymentModal}
                pendingPaymentId={pendingPaymentId}
                paymentUrl={paymentUrl}
                orgName={name}
                amount={calculateTotalValue()}
                onClose={handlePaymentModalClose}
                onConfirmed={handlePaymentConfirmed}
            />
        </>
    );
};
