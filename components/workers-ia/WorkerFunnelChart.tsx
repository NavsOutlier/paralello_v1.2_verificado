import React from 'react';
import { Users, UserCheck, CalendarCheck, UserX, Clock, TrendingUp, Zap } from 'lucide-react';

interface FunnelData {
    total: number;
    interested: number;
    qualified: number;
    scheduled: number;
    disqualified: number;
    noResponse: number;
}

interface WorkerFunnelChartProps {
    data: FunnelData;
}

export const WorkerFunnelChart: React.FC<WorkerFunnelChartProps> = ({ data }) => {
    // Calculate conversion rates
    const interestToQualified = data.interested > 0
        ? ((data.qualified / data.interested) * 100).toFixed(1)
        : '0';
    const qualifiedToScheduled = data.qualified > 0
        ? ((data.scheduled / data.qualified) * 100).toFixed(1)
        : '0';
    const totalConversion = data.interested > 0
        ? ((data.scheduled / data.interested) * 100).toFixed(1)
        : '0';

    const maxValue = Math.max(data.total, 1);

    const stages = [
        { label: 'Total Leads', value: data.total, icon: Users, color: 'from-slate-500 to-slate-600', bgColor: 'bg-slate-500/20', textColor: 'text-slate-300' },
        { label: 'Interessados', value: data.interested, icon: TrendingUp, color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400' },
        { label: 'Qualificados', value: data.qualified, icon: UserCheck, color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
        { label: 'Agendaram', value: data.scheduled, icon: CalendarCheck, color: 'from-green-500 to-green-600', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
        { label: 'Desqualificados', value: data.disqualified, icon: UserX, color: 'from-rose-500 to-rose-600', bgColor: 'bg-rose-500/20', textColor: 'text-rose-400', isNegative: true },
        { label: 'Sem Resposta', value: data.noResponse, icon: Clock, color: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400', isNegative: true },
    ];

    if (data.total === 0) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                    Funil de Conversão
                </h3>
                <div className="text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum dado de funil disponível</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                    Funil de Conversão
                </h3>
                <div className="text-sm font-bold text-green-400">Conversão: {totalConversion}%</div>
            </div>

            <div className="space-y-4">
                {stages.map((stage, index) => {
                    const Icon = stage.icon;
                    const widthPercent = (stage.value / maxValue) * 100;

                    return (
                        <div key={stage.label} className="relative">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl ${stage.bgColor} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={`w-5 h-5 ${stage.textColor}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-white">{stage.label}</span>
                                        <span className={`text-sm font-bold ${stage.textColor}`}>{stage.value}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full bg-gradient-to-r ${stage.color} transition-all duration-700`} style={{ width: `${Math.max(widthPercent, 2)}%` }} />
                                    </div>
                                </div>
                            </div>

                            {(index === 1 || index === 2) && (
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center text-[10px] text-green-400/80 font-bold bg-slate-900/80 px-1.5 py-0.5 rounded border border-green-500/20">
                                    {index === 1 ? interestToQualified : qualifiedToScheduled}%
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
