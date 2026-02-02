import React, { useState } from 'react';
import { Plus, Trash2, Loader2, MessageSquare, RefreshCw, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface WhatsAppManagerProps {
    organizationId: string;
}

export const WhatsAppManager: React.FC<WhatsAppManagerProps> = ({ organizationId }) => {
    const { instances, loading, createInstance, deleteInstance } = useWhatsApp(undefined, { onlyOrg: true });
    const [newInstanceName, setNewInstanceName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!newInstanceName.trim()) return;
        setIsCreating(true);
        try {
            const { error } = await createInstance(newInstanceName.trim());
            if (error) alert('Erro ao solicitar instância: ' + (error.message || 'Erro desconhecido'));
            else setNewInstanceName('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja remover esta instância?')) {
            await deleteInstance(id);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-1 mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <MessageSquare className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Canais de WhatsApp</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">POWERED BY UAZAPI</span>
                        </div>
                    </div>
                </div>
                <p className="text-slate-400 text-sm pl-16">Gerencie suas conexões de WhatsApp para atendimento omnichannel.</p>
            </div>

            {/* Creation Area - Only show if no instance exists */}
            {instances.length === 0 && (
                <div className="p-6 border border-white/10 bg-slate-900/40 backdrop-blur-xl rounded-2xl shadow-xl">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-emerald-400 mb-2">
                            <Zap className="w-4 h-4" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Adicionar Nova Instância</h3>
                        </div>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newInstanceName}
                                onChange={(e) => setNewInstanceName(e.target.value)}
                                placeholder="Ex: Comercial, Suporte Brasil..."
                                className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none text-white placeholder:text-slate-600"
                            />
                            <button
                                onClick={handleCreate}
                                disabled={isCreating || !newInstanceName.trim()}
                                className="px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 transition-all disabled:opacity-50 border border-white/10 flex items-center gap-2"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Criar Instância
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {instances.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20 group hover:bg-slate-900/30 transition-colors">
                        <div className="inline-flex p-5 rounded-2xl bg-white/5 border border-white/5 mb-4 group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <p className="text-slate-400 font-bold text-lg">Nenhum canal configurado</p>
                        <p className="text-slate-600 text-sm mt-1">Crie sua primeira instância acima para começar</p>
                    </div>
                ) : (
                    instances.map((inst) => (
                        <div key={inst.id} className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 rounded-3xl">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-2xl transition-colors shadow-inner ${['connected', 'conectado'].includes(inst.status) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            inst.status === 'waiting_scan' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-white/5'
                                            }`}>
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white leading-tight">{inst.name}</h4>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${['connected', 'conectado'].includes(inst.status) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' :
                                                    inst.status === 'waiting_scan' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-slate-500'
                                                    }`} />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    {inst.status === 'waiting_scan' ? 'Aguardando Scan' : inst.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(inst.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                                        title="Remover Instância"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Dynamic Content based on Status */}
                                {inst.status === 'waiting_scan' && inst.qrCode ? (
                                    <div className="flex flex-col items-center gap-4 bg-slate-950/50 rounded-2xl p-4 border border-white/10 animate-in zoom-in-95 duration-300">
                                        <div className="bg-white p-2 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group/qr">
                                            <img src={inst.qrCode} alt="WhatsApp QR Code" className="w-36 h-36 contrast-[1.1]" />
                                            <div className="absolute inset-0 border-4 border-emerald-500/20 pointer-events-none rounded-xl" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover/qr:opacity-100 transition-opacity">
                                                {/* Scan overlay effect */}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/20 rounded-full border border-emerald-500/20 shadow-sm">
                                            <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin-slow" />
                                            <span className="text-[10px] font-bold text-emerald-200">Escaneie no seu WhatsApp</span>
                                        </div>
                                    </div>
                                ) : ['connected', 'conectado'].includes(inst.status) ? (
                                    <div className="flex flex-col items-center justify-center py-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 overflow-hidden relative">
                                        <div className="bg-emerald-500/10 p-3 rounded-full mb-2 animate-pulse">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                        </div>
                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Online</span>
                                        <div className="absolute top-0 right-0 p-2 opacity-10 translate-x-4 -translate-y-4">
                                            <MessageSquare className="w-20 h-20 text-emerald-400" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 bg-slate-800/20 rounded-2xl border border-dashed border-white/5">
                                        <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Iniciando Sessão...</span>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-medium text-slate-500 font-mono">
                                    ID: <span className="text-slate-400">{inst.instanceApiId?.substring(0, 8)}...</span>
                                </span>
                                <Badge variant={['connected', 'conectado'].includes(inst.status) ? 'success' : 'secondary'} className="rounded-full text-[9px] px-2 py-0.5 border-none shadow-none bg-white/5 text-slate-300">
                                    Integration Ready
                                </Badge>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
