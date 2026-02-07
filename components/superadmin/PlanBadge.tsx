import React from 'react';
import { PlanType } from '../../types';
import { Badge, BadgeVariant } from '../ui';

interface PlanBadgeProps {
    plan: PlanType;
    className?: string;
}

const planVariantMap: Record<PlanType, BadgeVariant> = {
    [PlanType.GESTOR_SOLO]: 'default',
    [PlanType.AGENCIA]: 'primary',
    [PlanType.ENTERPRISE]: 'success',
};

const planNameMap: Record<PlanType, string> = {
    [PlanType.GESTOR_SOLO]: 'Gestor Solo',
    [PlanType.AGENCIA]: 'Agência',
    [PlanType.ENTERPRISE]: 'Enterprise',
};

export const PlanBadge: React.FC<PlanBadgeProps> = ({ plan, className }) => {
    return (
        <Badge variant={planVariantMap[plan]} size="sm" className={className}>
            {planNameMap[plan]}
        </Badge>
    );
};
