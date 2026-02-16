import React from 'react';
import { X, CheckCircle2, AlertCircle, ChevronRight, ExternalLink, ArrowLeft, Trash2 } from 'lucide-react';
import { PremiumBackground } from '../ui/PremiumBackground';

export interface IntegrationOption {
    id: string;
    name: string;
    description: string;
    icon: string; // URL or component
    status: 'connected' | 'disconnected' | 'pending';
    actionLabel: string;
    onAction: () => void;
    onDisconnect?: () => void;
    connectedDate?: string;
    accountDetails?: {
        name: string;
        id: string;
    };
}

interface IntegrationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    integrations: IntegrationOption[];
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose, integrations }) => {
    const [disconnectingId, setDisconnectingId] = React.useState<string | null>(null);

    if (!isOpen) return null;

    const handleConfirmDisconnect = () => {
        if (disconnectingId) {
            const integration = integrations.find(i => i.id === disconnectingId);
            integration?.onDisconnect?.();
            setDisconnectingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl bg-[#0d121f] rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <PremiumBackground />

                {/* Header */}
                <div className="relative z-10 px-8 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 -ml-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-bold uppercase tracking-widest hidden sm:block">Voltar</span>
                        </button>
                        <div className="h-8 w-px bg-white/10 mx-2" />
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight mb-1">Integrações</h3>
                            <p className="text-xs font-bold uppercase text-slate-500 tracking-widest">
                                Gerencie suas conexões
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="relative z-10 p-8 grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar">
                    {integrations.map((integration) => (
                        <div
                            key={integration.id}
                            className={`group relative overflow-hidden rounded-[2rem] border transition-all duration-300 ${integration.status === 'connected'
                                ? 'bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/30'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                }`}
                        >
                            <div className="p-6 flex items-center gap-6">
                                {/* Icon */}
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center p-3 shadow-lg transition-transform group-hover:scale-105 ${integration.status === 'connected'
                                    ? 'bg-[#0b101b] border border-emerald-500/20'
                                    : 'bg-[#0b101b] border border-white/5'
                                    }`}>
                                    <img src={integration.icon} alt={integration.name} className="w-full h-full object-contain" />
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-lg font-bold text-white tracking-tight">{integration.name}</h4>
                                        {integration.status === 'connected' && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Ativo</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-md">
                                        {integration.description}
                                    </p>
                                    {integration.connectedDate && (
                                        <p className="text-[10px] text-slate-600 mt-2 font-mono">
                                            Conectado em: {integration.connectedDate}
                                        </p>
                                    )}
                                    {integration.accountDetails && (
                                        <div className="mt-2 text-[10px] bg-white/5 rounded-lg p-2 border border-white/5 inline-block">
                                            <p className="text-slate-300 font-bold mb-0.5">{integration.accountDetails.name}</p>
                                            <p className="text-slate-500 font-mono">ID: {integration.accountDetails.id}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={integration.onAction}
                                        className={`relative z-20 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${integration.status === 'connected'
                                            ? 'bg-[#0b101b] text-slate-300 border border-white/10 hover:border-white/20 hover:text-white'
                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                                            }`}
                                    >
                                        {integration.status === 'connected' ? 'Configurar' : 'Conectar'}
                                        {integration.status === 'connected' ? <SettingsIcon className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>

                                    {integration.status === 'connected' && integration.onDisconnect && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDisconnectingId(integration.id);
                                            }}
                                            className="px-6 py-2 rounded-xl text-[10px] font-bold text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Desconectar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Disconnect Confirmation Modal Overlay */}
                {disconnectingId && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-8 animate-in fade-in duration-200">
                        <div className="bg-[#0d121f] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
                            <PremiumBackground />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-xl font-black text-white mb-2 tracking-tight">Desconectar Integração?</h3>
                                <p className="text-slate-400 text-xs font-medium mb-8 leading-relaxed">
                                    Tem certeza que deseja remover esta conexão? Os dados pararam de ser sincronizados.
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setDisconnectingId(null)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirmDisconnect}
                                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        Desconectar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper for icon since Settings is not imported above properly if I use it inline
function SettingsIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}
