import React from 'react';
import { Card } from '../ui';

interface MetricsCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    subtitle?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle
}) => {
    return (
        <Card className="flex items-center space-x-4 p-6">
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-sm text-slate-500 font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
        </Card>
    );
};
