import React from 'react';
import { Users, UserCheck, CalendarCheck, UserX, Clock, TrendingUp } from 'lucide-react';

interface FunnelData {
    total: number;
    existingPatient: number;
    newInterested: number;
    qualified: number;
    scheduled: number;
    disqualified: number;
    noResponse: number;
}

interface AgentFunnelChartProps {
    data: FunnelData;
}

export const AgentFunnelChart: React.FC<AgentFunnelChartProps> = ({ data }) => {
    // Calculate conversion rates
    const interestToQualified = data.newInterested > 0
        ? ((data.qualified / data.newInterested) * 100).toFixed(1)
        : '0';
    const qualifiedToScheduled = data.qualified > 0
        ? ((data.scheduled / data.qualified) * 100).toFixed(1)
        : '0';
    const totalConversion = data.newInterested > 0
        ? ((data.scheduled / data.newInterested) * 100).toFixed(1)
        : '0';
    const disqualificationRate = data.newInterested > 0
        ? ((data.disqualified / data.newInterested) * 100).toFixed(1)
        : '0';
    const abandonRate = data.newInterested > 0
        ? ((data.noResponse / data.newInterested) * 100).toFixed(1)
        : '0';

    // Max value for bar width calculation
    const maxValue = Math.max(data.total, 1);

    const stages = [
        {
            label: 'Total Leads',
            value: data.total,
            icon: Users,
            color: 'from-slate-500 to-slate-600',
            bgColor: 'bg-slate-500/20',
            textColor: 'text-slate-300'
        },
        {
            label: 'Já são Pacientes',
            value: data.existingPatient,
            icon: UserCheck,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-500/20',
            textColor: 'text-blue-400',
            isSecondary: true
        },
        {
            label: 'Querem Agendar',
            value: data.newInterested,
            icon: TrendingUp,
            color: 'from-cyan-500 to-cyan-600',
            bgColor: 'bg-cyan-500/20',
            textColor: 'text-cyan-400'
        },
        {
            label: 'Qualificados',
            value: data.qualified,
            icon: UserCheck,
            color: 'from-emerald-500 to-emerald-600',
            bgColor: 'bg-emerald-500/20',
            textColor: 'text-emerald-400'
        },
        {
            label: 'Agendaram',
            value: data.scheduled,
            icon: CalendarCheck,
            color: 'from-green-500 to-green-600',
            bgColor: 'bg-green-500/20',
            textColor: 'text-green-400'
        },
        {
            label: 'Desqualificados',
            value: data.disqualified,
            icon: UserX,
            color: 'from-rose-500 to-rose-600',
            bgColor: 'bg-rose-500/20',
            textColor: 'text-rose-400',
            isNegative: true
        },
        {
            label: 'Sem Resposta',
            value: data.noResponse,
            icon: Clock,
            color: 'from-amber-500 to-amber-600',
            bgColor: 'bg-amber-500/20',
            textColor: 'text-amber-400',
            isNegative: true
        },
    ];

    // Show empty state if no data
    if (data.total === 0) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Funil de Vendas
                </h3>
                <div className="text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum dado de funil disponível</p>
                    <p className="text-sm mt-1">Envie dados via webhook para visualizar</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Funil de Vendas
                </h3>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Conversão Total:</span>
                        <span className="font-bold text-green-400">{totalConversion}%</span>
                    </div>
                </div>
            </div>

            {/* Funnel Stages */}
            <div className="space-y-3">
                {stages.map((stage, index) => {
                    const Icon = stage.icon;
                    const widthPercent = (stage.value / maxValue) * 100;

                    return (
                        <div key={stage.label} className="relative">
                            {/* Stage Row */}
                            <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl ${stage.bgColor} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={`w-5 h-5 ${stage.textColor}`} />
                                </div>

                                {/* Bar Container */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-medium ${stage.isSecondary ? 'text-slate-400' : 'text-white'}`}>
                                            {stage.label}
                                        </span>
                                        <span className={`text-sm font-bold ${stage.textColor}`}>
                                            {stage.value}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${stage.color} rounded-full transition-all duration-500`}
                                            style={{ width: `${Math.max(widthPercent, 2)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Conversion Arrow (between main stages) */}
                            {index === 2 && (
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col items-center text-xs text-emerald-400">
                                    <span className="bg-slate-900 px-2 py-1 rounded border border-emerald-500/30">
                                        {interestToQualified}%
                                    </span>
                                </div>
                            )}
                            {index === 3 && (
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col items-center text-xs text-green-400">
                                    <span className="bg-slate-900 px-2 py-1 rounded border border-green-500/30">
                                        {qualifiedToScheduled}%
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Conversion Summary */}
            <div className="mt-6 pt-4 border-t border-slate-700/50 grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Interesse → Qualificado</p>
                    <p className="text-lg font-bold text-emerald-400">{interestToQualified}%</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Qualificado → Agendado</p>
                    <p className="text-lg font-bold text-green-400">{qualifiedToScheduled}%</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Taxa de Abandono</p>
                    <p className="text-lg font-bold text-amber-400">{abandonRate}%</p>
                </div>
            </div>
        </div>
    );
};

export default AgentFunnelChart;
