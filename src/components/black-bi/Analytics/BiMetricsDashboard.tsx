import React from 'react';
import { TrendingUp, Users, DollarSign, Activity, PieChart, Clock } from 'lucide-react';

export const BiMetricsDashboard: React.FC = () => {
    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-900/30 rounded-xl border border-white/5 p-6 gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-cyan-400">Inteligência de Metas</h2>
                    <p className="text-sm text-slate-400 mt-1">Visão holística de performance de funil, time e IA.</p>
                </div>
                <div className="flex gap-2">
                    <select className="bg-slate-900 border border-slate-700 text-sm text-slate-300 p-2 rounded outline-none w-32">
                        <option>Hoje</option>
                        <option>Últimos 7 dias</option>
                        <option>Este Mês</option>
                    </select>
                    <select className="bg-slate-900 border border-slate-700 text-sm text-slate-300 p-2 rounded outline-none w-40">
                        <option>Todos os Funis</option>
                        <option>Comercial Principal</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-bold uppercase">Leads Entrantes</span>
                        <Users className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div className="mt-4">
                        <span className="text-2xl font-black text-slate-200">1,204</span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-400">
                            <TrendingUp className="w-3 h-3" /> +15%
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-bold uppercase">Ticket Médio (LTV)</span>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-4">
                        <span className="text-2xl font-black text-slate-200">R$ 1.850</span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-400">
                            <TrendingUp className="w-3 h-3" /> +5%
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-bold uppercase">SLA Médio (Humano)</span>
                        <Clock className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="mt-4">
                        <span className="text-2xl font-black text-slate-200">4m 12s</span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-rose-400">
                            <TrendingUp className="w-3 h-3 rotate-180" /> +12s lentidão
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-bold uppercase">Taxa de Conversão</span>
                        <Activity className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div className="mt-4">
                        <span className="text-2xl font-black text-slate-200">8.4%</span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-400">
                            <TrendingUp className="w-3 h-3" /> +1.2%
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Funnel Dropoff Chart Dummy */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-cyan-500" /> Saúde do Funil (Drop-off)
                    </h3>
                    <div className="flex-1 flex flex-col justify-center gap-3">
                        <div className="w-full">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">Novos Leads</span>
                                <span className="text-slate-200 font-bold">100% (1,204)</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-emerald-500 h-2 rounded-full w-full"></div>
                            </div>
                        </div>
                        <div className="w-full">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">Interessados</span>
                                <span className="text-slate-200 font-bold">65% (782)</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-cyan-500 h-2 rounded-full w-[65%]"></div>
                            </div>
                        </div>
                        <div className="w-full">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">Qualificados</span>
                                <span className="text-slate-200 font-bold">28% (337)</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full w-[28%]"></div>
                            </div>
                        </div>
                        <div className="w-full">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">Agendados / Proposta</span>
                                <span className="text-slate-200 font-bold">12% (144)</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-orange-500 h-2 rounded-full w-[12%]"></div>
                            </div>
                        </div>
                        <div className="w-full opacity-60">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-rose-400">Perdidos no caminho</span>
                                <span className="text-rose-400 font-bold">45% (541)</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-rose-500 h-2 rounded-full w-[45%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attribution Chart Dummy */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" /> Atribuição de Conversão (Agendados)
                    </h3>
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="w-48 h-48 rounded-full border-[16px] border-slate-800 relative flex items-center justify-center">
                            {/* Fake Donut Chart Segments */}
                            <div className="absolute inset-[-16px] rounded-full border-[16px] border-emerald-500/80" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }}></div>
                            <div className="absolute inset-[-16px] rounded-full border-[16px] border-cyan-500/80" style={{ clipPath: 'polygon(100% 50%, 100% 100%, 50% 100%, 50% 50%)' }}></div>
                            <div className="absolute inset-[-16px] rounded-full border-[16px] border-orange-500/80" style={{ clipPath: 'polygon(50% 100%, 0 100%, 0 50%, 50% 50%)' }}></div>

                            <div className="text-center flex flex-col items-center">
                                <span className="text-2xl font-black text-slate-200">144</span>
                                <span className="text-[10px] text-slate-500 uppercase">Leads</span>
                            </div>
                        </div>

                        <div className="ml-8 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                                <span className="text-sm text-slate-300">Instagram Ads (50%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-cyan-500"></div>
                                <span className="text-sm text-slate-300">Google Search (25%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-orange-500"></div>
                                <span className="text-sm text-slate-300">Referral / Outros (25%)</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
