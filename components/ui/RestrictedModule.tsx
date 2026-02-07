import React from 'react';
import { Lock, Crown, ArrowUpRight } from 'lucide-react';
import { useOrganizationPlan } from '../../hooks/useOrganizationPlan';

interface RestrictedModuleProps {
    moduleId: string;
    children: React.ReactNode;
    title?: string;
    description?: string;
}

export const RestrictedModule: React.FC<RestrictedModuleProps> = ({
    moduleId,
    children,
    title = "Recurso Premium",
    description = "Este módulo não está incluído no seu plano atual. Faça o upgrade para liberar o acesso total."
}) => {
    const { hasModule, loading } = useOrganizationPlan();

    if (loading) return <div className="animate-pulse bg-slate-800/20 rounded-2xl h-full w-full" />;

    if (hasModule(moduleId)) {
        return <>{children}</>;
    }

    return (
        <div className="relative h-full w-full group overflow-hidden rounded-2xl">
            {/* Blurred Mock Content */}
            <div className="absolute inset-0 blur-[6px] grayscale-[0.5] opacity-40 pointer-events-none select-none">
                {children}
            </div>

            {/* Locked Overlay */}
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl shadow-black/50 border-t-white/20 transform transition-all duration-500 group-hover:scale-[1.02]">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20">
                        <Lock className="w-10 h-10 text-white" />
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/20 rounded-full mb-4">
                        <Crown className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-black text-amber-200 uppercase tracking-widest">Upgrade Necessário</span>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        {description}
                    </p>

                    <button
                        onClick={() => {/* Redirecionar para faturas/planos */ }}
                        className="w-full py-4 bg-white text-slate-950 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all hover:bg-indigo-50 active:scale-95 flex items-center justify-center gap-2"
                    >
                        Liberar Agora
                        <ArrowUpRight className="w-4 h-4" />
                    </button>

                    <p className="mt-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        Blackback Parallel Platform • v1.2
                    </p>
                </div>
            </div>

            {/* Interactive prevention overlay */}
            <div className="absolute inset-0 z-0 cursor-not-allowed" />
        </div>
    );
};
