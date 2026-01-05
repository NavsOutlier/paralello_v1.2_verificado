import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, User } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { Atom } from 'lucide-react';

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
    // Local state for spatial positions if not persisted in DB yet
    const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({});

    // Initialize positions for new messages
    useEffect(() => {
        const newPositions = { ...positions };
        let modified = false;

        messages.forEach((msg, index) => {
            if (!newPositions[msg.id]) {
                // Determine a starting position based on sender
                const row = Math.floor(index / 3);
                const col = index % 3;

                // Spread them out a bit initially
                newPositions[msg.id] = {
                    x: col * 320 + 50 + (Math.random() * 20),
                    y: row * 180 + 50 + (Math.random() * 20)
                };
                modified = true;
            }
        });

        if (modified) {
            setPositions(newPositions);
        }
    }, [messages]);

    const handleDragEnd = (id: string, info: any) => {
        setPositions(prev => ({
            ...prev,
            [id]: {
                x: prev[id].x + info.offset.x,
                y: prev[id].y + info.offset.y
            }
        }));
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-slate-900/5 cursor-grab active:cursor-grabbing select-none p-20">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                className="relative w-[5000px] h-[5000px]"
                drag
                dragConstraints={{ left: -4000, right: 0, top: -4000, bottom: 0 }}
            >
                <AnimatePresence>
                    {messages.map((message) => {
                        const pos = positions[message.id] || { x: 0, y: 0 };
                        const isMe = message.senderId === currentUser?.id && !message.isInternal;
                        const isClient = message.senderType === 'CLIENT';

                        const senderMember = teamMembers.find(m => m.id === message.senderId);
                        const senderName = isClient ? (entity.name || 'Cliente') : (senderMember?.name || 'Sistema');
                        const senderJobTitle = isClient ? 'Contratante' : senderMember?.jobTitle;

                        return (
                            <motion.div
                                key={message.id}
                                layoutId={message.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                drag
                                dragMomentum={false}
                                onDragEnd={(_, info) => handleDragEnd(message.id, info)}
                                className="absolute z-10 w-[300px]"
                                style={{ transformOrigin: 'center center' }}
                            >
                                <div className="group relative">
                                    {/* Drag Handle indicator */}
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-md px-2 py-0.5 rounded-full shadow-sm border border-slate-100 flex items-center gap-1">
                                        <Atom className="w-3 h-3 text-indigo-400 animate-spin-slow" />
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Movimentar</span>
                                    </div>

                                    <MessageBubble
                                        msg={message}
                                        isMe={isMe}
                                        senderName={senderName}
                                        senderJobTitle={senderJobTitle}
                                        onInitiateDiscussion={onInitiateDiscussion}
                                        onNavigateToLinked={(id) => onNavigateToTask?.(id)}
                                        colorScheme={isClient ? 'green' : 'indigo'}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>

            {/* Hint for context */}
            <div className="absolute bottom-6 left-6 z-50 bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-xl pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Fluxo: Distorção da Linha do Tempo</span>
                </div>
            </div>
        </div>
    );
};
