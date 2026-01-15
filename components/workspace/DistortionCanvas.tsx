import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, User } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { Move, MousePointer2, Hand, Type, X } from 'lucide-react';

interface CanvasLabel {
    id: string;
    text: string;
    x: number;
    y: number;
}

interface DistortionCanvasProps {
    messages: Message[];
    currentUser: User | null;
    teamMembers: User[];
    entity: User;
    onInitiateDiscussion?: (message: Message) => void;
    onNavigateToTask?: (taskId: string) => void;
    positions: Record<string, { x: number, y: number }>;
    setPositions: (positions: Record<string, { x: number, y: number }>) => void;
    labels: CanvasLabel[];
    setLabels: (labels: CanvasLabel[]) => void;
}

const ZOOM_LEVEL = 0.8;

export const DistortionCanvas: React.FC<DistortionCanvasProps> = ({
    messages,
    currentUser,
    teamMembers,
    entity,
    onInitiateDiscussion,
    onNavigateToTask,
    positions,
    setPositions,
    labels,
    setLabels
}) => {
    // --- State ---
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    // --- Refs ---
    const canvasRef = useRef<HTMLDivElement>(null);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // --- Layout Initialization ---
    useEffect(() => {
        const newPositions = { ...positions };
        let modified = false;
        let globalRowIndex = 0;

        messages.forEach((msg) => {
            if (!newPositions[msg.id]) {
                const isMe = msg.senderId === currentUser?.id && !msg.isInternal;
                const isClient = msg.senderType === 'CLIENT';
                const col = isClient ? 0 : (isMe ? 2 : 1);

                newPositions[msg.id] = {
                    x: col * 380 + 60,
                    y: globalRowIndex * 140 + 40
                };
                globalRowIndex++;
                modified = true;
            }
        });
        if (modified) setPositions(newPositions);
    }, [messages, currentUser?.id]);

    // --- Mouse & Touch Event Handlers ---
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            setCameraOffset(prev => ({ ...prev, y: prev.y - e.deltaY }));
        };

        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('wheel', handleWheel, { passive: false });
            canvas.oncontextmenu = (e) => e.preventDefault();
        }
        return () => {
            if (canvas) {
                canvas.removeEventListener('wheel', handleWheel);
                canvas.oncontextmenu = null;
            }
        };
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        if (e.button === 2) {
            setIsPanning(true);
            return;
        }

        if (e.button === 0) {
            if (target.closest('.message-bubble-container')) return;
            setSelectionBox({ start: { x, y }, end: { x, y } });
            if (!e.shiftKey) setSelectedIds(new Set());
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        if (isPanning) {
            const dy = e.clientY - lastMousePos.current.y;
            setCameraOffset(prev => ({ ...prev, y: prev.y + dy }));
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (selectionBox) {
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            setSelectionBox(prev => prev ? { ...prev, end: { x: currentX, y: currentY } } : null);

            const x1 = Math.min(selectionBox.start.x, currentX);
            const y1 = Math.min(selectionBox.start.y, currentY);
            const x2 = Math.max(selectionBox.start.x, currentX);
            const y2 = Math.max(selectionBox.start.y, currentY);

            const newSelected = new Set<string>();

            // Check Messages
            messages.forEach(msg => {
                const pos = positions[msg.id];
                if (!pos) return;

                const vx = (pos.x * ZOOM_LEVEL) + cameraOffset.x;
                const vy = (pos.y * ZOOM_LEVEL) + cameraOffset.y;
                const vw = 250 * ZOOM_LEVEL;
                const vh = 80 * ZOOM_LEVEL;

                if (vx < x2 && vx + vw > x1 && vy < y2 && vy + vh > y1) {
                    newSelected.add(msg.id);
                }
            });

            // Check Labels
            labels.forEach(label => {
                const vx = (label.x * ZOOM_LEVEL) + cameraOffset.x;
                const vy = (label.y * ZOOM_LEVEL) + cameraOffset.y;
                const vw = 150 * ZOOM_LEVEL; // Estimated label width
                const vh = 40 * ZOOM_LEVEL;  // Estimated label height

                if (vx < x2 && vx + vw > x1 && vy < y2 && vy + vh > y1) {
                    newSelected.add(label.id);
                }
            });

            setSelectedIds(newSelected);
        }
    };

    // --- Drag & Label Actions ---
    const handleDragStart = (id: string) => {
        setDraggedItemId(id);
        if (!selectedIds.has(id)) setSelectedIds(new Set([id]));
    };

    const handleDrag = (id: string, info: any) => {
        const { delta } = info;
        if (selectedIds.has(id)) {
            // Move Messages
            setPositions(prev => {
                const next = { ...prev };
                selectedIds.forEach(selectedId => {
                    if (selectedId !== id && next[selectedId]) {
                        next[selectedId] = {
                            x: next[selectedId].x + delta.x / ZOOM_LEVEL,
                            y: next[selectedId].y + delta.y / ZOOM_LEVEL
                        };
                    }
                });
                return next;
            });

            // Move Labels
            setLabels(prev => prev.map(l => {
                if (selectedIds.has(l.id) && l.id !== id) {
                    return {
                        ...l,
                        x: l.x + delta.x / ZOOM_LEVEL,
                        y: l.y + delta.y / ZOOM_LEVEL
                    };
                }
                return l;
            }));
        }
    };

    const handleDragEnd = (id: string, info: any) => {
        setDraggedItemId(null);
        const { offset } = info;

        // Final Sync for Messages
        setPositions(prev => {
            const next = { ...prev };
            if (next[id]) {
                next[id] = {
                    x: next[id].x + offset.x / ZOOM_LEVEL,
                    y: next[id].y + offset.y / ZOOM_LEVEL
                };
            }
            return next;
        });

        // Final Sync for Labels
        if (id.startsWith('label-')) {
            setLabels(prev => prev.map(l => {
                if (l.id === id) {
                    return {
                        ...l,
                        x: l.x + offset.x / ZOOM_LEVEL,
                        y: l.y + offset.y / ZOOM_LEVEL
                    };
                }
                return l;
            }));
        }
    };

    const addLabel = () => {
        const newLabel: CanvasLabel = {
            id: `label-${Date.now()}`,
            text: 'Novo Título',
            x: 100 + (cameraOffset.x * -1) / ZOOM_LEVEL,
            y: 50 + (cameraOffset.y * -1) / ZOOM_LEVEL
        };
        setLabels([...labels, newLabel]);
        setEditingLabelId(newLabel.id);
    };

    // --- Render Helpers ---
    const memoizedMessages = useMemo(() => messages.map((message) => {
        const pos = positions[message.id] || { x: 0, y: 0 };
        const isMe = message.senderId === currentUser?.id && !message.isInternal;
        const isClient = message.senderType === 'CLIENT';
        const isSelected = selectedIds.has(message.id);
        const senderMember = teamMembers.find(m => m.id === message.senderId);
        const senderName = isClient ? (entity.name || 'Cliente') : (senderMember?.name || 'Sistema');

        return (
            <motion.div
                key={message.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                    opacity: 1,
                    scale: isSelected ? 1.05 : 1,
                    x: pos.x,
                    y: pos.y,
                    zIndex: isSelected ? 50 : 10
                }}
                transition={{
                    x: { type: "tween", ease: "linear", duration: 0 },
                    y: { type: "tween", ease: "linear", duration: 0 },
                    scale: { type: 'spring', stiffness: 300, damping: 25 },
                    opacity: { duration: 0.2 }
                }}
                drag
                dragMomentum={false}
                onDragStart={() => handleDragStart(message.id)}
                onDrag={(e, info) => handleDrag(message.id, info)}
                onDragEnd={(e, info) => handleDragEnd(message.id, info)}
                className="absolute w-fit message-bubble-container"
                style={{ touchAction: 'none' }}
            >
                {/* Selection Label */}
                <div className={`absolute -top-5 right-0 flex items-center gap-2 px-2 py-0.5 bg-white border border-slate-100 shadow-md rounded-md transition-all duration-300 z-10 ${isSelected ? 'opacity-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                    <Move className={`w-2.5 h-2.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`text-[8px] font-black uppercase tracking-wider ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isSelected ? 'Selecionado' : 'Arrastar'}
                    </span>
                </div>
                <MessageBubble
                    msg={message}
                    isMe={isMe}
                    senderName={senderName}
                    senderJobTitle={isClient ? 'Contratante' : senderMember?.jobTitle}
                    onInitiateDiscussion={onInitiateDiscussion}
                    onNavigateToLinked={(id) => onNavigateToTask?.(id)}
                    colorScheme={isClient ? 'green' : 'indigo'}
                />
            </motion.div>
        );
    }), [messages, positions, selectedIds, currentUser, teamMembers, entity]);

    return (
        <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => { setSelectionBox(null); setIsPanning(false); }}
            onMouseLeave={() => { setSelectionBox(null); setIsPanning(false); }}
            className={`relative w-full h-full overflow-hidden bg-slate-900/[0.03] select-none ${isPanning ? 'cursor-grabbing' : selectionBox ? 'cursor-crosshair' : 'cursor-default'}`}
        >
            {/* Background Grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                    backgroundSize: `${32 * ZOOM_LEVEL}px ${32 * ZOOM_LEVEL}px`,
                    backgroundPosition: `0px ${cameraOffset.y}px`,
                }}
            />

            <motion.div
                className="w-full h-full origin-top-left"
                animate={{ scale: ZOOM_LEVEL, y: cameraOffset.y }}
                transition={{ scale: { type: 'spring', stiffness: 300, damping: 30 }, y: { duration: 0 } }}
            >
                <AnimatePresence>{memoizedMessages}</AnimatePresence>

                {/* Canvas Labels */}
                {labels.map((label) => {
                    const isSelected = selectedIds.has(label.id);
                    return (
                        <motion.div
                            key={label.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: 1,
                                scale: isSelected ? 1.05 : 1,
                                x: label.x,
                                y: label.y,
                                zIndex: isSelected ? 50 : 5
                            }}
                            transition={{ x: { duration: 0 }, y: { duration: 0 } }}
                            drag
                            dragMomentum={false}
                            onDragStart={() => handleDragStart(label.id)}
                            onDrag={(e, info) => handleDrag(label.id, info)}
                            onDragEnd={(e, info) => handleDragEnd(label.id, info)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute group select-none"
                        >
                            <div className="relative">
                                {editingLabelId === label.id ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        value={label.text}
                                        onChange={(e) => setLabels(labels.map(l => l.id === label.id ? { ...l, text: e.target.value } : l))}
                                        onBlur={() => setEditingLabelId(null)}
                                        onKeyDown={(e) => e.key === 'Enter' && setEditingLabelId(null)}
                                        className="px-3 py-1.5 text-lg font-bold text-slate-800 bg-yellow-100 border-2 border-yellow-400 rounded-lg outline-none min-w-[150px] select-text shadow-xl"
                                    />
                                ) : (
                                    <div
                                        onDoubleClick={() => setEditingLabelId(label.id)}
                                        className={`px-3 py-1.5 text-lg font-bold text-slate-800 rounded-lg cursor-move transition-all duration-300 border-2 ${isSelected
                                            ? 'bg-yellow-200 border-yellow-500 shadow-lg shadow-yellow-500/20 scale-105'
                                            : 'bg-yellow-100/90 border-yellow-300 hover:bg-yellow-100'
                                            }`}
                                    >
                                        {label.text}
                                    </div>
                                )}
                                <button
                                    onClick={() => setLabels(labels.filter(l => l.id !== label.id))}
                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Lasso Tool */}
            {selectionBox && (
                <div
                    className="absolute border-2 border-indigo-500/40 bg-indigo-500/5 pointer-events-none z-[100] rounded-sm backdrop-blur-[1px]"
                    style={{
                        left: Math.min(selectionBox.start.x, selectionBox.end.x),
                        top: Math.min(selectionBox.start.y, selectionBox.end.y),
                        width: Math.abs(selectionBox.start.x - selectionBox.end.x),
                        height: Math.abs(selectionBox.start.y - selectionBox.end.y)
                    }}
                />
            )}

            {/* HUD */}
            <div className="absolute bottom-6 left-6 z-50 flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/40 shadow-2xl flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Distorção v2</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-4 text-slate-400 pointer-events-none text-[9px] font-bold uppercase">
                        <div className="flex items-center gap-1.5">
                            <Hand className="w-3 h-3" />
                            <span>Scroll: Panorâmica</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MousePointer2 className="w-3 h-3" />
                            <span>Laço de Seleção</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Move className="w-3 h-3" />
                            <span>Arrastar</span>
                        </div>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <button
                        onClick={addLabel}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors pointer-events-auto"
                    >
                        <Type className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase">Adicionar Título</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
