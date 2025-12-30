import React from 'react';
import { PlanType } from '../../types';
import { Badge, BadgeVariant } from '../ui';

interface PlanBadgeProps {
    plan: PlanType;
    className?: string;
}

const planVariantMap: Record<PlanType, BadgeVariant> = {
    [PlanType.BASIC]: 'default',
    [PlanType.PRO]: 'primary',
    [PlanType.ENTERPRISE]: 'success',
};

const planNameMap: Record<PlanType, string> = {
    [PlanType.BASIC]: 'Basic',
    [PlanType.PRO]: 'Pro',
    [PlanType.ENTERPRISE]: 'Enterprise',
};

export const PlanBadge: React.FC<PlanBadgeProps> = ({ plan, className }) => {
    return (
        <Badge variant={planVariantMap[plan]} size="sm" className={className}>
            {planNameMap[plan]}
        </Badge>
    );
};
