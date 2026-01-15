import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, User } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { Move, MousePointer2, Hand } from 'lucide-react';

interface DistortionCanvasProps {
    messages: Message[];
    currentUser: User | null;
    teamMembers: User[];
    entity: User;
    onInitiateDiscussion?: (message: Message) => void;
    onNavigateToTask?: (taskId: string) => void;
}

export const DistortionCanvas: React.FC<DistortionCanvasProps> = ({
    messages,
    currentUser,
    teamMembers,
    entity,
    onInitiateDiscussion,
    onNavigateToTask
}) => {
    const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({});
    const [zoom, setZoom] = useState(1);
    const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Track message counts per column for vertical stacking
    const columnCounters = useRef({ client: 0, team: 0, me: 0 });

    // Initial positions matching standard view layout (Client left, Team center, User right)
    useEffect(() => {
        const newPositions = { ...positions };
        let modified = false;

        // Reset counters when messages change significantly
        const existingCount = Object.keys(positions).length;
        if (existingCount === 0) {
            columnCounters.current = { client: 0, team: 0, me: 0 };
        }

        messages.forEach((msg) => {
            if (!newPositions[msg.id]) {
                const isMe = msg.senderId === currentUser?.id && !msg.isInternal;
                const isClient = msg.senderType === 'CLIENT';
                const isSystem = msg.isInternal || msg.text?.toLowerCase().includes('tarefa criada');

                let col: number;
                let rowIndex: number;

                if (isClient) {
                    // Client messages: Left column
                    col = 0;
                    rowIndex = columnCounters.current.client++;
                } else if (isMe) {
                    // Current user messages: Right column
                    col = 2;
                    rowIndex = columnCounters.current.me++;
                } else {
                    // Team/System messages: Center column
                    col = 1;
                    rowIndex = columnCounters.current.team++;
                }

                newPositions[msg.id] = {
                    x: col * 360 + 100,
                    y: rowIndex * 180 + 100
                };
                modified = true;
            }
        });
        if (modified) setPositions(newPositions);
    }, [messages, currentUser?.id]);

    // Global event listeners for zoom and panning
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault(); // Prevent page scroll

            if (e.ctrlKey) {
                const scaleAmount = 0.1;
                if (e.deltaY < 0) {
                    setZoom(z => Math.min(z + scaleAmount, 3));
                } else {
                    setZoom(z => Math.max(z - scaleAmount, 0.2));
                }
            } else {
                // Vertical Pan with Scroll Wheel
                setCameraOffset(prev => ({ ...prev, y: prev.y - e.deltaY }));
            }
        };

        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('wheel', handleWheel, { passive: false });
            // Disable context menu for right-click panning
            canvas.oncontextmenu = (e) => e.preventDefault();
        }
        return () => {
            if (canvas) {
                canvas.removeEventListener('wheel', handleWheel);
                canvas.oncontextmenu = null;
            }
        };
    }, []);

    // Selection Lasso & Panning Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        if (e.button === 2) {
            // Right Click: Start Panning
            setIsPanning(true);
            return;
        }

        if (e.button === 0) {
            // Left Click: Lasso or Item Click
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
            messages.forEach(msg => {
                const pos = positions[msg.id];
                if (!pos) return;

                // Adjust for camera offset and zoom to check selection
                const vx = (pos.x * zoom) + cameraOffset.x;
                const vy = (pos.y * zoom) + cameraOffset.y;
                const vw = 300 * zoom;
                const vh = 100 * zoom;

                if (vx < x2 && vx + vw > x1 && vy < y2 && vy + vh > y1) {
                    newSelected.add(msg.id);
                }
            });
            setSelectedIds(newSelected);
        }
    };

    const handleMouseUp = () => {
        setSelectionBox(null);
        setIsPanning(false);
    };

    const handleDragStart = (id: string) => {
        if (!selectedIds.has(id)) setSelectedIds(new Set([id]));
    };

    const handleDragEnd = (id: string, info: any) => {
        const { offset } = info;
        setPositions(prev => {
            const next = { ...prev };
            selectedIds.forEach(selectedId => {
                if (next[selectedId]) {
                    next[selectedId] = {
                        x: next[selectedId].x + offset.x / zoom,
                        y: next[selectedId].y + offset.y / zoom
                    };
                }
            });
            return next;
        });
    };

    return (
        <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative w-full h-full overflow-hidden bg-slate-900/[0.03] select-none ${isPanning ? 'cursor-grabbing' : selectionBox ? 'cursor-crosshair' : 'cursor-default'}`}
        >
            {/* Background Grid Accent */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                style={{
                    backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                    backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
                    backgroundPosition: `0px ${cameraOffset.y}px`,
                    opacity: 0.1
                }}
            />

            <motion.div
                className="w-full h-full origin-top-left"
                animate={{
                    scale: zoom,
                    x: 0,
                    y: cameraOffset.y
                }}
                transition={{
                    scale: { type: 'spring', stiffness: 300, damping: 30 },
                    x: { duration: 0 },
                    y: { duration: 0 }
                }}
            >
                <AnimatePresence>
                    {messages.map((message) => {
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
                                    x: { duration: 0 },
                                    y: { duration: 0 },
                                    scale: { type: 'spring', stiffness: 300, damping: 25 },
                                    opacity: { duration: 0.2 }
                                }}
                                drag
                                dragMomentum={false}
                                onDragStart={() => handleDragStart(message.id)}
                                onDragEnd={(_, info) => handleDragEnd(message.id, info)}
                                className="absolute w-[300px] message-bubble-container"
                            >
                                <div className="group relative">
                                    {isSelected && (
                                        <div className="absolute -inset-6 bg-indigo-500/10 rounded-[2rem] blur-2xl -z-10 animate-pulse" />
                                    )}

                                    <div className={`absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 shadow-xl rounded-full transition-all duration-300 ${isSelected ? 'opacity-100 -translate-y-1' : 'opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100'}`}>
                                        <Move className={`w-3 h-3 ${isSelected ? 'text-indigo-600 animate-bounce' : 'text-slate-400'}`} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {isSelected ? 'Agrupado' : 'Arrastar'}
                                        </span>
                                    </div>

                                    <div className={`transition-all duration-300 ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-4 rounded-[1.25rem]' : ''}`}>
                                        <MessageBubble
                                            msg={message}
                                            isMe={isMe}
                                            senderName={senderName}
                                            senderJobTitle={isClient ? 'Contratante' : senderMember?.jobTitle}
                                            onInitiateDiscussion={onInitiateDiscussion}
                                            onNavigateToLinked={(id) => onNavigateToTask?.(id)}
                                            colorScheme={isClient ? 'green' : 'indigo'}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>

            {/* Selection Lasso Box */}
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

            {/* Controls HUD */}
            <div className="absolute bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/40 shadow-2xl flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Distortion Engine v2</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-4 text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <Hand className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase">Botão Direito / Scroll: Mover Vertical</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MousePointer2 className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase whitespace-nowrap">Left-Click Lasso</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-600">
                                <span className="opacity-50">CTRL</span> + <span className="opacity-50">Wheel</span>
                            </div>
                            <span className="text-[9px] font-bold uppercase text-indigo-600">{Math.round(zoom * 100)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
