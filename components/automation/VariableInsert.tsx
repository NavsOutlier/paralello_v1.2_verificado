import React from 'react';
import {
    Users, Calendar, TrendingUp, DollarSign, Target, BarChart3,
    Clock, Hash, Percent, CreditCard
} from 'lucide-react';

export interface Variable {
    key: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    category: 'cliente' | 'periodo' | 'metricas' | 'financeiro';
}

// Variáveis disponíveis para inserção
export const AVAILABLE_VARIABLES: Variable[] = [
    // Cliente
    { key: '{{cliente_nome}}', label: 'Nome do Cliente', description: 'Nome do cliente', icon: <Users className="w-3.5 h-3.5" />, category: 'cliente' },

    // Período
    { key: '{{period}}', label: 'Período', description: 'Ex: 01/01 a 07/01', icon: <Calendar className="w-3.5 h-3.5" />, category: 'periodo' },
    { key: '{{data_hoje}}', label: 'Data de Hoje', description: 'Data atual', icon: <Clock className="w-3.5 h-3.5" />, category: 'periodo' },
    { key: '{{data_ontem}}', label: 'Data de Ontem', description: 'Dia anterior', icon: <Clock className="w-3.5 h-3.5" />, category: 'periodo' },
    { key: '{{mes_anterior}}', label: 'Mês Anterior', description: 'Ex: Janeiro/2025', icon: <Calendar className="w-3.5 h-3.5" />, category: 'periodo' },

    // Métricas
    { key: '{{leads}}', label: 'Leads', description: 'Total de leads', icon: <TrendingUp className="w-3.5 h-3.5" />, category: 'metricas' },
    { key: '{{conversions}}', label: 'Conversões', description: 'Total de conversões', icon: <Target className="w-3.5 h-3.5" />, category: 'metricas' },
    { key: '{{conversion_rate}}', label: 'Taxa Conversão', description: 'Em porcentagem', icon: <Percent className="w-3.5 h-3.5" />, category: 'metricas' },
    { key: '{{impressions}}', label: 'Impressões', description: 'Total de impressões', icon: <BarChart3 className="w-3.5 h-3.5" />, category: 'metricas' },
    { key: '{{clicks}}', label: 'Cliques', description: 'Total de cliques', icon: <Hash className="w-3.5 h-3.5" />, category: 'metricas' },

    // Financeiro
    { key: '{{cpl}}', label: 'CPL', description: 'Custo por Lead', icon: <DollarSign className="w-3.5 h-3.5" />, category: 'financeiro' },
    { key: '{{spend}}', label: 'Investimento', description: 'Total gasto', icon: <CreditCard className="w-3.5 h-3.5" />, category: 'financeiro' },
    { key: '{{revenue}}', label: 'Receita', description: 'Receita gerada', icon: <DollarSign className="w-3.5 h-3.5" />, category: 'financeiro' },
    { key: '{{roas}}', label: 'ROAS', description: 'Retorno sobre investimento', icon: <TrendingUp className="w-3.5 h-3.5" />, category: 'financeiro' },
];

interface VariableInsertProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    value: string;
    onChange: (newValue: string) => void;
    filterCategory?: 'cliente' | 'periodo' | 'metricas' | 'financeiro';
}

export const VariableInsert: React.FC<VariableInsertProps> = ({
    textareaRef,
    value,
    onChange,
    filterCategory
}) => {
    const handleInsert = (variableKey: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // Insert variable at cursor position
        const newValue = value.substring(0, start) + variableKey + value.substring(end);
        onChange(newValue);

        // Set cursor position after the inserted variable
        setTimeout(() => {
            textarea.focus();
            const newPosition = start + variableKey.length;
            textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
    };

    const variables = filterCategory
        ? AVAILABLE_VARIABLES.filter(v => v.category === filterCategory)
        : AVAILABLE_VARIABLES;

    const groupedVariables = {
        cliente: variables.filter(v => v.category === 'cliente'),
        periodo: variables.filter(v => v.category === 'periodo'),
        metricas: variables.filter(v => v.category === 'metricas'),
        financeiro: variables.filter(v => v.category === 'financeiro'),
    };

    const categoryLabels = {
        cliente: 'Cliente',
        periodo: 'Período',
        metricas: 'Métricas',
        financeiro: 'Financeiro'
    };

    const categoryColors = {
        cliente: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
        periodo: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
        metricas: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
        financeiro: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Clique para inserir no texto:
                </span>
            </div>

            <div className="space-y-2">
                {(Object.keys(groupedVariables) as Array<keyof typeof groupedVariables>).map(category => {
                    const vars = groupedVariables[category];
                    if (vars.length === 0) return null;

                    return (
                        <div key={category}>
                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">
                                {categoryLabels[category]}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {vars.map(variable => (
                                    <button
                                        key={variable.key}
                                        type="button"
                                        onClick={() => handleInsert(variable.key)}
                                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${categoryColors[category]}`}
                                        title={variable.description}
                                    >
                                        {variable.icon}
                                        {variable.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
