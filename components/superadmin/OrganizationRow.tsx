import React from 'react';
import { Pencil, Power, CreditCard } from 'lucide-react';
import { Organization } from '../../types';
import { Badge, Button } from '../ui';
import { PlanBadge } from './PlanBadge';

interface OrganizationRowProps {
    organization: Organization;
    onEdit: (org: Organization) => void;
    onToggleStatus: (org: Organization) => void;
    onChangePlan: (org: Organization) => void;
    onOpenSetup: (org: Organization) => void;
}

export const OrganizationRow: React.FC<OrganizationRowProps> = ({
    organization,
    onEdit,
    onToggleStatus,
    onChangePlan,
    onOpenSetup
}) => {
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <tr className="border-b border-slate-200 hover:bg-slate-50">
            <td className="px-6 py-4">
                <div>
                    <div className="font-semibold text-slate-800">{organization.name}</div>
                    <div className="text-sm text-slate-500">{organization.slug}</div>
                </div>
            </td>
            <td className="px-6 py-4">
                <PlanBadge plan={organization.plan} />
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Acesso:</span>
                        <Badge variant={organization.onboardingStatus?.isOwnerActive ? 'success' : 'default'} size="sm">
                            {organization.onboardingStatus?.isOwnerActive ? 'Ativo' : 'Pendente'}
                        </Badge>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Zap:</span>
                    <Badge variant={organization.onboardingStatus?.isWhatsAppConnected ? 'success' : 'warning'} size="sm">
                        {organization.onboardingStatus?.isWhatsAppConnected ? 'Conectado' : 'Off'}
                    </Badge>
                </div>
            </td>
            <td className="px-6 py-4 text-sm text-slate-600">
                {organization.stats.users}
            </td>
            <td className="px-6 py-4 text-sm text-slate-600">
                {organization.stats.clients}
            </td>
            <td className="px-6 py-4 text-sm text-slate-500">
                {formatDate(organization.createdAt)}
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<CreditCard className="w-4 h-4" />}
                        onClick={() => onOpenSetup(organization)}
                        title="Setup Assistant"
                        className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                    >
                        Setup
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil className="w-4 h-4" />}
                        onClick={() => onEdit(organization)}
                        title="Editar"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<Power className="w-4 h-4" />}
                        onClick={() => onToggleStatus(organization)}
                        title={organization.status === 'active' ? 'Desativar' : 'Ativar'}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<CreditCard className="w-4 h-4" />}
                        onClick={() => onChangePlan(organization)}
                        title="Mudar Plano"
                    />
                </div>
            </td>
        </tr>
    );
};
