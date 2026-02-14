import React, { useState } from 'react';
import { X, Check, Eye, EyeOff, Settings2, GripVertical, RotateCcw } from 'lucide-react';
import { AVAILABLE_METRICS, DEFAULT_VISIBLE_METRICS, MetricDefinition } from '../../types/campaign';

interface MetricSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    visibleMetrics: string[];
    onSave: (metrics: string[]) => Promise<void>;
    entityLabel?: string;
}

export const MetricSelector: React.FC<MetricSelectorProps> = ({
    isOpen,
    onClose,
    visibleMetrics,
    onSave,
    entityLabel = 'Geral',
}) => {
    const [selected, setSelected] = useState<string[]>(visibleMetrics);
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const toggleMetric = (key: string) => {
        setSelected(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(selected);
            onClose();
        } catch {
            // Error handled in hook
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setSelected([...DEFAULT_VISIBLE_METRICS]);
    };

    const coreMetrics = AVAILABLE_METRICS.filter(m => !m.computed);
    const computedMetrics = AVAILABLE_METRICS.filter(m => m.computed);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0d121f] rounded-[2rem] shadow-3xl w-full max-w-lg overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                            <Settings2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Métricas Visíveis</h3>
                            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{entityLabel}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500 hover:text-white" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Core Metrics */}
                    <div>
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">
                            Métricas Diretas
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {coreMetrics.map(metric => (
                                <MetricToggle
                                    key={metric.key}
                                    metric={metric}
                                    isActive={selected.includes(metric.key)}
                                    onToggle={() => toggleMetric(metric.key)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Computed Metrics */}
                    <div>
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">
                            Métricas Calculadas
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {computedMetrics.map(metric => (
                                <MetricToggle
                                    key={metric.key}
                                    metric={metric}
                                    isActive={selected.includes(metric.key)}
                                    onToggle={() => toggleMetric(metric.key)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Selected count */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {selected.length} métricas selecionadas
                        </span>
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider hover:text-cyan-300 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Restaurar Padrão
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || selected.length === 0}
                        className="px-6 py-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-xl text-[10px] font-black hover:scale-105 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 uppercase tracking-widest disabled:opacity-50 disabled:hover:scale-100"
                    >
                        <Check className="w-3.5 h-3.5" />
                        {saving ? 'Salvando...' : 'Salvar Config'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MetricToggle: React.FC<{
    metric: MetricDefinition;
    isActive: boolean;
    onToggle: () => void;
}> = ({ metric, isActive, onToggle }) => (
    <button
        onClick={onToggle}
        className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all text-left group ${isActive
            ? 'bg-white/[0.04] border-cyan-500/30 text-white'
            : 'bg-white/[0.01] border-white/5 text-slate-500 hover:border-white/10'
            }`}
    >
        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${isActive
            ? 'bg-cyan-500/20 border border-cyan-500/50'
            : 'bg-white/5 border border-white/10'
            }`}>
            {isActive && <Check className="w-3 h-3 text-cyan-400" />}
        </div>
        <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {metric.label}
            </p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider">
                {metric.computed ? 'Calculada' : metric.type === 'currency' ? 'Valor' : 'Contagem'}
            </p>
        </div>
        <div className={`transition-transform ${isActive ? 'scale-100' : 'scale-0'}`}>
            <Eye className="w-3.5 h-3.5 text-cyan-500/50" />
        </div>
    </button>
);
