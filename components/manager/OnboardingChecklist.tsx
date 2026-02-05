import React from 'react';
import { CheckCircle2, Circle, MessageSquare, Users, UserPlus, ArrowRight, Sparkles } from 'lucide-react';
import { Card, Button } from '../ui';

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    isCompleted: boolean;
}

interface OnboardingChecklistProps {
    stats: {
        clients: number;
        members: number;
        hasWhatsApp: boolean;
    };
    onNavigate: (tab: any) => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ stats, onNavigate }) => {
    const steps: OnboardingStep[] = [
        {
            id: 'whatsapp',
            title: 'Conectar WhatsApp',
            description: 'Conecte sua conta principal para automatizar o atendimento via grupos.',
            icon: <MessageSquare className="w-5 h-5" />,
            isCompleted: stats.hasWhatsApp
        },
        {
            id: 'client',
            title: 'Cadastrar Primeiro Cliente',
            description: 'Adicione seu primeiro cliente para criar o grupo de atendimento automático.',
            icon: <Users className="w-5 h-5" />,
            isCompleted: stats.clients > 0
        },
        {
            id: 'team',
            title: 'Convidar Equipe',
            description: 'Traga seus colaboradores para ajudar na gestão das tarefas.',
            icon: <UserPlus className="w-5 h-5" />,
            isCompleted: stats.members > 1 // Manager counts as 1
        }
    ];

    const completedCount = steps.filter(s => s.isCompleted).length;
    const progressPercentage = Math.round((completedCount / steps.length) * 100);

    if (completedCount === steps.length) return null;

    return (
        <Card className="mb-8 overflow-hidden relative bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-cyan-500/20 backdrop-blur-xl shadow-[0_0_60px_rgba(139,92,246,0.3),0_0_100px_rgba(99,102,241,0.2)] border-2 border-transparent [background-image:linear-gradient(to_right,rgba(15,23,42,0.9),rgba(15,23,42,0.8)),linear-gradient(to_right,#6366f1,#8b5cf6,#22d3ee)] [background-origin:border-box] [background-clip:padding-box,border-box]">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 tracking-tight uppercase">Protocolo de Iniciação</h2>
                            <p className="text-slate-500 text-xs mt-0.5 font-bold uppercase tracking-widest">Complete os protocolos para ativar sua estação</p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-3">
                        <div className="flex flex-col items-end">
                            <div className="text-sm font-bold text-indigo-400 mb-1">{progressPercentage}% concluído</div>
                            <div className="w-32 h-2 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-[10px] h-9 px-4 rounded-xl font-black shadow-2xl shadow-indigo-500/10"
                            onClick={() => (onNavigate as any)('open_wizard')}
                        >
                            <Sparkles className="w-3.5 h-3.5 mr-2" />
                            {stats.hasWhatsApp ? 'FINALIZAR PROTOCOLO' : 'INICIAR PROTOCOLO'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`p-4 rounded-2xl transition-all ${step.isCompleted
                                ? 'bg-emerald-500/5 ring-1 ring-emerald-500/20'
                                : 'bg-slate-900/60 ring-1 ring-slate-800 hover:ring-indigo-500/40 hover:bg-slate-800/60'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg ${step.isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    }`}>
                                    {step.icon}
                                </div>
                                {step.isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-700" />
                                )}
                            </div>

                            <h3 className={`font-bold text-sm mb-1 ${step.isCompleted ? 'text-emerald-400' : 'text-white'}`}>
                                {step.title}
                            </h3>
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                                {step.description}
                            </p>

                            {step.isCompleted && (
                                <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 p-2 bg-emerald-500/10 rounded-lg w-fit border border-emerald-500/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Concluído
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};
