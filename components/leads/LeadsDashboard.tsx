import React, { useState } from 'react';
import { Layers, Rocket, Users, Target } from 'lucide-react';
import { ColdDispatchTool } from './ColdDispatchTool';

export const LeadsDashboard: React.FC = () => {
    const [activeTool, setActiveTool] = useState<'cold-dispatch'>('cold-dispatch');

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden bg-[#0a0f1a]">
            {/* Header */}
            <header className="px-8 py-8 flex flex-col gap-2 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        <Users className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Gestão de Leads</h1>
                        <p className="text-slate-400 font-medium">Capture, nutra e converta leads com ferramentas avançadas.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mt-8 border-b border-white/5">
                    <button
                        onClick={() => setActiveTool('cold-dispatch')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTool === 'cold-dispatch'
                            ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                            : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        <Rocket className="w-4 h-4" />
                        Disparo Frio
                    </button>
                    {/* Placeholder for future tools */}
                    <button
                        disabled
                        className="px-6 py-4 text-sm font-bold border-b-2 border-transparent text-slate-700 flex items-center gap-2 cursor-not-allowed"
                    >
                        <Target className="w-4 h-4" />
                        Em Breve
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-0">
                {activeTool === 'cold-dispatch' && <ColdDispatchTool />}
            </main>
        </div>
    );
};
