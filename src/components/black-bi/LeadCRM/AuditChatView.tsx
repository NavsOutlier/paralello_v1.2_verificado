import React from 'react';
import { Bot, User } from 'lucide-react';

interface AuditChatViewProps {
    leadId: string;
}

export const AuditChatView: React.FC<AuditChatViewProps> = ({ leadId }) => {
    // This will eventually fetch real messages based on leadId
    const messages = [
        { id: '1', role: 'ai', text: 'Olá, Carlos! Vi que você se interessou pelo nosso plano Enterprise. Como posso ajudar com suas dúvidas?', time: '10:00' },
        { id: '2', role: 'lead', text: 'Oi, queria saber sobre os limites de integrações.', time: '10:05' },
        { id: '3', role: 'ai', text: 'Excelente pergunta! No plano Enterprise não há limites de integrações via API Oficial. Além disso, você tem suporte dedicado 24/7.', time: '10:06' },
        { id: '4', role: 'ai', text: '[ Mensagem Sistêmica: Aumentou Score em +15. Intenção de compra detectada. ]', time: '10:06', system: true },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-950/50">
            <div className="p-4 border-b border-white/5 bg-slate-900">
                <p className="text-xs text-slate-400 font-mono">
                    Auditoria de Conversa: Aqui você lê as interações em tempo real. Intervenções humanas pausam a IA.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map(msg => {
                    if (msg.system) {
                        return (
                            <div key={msg.id} className="flex justify-center">
                                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-3 py-1 border border-emerald-500/20">
                                    {msg.text}
                                </span>
                            </div>
                        );
                    }

                    const isAI = msg.role === 'ai';
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
                            {isAI && (
                                <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4 text-emerald-500" />
                                </div>
                            )}

                            <div className={`max-w-[75%] p-3 text-sm ${isAI
                                    ? 'bg-slate-900 border border-slate-700 text-slate-300 rounded-tr-xl rounded-b-xl'
                                    : 'bg-cyan-900/30 border border-cyan-500/30 text-cyan-100 rounded-tl-xl rounded-b-xl'
                                }`}>
                                <p>{msg.text}</p>
                                <span className={`text-[9px] font-mono block mt-2 ${isAI ? 'text-slate-500' : 'text-cyan-500/50'}`}>
                                    {msg.time}
                                </span>
                            </div>

                            {!isAI && (
                                <div className="w-8 h-8 rounded bg-cyan-900/50 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-cyan-400" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t border-white/5 bg-slate-900">
                <button className="w-full py-3 bg-orange-500 text-orange-950 font-black text-sm hover:bg-orange-400 transition-colors shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                    ASSUMIR ATENDIMENTO (PAUSAR IA)
                </button>
            </div>
        </div>
    );
};
