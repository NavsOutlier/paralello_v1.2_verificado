import React from 'react';
import { CheckCircle2, Circle, MessageSquare, Users, UserPlus, ArrowRight } from 'lucide-react';
import { Card, Button } from '../ui';

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    isCompleted: boolean;
    actionLabel: string;
    onAction: () => void;
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
            isCompleted: stats.hasWhatsApp,
            actionLabel: 'Configurar WhatsApp',
            onAction: () => onNavigate('settings')
        },
        {
            id: 'client',
            title: 'Cadastrar Primeiro Cliente',
            description: 'Adicione seu primeiro cliente para criar o grupo de atendimento automático.',
            icon: <Users className="w-5 h-5" />,
            isCompleted: stats.clients > 0,
            actionLabel: 'Adicionar Cliente',
            onAction: () => onNavigate('clients')
        },
        {
            id: 'team',
            title: 'Convidar Equipe',
            description: 'Traga seus colaboradores para ajudar na gestão das tarefas.',
            icon: <UserPlus className="w-5 h-5" />,
            isCompleted: stats.members > 1, // Manager counts as 1
            actionLabel: 'Convidar Membros',
            onAction: () => onNavigate('team')
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
                    <div className="text-right">
                        <div className="text-sm font-bold text-indigo-600 mb-1">{progressPercentage}% concluído</div>
                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
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

                            {!step.isCompleted && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={step.onAction}
                                    className="w-full text-xs font-bold bg-white border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                                >
                                    {step.actionLabel}
                                    <ArrowRight className="w-3 h-3 ml-2" />
                                </Button>
                            )}

                            {step.isCompleted && (
                                <div className="text-xs font-bold text-emerald-600 flex items-center justify-center py-2">
                                    Concluído!
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};
