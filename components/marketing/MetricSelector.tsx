import React, { useState, useRef } from 'react';
import { X, Check, Eye, GripVertical, RotateCcw, Plus, ArrowRight, Settings2, Trash2 } from 'lucide-react';
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
    // Selected metrics ordered by display preference
    const [selected, setSelected] = useState<string[]>(visibleMetrics);
    const [saving, setSaving] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    if (!isOpen) return null;

    // Available metrics (those not selected)
    const available = AVAILABLE_METRICS.filter(m => !selected.includes(m.key));

    const handleAdd = (key: string) => {
        setSelected(prev => [...prev, key]);
    };

    const handleRemove = (key: string) => {
        setSelected(prev => prev.filter(k => k !== key));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(selected);
            onClose(); // Close strictly after successful save
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setSelected([...DEFAULT_VISIBLE_METRICS]);
    };

    // Drag and Drop Logic
    const onDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Ghost image styling if needed
    };

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const onDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;

        const newSelected = [...selected];
        const item = newSelected[draggedIndex];
        newSelected.splice(draggedIndex, 1); // Remove from old pos
        newSelected.splice(dropIndex, 0, item); // Insert at new pos

        setSelected(newSelected);
        setDraggedIndex(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0d121f] rounded-[2rem] shadow-3xl w-full max-w-4xl h-[80vh] flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl shadow-lg shadow-cyan-500/10">
                            <Settings2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Personalizar Métricas</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                    {entityLabel}
                                </span>
                                <span className="text-[10px] text-slate-600 font-medium">
                                    Arraste para reordenar
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500 hover:text-white" />
                    </button>
                </div>

                {/* Body - Two Columns */}
                <div className="flex-1 flex overflow-hidden">

                    {/* LEFT: Available Metrics */}
                    <div className="w-1/2 p-6 border-r border-white/5 flex flex-col bg-slate-900/20">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Plus className="w-3 h-3" />
                            Disponíveis ({available.length})
                        </h4>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {available.length === 0 ? (
                                <div className="text-center py-10 text-slate-600 text-xs italic">
                                    Todas as métricas selecionadas
                                </div>
                            ) : (
                                available.map(metric => (
                                    <button
                                        key={metric.key}
                                        onClick={() => handleAdd(metric.key)}
                                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900/40 border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 rounded-xl transition-all group text-left"
                                    >
                                        <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                                            <Plus className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{metric.label}</p>
                                            <p className="text-[9px] text-slate-600 uppercase tracking-wider">{metric.type === 'currency' ? 'Moeda' : metric.type === 'percent' ? '%' : 'Numérico'}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Selected Metrics (Draggable) */}
                    <div className="w-1/2 p-6 flex flex-col bg-[#0b101b]">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Eye className="w-3 h-3" />
                                Selecionadas ({selected.length})
                            </h4>
                            <button onClick={handleReset} className="text-[9px] font-black text-slate-500 hover:text-cyan-400 uppercase tracking-wider flex items-center gap-1 transition-colors">
                                <RotateCcw className="w-3 h-3" /> Resetar
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {selected.map((key, index) => {
                                const metric = AVAILABLE_METRICS.find(m => m.key === key);
                                if (!metric) return null;

                                return (
                                    <div
                                        key={key}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, index)}
                                        onDragOver={(e) => onDragOver(e, index)}
                                        onDrop={(e) => onDrop(e, index)}
                                        className={`flex items-center gap-3 px-4 py-3 bg-slate-800/40 border border-white/5 rounded-xl group cursor-grab active:cursor-grabbing transition-all ${draggedIndex === index ? 'opacity-50 border-dashed border-cyan-500' : 'hover:border-white/10 hover:bg-slate-800/60'
                                            }`}
                                    >
                                        <div className="cursor-grab active:cursor-grabbing text-slate-600 group-hover:text-slate-400 transition-colors">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-white">{metric.label}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemove(key)}
                                            className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remover"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 font-medium">
                        * A ordem definida aqui será a ordem das colunas na tabela.
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-xl text-[10px] font-black hover:scale-105 shadow-xl shadow-cyan-500/20 transition-all flex items-center gap-2 uppercase tracking-widest disabled:opacity-50"
                        >
                            {saving ? (
                                <>Salvando...</>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    Salvar Alterações
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
