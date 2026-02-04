import React from 'react';
import { Pencil, Power, CreditCard, Trash2 } from 'lucide-react';
import { Organization } from '../../types';
import { Badge, Button } from '../ui';
import { PlanBadge } from './PlanBadge';

interface OrganizationRowProps {
    organization: Organization;
    onEdit: (org: Organization) => void;
    onToggleStatus: (org: Organization) => void;
    onChangePlan: (org: Organization) => void;
    onOpenSetup: (org: Organization) => void;
    onDelete: (org: Organization) => void;
}

export const OrganizationRow: React.FC<OrganizationRowProps> = ({
    organization,
    onEdit,
    onToggleStatus,
    onChangePlan,
    onOpenSetup,
    onDelete
}) => {
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-all duration-300 group/row">
            {/* 1. Organização */}
            <td className="px-6 py-5">
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-white line-clamp-1 group-hover/row:text-cyan-400 transition-colors">{organization.name}</span>
                    <span className="text-xs text-slate-400 font-medium">/{organization.slug}</span>
                </div>
            </td>

            {/* 2. ID Column */}
            <td className="px-6 py-5">
                <code className="text-[10px] bg-slate-950/50 text-slate-500 px-2 py-1 rounded-md font-mono border border-white/10" title={organization.id}>
                    {organization.id.substring(0, 2)}...{organization.id.substring(organization.id.length - 2)}
                </code>
            </td>

            {/* 3. Plano */}
            <td className="px-6 py-5">
                <PlanBadge plan={organization.plan} />
            </td>

            {/* 4. Status (Acesso) */}
            <td className="px-6 py-5">
                <Badge variant={organization.onboardingStatus?.isOwnerActive ? 'success' : 'default'} size="sm" className="font-bold">
                    {organization.onboardingStatus?.isOwnerActive ? 'ATIVO' : 'PENDENTE'}
                </Badge>
            </td>

            {/* 5. WhatsApp */}
            <td className="px-6 py-5">
                <Badge variant={organization.onboardingStatus?.isWhatsAppConnected ? 'success' : 'warning'} size="sm" className="font-bold">
                    {organization.onboardingStatus?.isWhatsAppConnected ? 'CONECTADO' : 'DESCONECTADO'}
                </Badge>
            </td>

            {/* 6. Equipe */}
            <td className="px-6 py-5">
                <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="font-bold">{organization.stats.users}</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">membros</span>
                </div>
            </td>

            {/* 7. Clientes */}
            <td className="px-6 py-5">
                <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="font-bold">{organization.stats.clients}</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">ativos</span>
                </div>
            </td>

            {/* 8. Criado em */}
            <td className="px-6 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">
                {formatDate(organization.createdAt)}
            </td>

            {/* 9. Ações */}
            <td className="px-6 py-5">
                <div className="flex items-center gap-1">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenSetup(organization)}
                        title="Setup Assistant"
                        className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 font-bold text-[10px] h-8"
                    >
                        SETUP
                    </Button>
                    <div className="h-4 w-[1px] bg-slate-200 mx-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => onEdit(organization)}
                        title="Editar"
                        className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<Power className="w-3.5 h-3.5" />}
                        onClick={() => onToggleStatus(organization)}
                        title={organization.status === 'active' ? 'Desativar' : 'Ativar'}
                        className={organization.status === 'active' ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-600 hover:text-emerald-500 hover:bg-emerald-500/10'}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => onDelete(organization)}
                        title="Excluir"
                        className="text-slate-600 hover:text-rose-500 hover:bg-rose-500/10"
                    />
                </div>
            </td>
        </tr>
    );
};
