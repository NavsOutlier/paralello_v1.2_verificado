import React from 'react';
import { Pencil, Power, CreditCard, Trash2 } from 'lucide-react';
import { Organization } from '../../types';
import { Badge, Button } from '../ui';
import { PlanBadge } from './PlanBadge';
import { CheckCircle2, AlertCircle, MessageSquare, UserCheck, CalendarDays } from 'lucide-react';

interface OrganizationRowProps {
    organization: Organization;
    onEdit: (org: Organization) => void;
    onSelect: (org: Organization) => void;
    onToggleStatus: (org: Organization) => void;
    onChangePlan: (org: Organization) => void;
    onOpenSetup: (org: Organization) => void;
    onDelete: (org: Organization) => void;
}

export const OrganizationRow: React.FC<OrganizationRowProps> = ({
    organization,
    onEdit,
    onSelect,
    onToggleStatus,
    onChangePlan,
    onOpenSetup,
    onDelete
}) => {
    const formatDate = (date: Date | null | undefined) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short'
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
        <tr
            className="border-b border-white/5 hover:bg-white/[0.02] transition-all duration-300 group/row cursor-pointer"
            onClick={() => onSelect(organization)}
        >
            {/* 1. Org & Identidade */}
            <td className="px-6 py-5">
                <div className="flex flex-col gap-0.5">
                    <span className="font-black text-white line-clamp-1 group-hover/row:text-cyan-400 transition-colors italic tracking-tight">{organization.name}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">/{organization.slug}</span>
                        {organization.billingDocument && (
                            <span className="text-[9px] text-slate-600 font-bold bg-slate-950/40 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-wider">{organization.billingDocument}</span>
                        )}
                    </div>
                </div>
            </td>

            {/* 2. Assinatura */}
            <td className="px-6 py-5">
                <div className="flex flex-col gap-1.5 items-start">
                    <PlanBadge plan={organization.plan} />
                    <Badge variant={getStatusColor(organization.asaasStatus || 'active')} size="sm" className="font-bold text-[9px]">
                        {organization.asaasStatus?.toUpperCase() || 'ATIVO'}
                    </Badge>
                </div>
            </td>

            {/* 3. Saúde & Status */}
            <td className="px-6 py-5">
                <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1" title="Status WhatsApp">
                        {organization.onboardingStatus?.isWhatsAppConnected ? (
                            <MessageSquare className="w-4 h-4 text-emerald-500" />
                        ) : (
                            <MessageSquare className="w-4 h-4 text-slate-700" />
                        )}
                        <span className="text-[8px] font-black text-slate-600 uppercase">WA</span>
                    </div>
                    <div className="flex flex-col items-center gap-1" title="Status Proprietário">
                        {organization.onboardingStatus?.isOwnerActive ? (
                            <UserCheck className="w-4 h-4 text-emerald-500" />
                        ) : (
                            <UserCheck className="w-4 h-4 text-slate-700" />
                        )}
                        <span className="text-[8px] font-black text-slate-600 uppercase">ADM</span>
                    </div>
                </div>
            </td>

            {/* 4. Uso (Membros/Clientes) */}
            <td className="px-6 py-5">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter w-12">Equipe</span>
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden w-20">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((organization.stats.users / (organization.maxUsers || 10)) * 100, 100)}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-black text-slate-300 w-8 text-right">
                            {organization.stats.users}/<span className="text-indigo-400">{organization.maxUsers || 10}</span>
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter w-12">Clientes</span>
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden w-20">
                            <div
                                className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((organization.stats.clients / (organization.contractedClients || 50)) * 100, 100)}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-black text-slate-300 w-8 text-right">
                            {organization.stats.clients}/<span className="text-cyan-400">{organization.contractedClients || 50}</span>
                        </span>
                    </div>
                </div>
            </td>

            {/* 5. Ciclo */}
            <td className="px-6 py-5">
                <div className="flex flex-col gap-1 items-start">
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider">{formatDate(organization.trialEndsAt || organization.createdAt)}</span>
                    </div>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{organization.trialEndsAt ? 'Expira em' : 'Criado em'}</span>
                </div>
            </td>

            {/* 6. Ações */}
            <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenSetup(organization)}
                        title="Setup Assistant"
                        className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 font-bold text-[10px] h-8 px-4"
                    >
                        SETUP
                    </Button>
                    <div className="h-4 w-[1px] bg-white/5 mx-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => onEdit(organization)}
                        title="Editar"
                        className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 h-8 w-8 p-0"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => onDelete(organization)}
                        title="Excluir"
                        className="text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 h-8 w-8 p-0"
                    />
                </div>
            </td>
        </tr>
    );
};
