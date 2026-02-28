import React, { useState } from 'react';
import { X, GripVertical, Plus, Trash2, Edit2, Save, Palette } from 'lucide-react';
import { BlBiStage } from '../types';

interface StageManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    stages: BlBiStage[];
    onUpdateStages: (stages: BlBiStage[]) => void;
}

const PREDEFINED_COLORS = [
    { name: 'Slate', text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500' },
    { name: 'Cyan', text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', dot: 'bg-cyan-500' },
    { name: 'Emerald', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
    { name: 'Indigo', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', dot: 'bg-indigo-500' },
    { name: 'Fuchsia', text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', dot: 'bg-fuchsia-500' },
    { name: 'Orange', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-500' },
    { name: 'Rose', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-500' },
    { name: 'Amber', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
];

export const StageManagementModal: React.FC<StageManagementModalProps> = ({
    isOpen,
    onClose,
    stages: initialStages,
    onUpdateStages
}) => {
    const [stages, setStages] = useState<BlBiStage[]>(initialStages);
    const [editingStageId, setEditingStageId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    if (!isOpen) return null;

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newStages = [...stages];
        const itemMove = newStages.splice(draggedIndex, 1)[0];
        newStages.splice(index, 0, itemMove);
        setStages(newStages);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleRemove = (id: string) => {
        setStages(stages.filter(s => s.id !== id));
    };

    const handleAdd = () => {
        const newId = `stage_${Date.now()}`;
        const newStage: BlBiStage = {
            id: newId,
            name: 'Nova Etapa',
            color: 'text-slate-400',
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/20',
            ai_enabled: false,
            followup_enabled: false,
            leadCount: 0
        };
        setStages([...stages, newStage]);
        setEditingStageId(newId);
        setEditName('Nova Etapa');
    };

    const startEditing = (stage: BlBiStage) => {
        setEditingStageId(stage.id);
        setEditName(stage.name);
    };

    const saveEdit = (id: string) => {
        setStages(stages.map(s => s.id === id ? { ...s, name: editName } : s));
        setEditingStageId(null);
    };

    const updateColor = (id: string, colorTheme: typeof PREDEFINED_COLORS[0]) => {
        setStages(stages.map(s => s.id === id ? {
            ...s,
            color: colorTheme.text,
            bg: colorTheme.bg,
            border: colorTheme.border
        } : s));
    };

    const handleSaveAll = () => {
        onUpdateStages(stages);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-[95vw] lg:max-w-[1600px] bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 h-[70vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">Gerenciar Etapas</h2>
                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Arraste para organizar seu funil horizontalmente</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Adaptive Content Area - Reduzido e Centralizado */}
                <div className="flex-1 p-6 lg:p-10 flex flex-col items-center justify-center overflow-y-auto">
                    <div className="flex items-center justify-center gap-4 w-full">
                        {stages.map((stage, index) => (
                            <div
                                key={stage.id}
                                draggable={!stage.isFixed}
                                onDragStart={() => !stage.isFixed && handleDragStart(index)}
                                onDragOver={(e) => {
                                    if (stage.isFixed) return;
                                    handleDragOver(e, index);
                                }}
                                onDragEnd={handleDragEnd}
                                className={`
                                    flex-1 min-w-[120px] max-w-[200px] h-[360px] flex flex-col bg-slate-800/20 border-2 rounded-[28px] transition-all duration-300 group relative
                                    ${draggedIndex === index ? 'opacity-40 scale-95 border-cyan-500/50' : 'border-white/5 hover:border-white/10'}
                                    ${stage.border.replace('border-', 'hover:border-')}
                                    ${stage.isFixed ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
                                `}
                            >
                                {/* Drag Handle or Fixed Label */}
                                {stage.isFixed ? (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900 border border-cyan-500/30 rounded-full z-20 whitespace-nowrap shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                                        <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest italic">Etapa Fixa</span>
                                    </div>
                                ) : (
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-slate-900/80 rounded-full border border-white/5 z-20">
                                        <GripVertical className="w-4 h-4 text-slate-500" />
                                    </div>
                                )}

                                <div className="p-3 lg:p-4 pt-8 lg:pt-10 flex flex-col h-full gap-3 lg:gap-4 overflow-hidden">
                                    {/* Stage Identity */}
                                    <div className="flex flex-col items-center text-center gap-1.5 lg:gap-2">
                                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl ${stage.bg} border ${stage.border} flex items-center justify-center relative mb-0.5 lg:mb-1 flex-shrink-0 transition-transform group-hover:scale-105`}>
                                            <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${stage.color.replace('text-', 'bg-')} shadow-[0_0_15px_currentColor]`} />
                                        </div>

                                        {editingStageId === stage.id ? (
                                            <input
                                                autoFocus
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={() => saveEdit(stage.id)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(stage.id)}
                                                className="bg-slate-950 border border-cyan-500/50 rounded-lg px-2 py-1 text-[10px] text-white outline-none w-full font-black text-center uppercase tracking-tighter italic"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1 group/title min-w-0 w-full justify-center">
                                                <span className="text-[10px] lg:text-xs font-black text-white uppercase tracking-wider italic truncate px-0.5">{stage.name}</span>
                                                {!(stage.isFixed || stage.isProtectedName) && (
                                                    <button onClick={() => startEditing(stage)} className="opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 hover:text-cyan-400 flex-shrink-0">
                                                        <Edit2 className="w-2.5 h-2.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Color Picker - Always available as requested */}
                                    <div className="bg-slate-950/40 p-2 lg:p-3 rounded-2xl border border-white/5 flex flex-col items-center">
                                        <div className="flex items-center gap-1.5 mb-1.5 lg:mb-2 opacity-60">
                                            <Palette className="w-2.5 h-2.5 text-slate-500" />
                                            <span className="hidden sm:block text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">Cores</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1 lg:gap-2 justify-center">
                                            {PREDEFINED_COLORS.map((theme) => (
                                                <button
                                                    key={theme.name}
                                                    onClick={() => updateColor(stage.id, theme)}
                                                    className={`
                                                        w-3.5 h-3.5 lg:w-5 lg:h-5 rounded-md transition-all border 
                                                        ${theme.dot} 
                                                        ${stage.color === theme.text ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105 active:scale-90'}
                                                    `}
                                                    title={theme.name}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-auto pt-3 flex justify-between items-center border-t border-white/5">
                                        <div className="flex items-center gap-1 min-w-0">
                                            {(stage.isFixed || stage.isProtectedName) && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-900 border border-white/5 rounded-md truncate">
                                                    <Save className="w-2 h-2 text-slate-600 flex-shrink-0" />
                                                    <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tight truncate">Fix</span>
                                                </div>
                                            )}
                                            {!stage.isFixed && !stage.isProtectedName && (
                                                <span className="text-[8px] font-black text-slate-700 uppercase tracking-tighter truncate opacity-40">v1.0</span>
                                            )}
                                        </div>

                                        {!(stage.isFixed || stage.isProtectedName) && (
                                            <button
                                                onClick={() => handleRemove(stage.id)}
                                                className="p-1 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all flex-shrink-0"
                                                title="Remover Etapa"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add New Stage Card - Compacto & Centralizado */}
                        <button
                            onClick={handleAdd}
                            className="flex-[0.5] min-w-[100px] max-w-[150px] h-[360px] border-2 border-dashed border-white/5 rounded-[28px] text-slate-600 hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all flex flex-col items-center justify-center gap-3 group"
                        >
                            <div className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-all">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-center px-1 leading-relaxed truncate w-full">Nova Etapa</span>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-white/5 bg-slate-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Edição em Tempo Real do Funil</span>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2 text-slate-400 font-bold text-xs uppercase tracking-widest transition-colors hover:text-white">Descartar</button>
                        <button
                            onClick={handleSaveAll}
                            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-[18px] font-black text-xs uppercase tracking-widest shadow-xl shadow-cyan-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Ordem
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
