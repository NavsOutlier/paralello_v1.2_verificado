import React from 'react';
import { TrendingUp, Users } from 'lucide-react';

interface FunnelStage {
    id: string;
    label: string;
    color: string;
    bg: string;
    border: string;
}

interface WorkerFunnelChartProps {
    funnelStages: FunnelStage[];
    counts: Record<string, number>;
    loading?: boolean;
}

export const WorkerFunnelChart: React.FC<WorkerFunnelChartProps> = ({ funnelStages, counts, loading = false }) => {
    const countsArray = Object.values(counts) as number[];
    const totalLeads = countsArray.reduce((sum, count) => sum + count, 0);
    const maxValue = Math.max(...countsArray, 1);

    if (loading) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-6 h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (totalLeads === 0 || funnelStages.length === 0) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-6 h-[400px] flex flex-col items-center justify-center">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 self-start">
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
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                    Funil de Conversão
                </h3>
                <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-[10px] font-bold text-violet-400">
                    {totalLeads} LEADS TOTAIS
                </div>
            </div>

            <div className="space-y-6">
                {funnelStages.map((stage, index) => {
                    const count = counts[stage.id] || 0;
                    const widthPercent = (count / maxValue) * 100;
                    const nextStageCount = index < funnelStages.length - 1 ? counts[funnelStages[index + 1].id] || 0 : 0;
                    const conversionRate = count > 0 ? ((nextStageCount / count) * 100).toFixed(1) : '0';

                    return (
                        <div key={stage.id} className="relative group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl ${stage.bg} border ${stage.border} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                                    <TrendingUp className={`w-5 h-5 ${stage.color}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">{stage.label}</span>
                                            {index < funnelStages.length - 1 && count > 0 && (
                                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                                    {conversionRate}% conv.
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-sm font-black ${stage.color}`}>{count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                                        <div
                                            className={`h-full ${stage.bg.replace('/10', '/60')} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.3)]`}
                                            style={{ width: `${Math.max(widthPercent, 1)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Visual connector to next stage */}
                            {index < funnelStages.length - 1 && (
                                <div className="ml-5 h-4 w-px bg-gradient-to-b from-slate-700 to-transparent my-1" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
