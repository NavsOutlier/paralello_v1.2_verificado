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
        <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5 shadow-2xl transition-all hover:border-white/10">
            <div className="flex items-center space-x-4 relative z-10">
                <div className={`p-3 rounded-2xl ${color} bg-opacity-10 border border-white/10 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
                    <h3 className="text-2xl font-black text-white tracking-tighter">{value}</h3>
                    {subtitle && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider opacity-60">{subtitle}</p>}
                </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};
