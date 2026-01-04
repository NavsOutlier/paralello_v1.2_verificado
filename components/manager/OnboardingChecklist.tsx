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
        <Card className="mb-8 overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">🚀 Bem-vindo ao seu novo painel!</h2>
                        <p className="text-slate-500 text-sm mt-1">Siga os passos abaixo para deixar sua agência pronta para operar.</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-3">
                        <div className="flex flex-col items-end">
                            <div className="text-sm font-bold text-indigo-600 mb-1">{progressPercentage}% concluído</div>
                            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-[10px] h-9 px-4 rounded-xl font-black shadow-lg shadow-indigo-100"
                            onClick={() => (onNavigate as any)('open_wizard')}
                        >
                            <Sparkles className="w-3.5 h-3.5 mr-2" />
                            {stats.hasWhatsApp ? 'FINALIZAR ONBOARDING' : 'INICIAR ONBOARDING'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`p-4 rounded-xl border transition-all ${step.isCompleted
                                ? 'bg-emerald-50/50 border-emerald-100 opacity-75'
                                : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg ${step.isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                    }`}>
                                    {step.icon}
                                </div>
                                {step.isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-300" />
                                )}
                            </div>

                            <h3 className={`font-bold text-sm mb-1 ${step.isCompleted ? 'text-emerald-800' : 'text-slate-800'}`}>
                                {step.title}
                            </h3>
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                                {step.description}
                            </p>

                            {step.isCompleted && (
                                <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5 p-2 bg-emerald-50 rounded-lg w-fit">
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
