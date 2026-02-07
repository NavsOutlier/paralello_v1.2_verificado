import React, { useState } from 'react';
import {
    X,
    Building2,
    CreditCard,
    History,
    ExternalLink,
    Calendar,
    Phone,
    Mail,
    FileText,
    Zap,
    Shield,
    Clock,
    User
} from 'lucide-react';
import { Organization, PlanType } from '../../types';
import { Badge, Button } from '../ui';
import { PlanBadge } from './PlanBadge';

interface OrganizationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    organization: Organization | null;
    onEdit: (org: Organization) => void;
}

export const OrganizationDrawer: React.FC<OrganizationDrawerProps> = ({
    isOpen,
    onClose,
    organization,
    onEdit
}) => {
    const [activeTab, setActiveTab] = useState<'details' | 'billing' | 'logs'>('details');

    if (!organization) return null;

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'past_due': return 'warning';
            case 'suspended': return 'danger';
            default: return 'default';
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-lg bg-slate-900 border-l border-white/10 z-[70] shadow-3xl transform transition-transform duration-500 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white italic tracking-tight">{organization.name}</h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">ID: {organization.id}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <PlanBadge plan={organization.plan} />
                        <Badge variant={getStatusColor(organization.asaasStatus || 'active')} size="sm" className="font-bold">
                            {organization.asaasStatus?.toUpperCase() || 'ATIVO'}
                        </Badge>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex p-2 bg-slate-950/30 border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === 'details' ? 'bg-white/5 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Cadastro
                    </button>
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === 'billing' ? 'bg-white/5 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <CreditCard className="w-3.5 h-3.5" />
                        Billing
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${activeTab === 'logs' ? 'bg-white/5 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <History className="w-3.5 h-3.5" />
                        Atividade
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'details' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            {/* Identidade */}
                            <section>
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Identidade Corporativa</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/30 rounded-2xl border border-white/5">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Slug URL</p>
                                        <p className="text-sm text-slate-200 font-mono">/{organization.slug}</p>
                                    </div>
                                    <div className="p-4 bg-slate-800/30 rounded-2xl border border-white/5">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Documento (CPF/CNPJ)</p>
                                        <p className="text-sm text-slate-200">{organization.billingDocument || 'Não informado'}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Contato Principal */}
                            <section>
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Proprietário (Owner)</h4>
                                <div className="p-4 bg-slate-800/30 rounded-2xl border border-white/5 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{organization.owner.name}</p>
                                        <p className="text-xs text-slate-400">{organization.owner.email}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Informações de Faturamento */}
                            <section>
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Contato Financeiro</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Mail className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm">{organization.billingEmail || organization.owner.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Phone className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm">{organization.billingPhone || 'Telefone não cadastrado'}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            {/* Resumo do Ciclo */}
                            <div className="p-6 bg-gradient-to-br from-indigo-500/20 to-violet-500/10 rounded-3xl border border-indigo-500/20">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-1">Fim do Ciclo Atual</p>
                                        <p className="text-2xl font-black text-white italic">{formatDate(organization.trialEndsAt || null)}</p>
                                    </div>
                                    <Calendar className="w-8 h-8 text-indigo-400/50" />
                                </div>
                                <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-11 rounded-xl shadow-lg shadow-indigo-500/20">
                                    ESTENDER TRIAL (+7 DIAS)
                                </Button>
                            </div>

                            {/* Conexão Asaas */}
                            <section>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Gateway Asaas</h4>
                                <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-1">Status no Gateway</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-sm font-bold text-white uppercase tracking-wider italic">Sincronizado</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-indigo-400 hover:bg-indigo-400/10">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Ver no Asaas
                                    </Button>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="relative pl-6 space-y-8">
                                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/5 ml-2" />

                                <div className="relative">
                                    <div className="absolute left-[-24px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-4 border-slate-900 shadow-sm shadow-indigo-500/50" />
                                    <div>
                                        <p className="text-xs font-bold text-white">Organização Criada</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(organization.createdAt)}</p>
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute left-[-24px] top-1 w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-900" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 italic">Nenhuma atividade recente registrada.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-white/5 bg-slate-950/20 grid grid-cols-2 gap-4">
                    <Button
                        variant="secondary"
                        onClick={() => onEdit(organization)}
                        className="h-12 bg-white/5 border-white/10 text-slate-300 font-bold hover:bg-white/10"
                    >
                        EDITAR CADASTRO
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onClose}
                        className="h-12 bg-indigo-500 hover:bg-indigo-600 font-bold"
                    >
                        FECHAR
                    </Button>
                </div>
            </div>
        </>
    );
};
