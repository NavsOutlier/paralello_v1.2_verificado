import React, { useState } from 'react';
import { Plus, Trash2, Loader2, MessageSquare, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
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
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Canais de WhatsApp</h2>
                <p className="text-slate-500 text-sm">Gerencie suas conexões com a Uazapi para atendimento omnichannel.</p>
            </div>

            {/* Creation Area - Only show if no instance exists */}
            {instances.length === 0 && (
                <Card className="p-6 border-slate-200/60 bg-white/50 backdrop-blur-sm shadow-sm">
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Adicionar Nova Instância</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newInstanceName}
                                onChange={(e) => setNewInstanceName(e.target.value)}
                                placeholder="Ex: Comercial, Suporte Brasil..."
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            />
                            <Button
                                onClick={handleCreate}
                                disabled={isCreating || !newInstanceName.trim()}
                                className="px-6 rounded-xl font-bold shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Criar Instância
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Instance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {instances.length === 0 ? (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <div className="inline-flex p-4 rounded-2xl bg-white shadow-sm border border-slate-100 mb-4">
                            <MessageSquare className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">Nenhum canal configurado ainda.</p>
                    </div>
                ) : (
                    instances.map((inst) => (
                        <Card key={inst.id} className="relative group overflow-hidden border-slate-200/60 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 rounded-3xl">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-2xl transition-colors ${['connected', 'conectado'].includes(inst.status) ? 'bg-emerald-50 text-emerald-600' :
                                            inst.status === 'waiting_scan' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
                                            }`}>
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 leading-tight">{inst.name}</h4>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${['connected', 'conectado'].includes(inst.status) ? 'bg-emerald-500' :
                                                    inst.status === 'waiting_scan' ? 'bg-amber-500' : 'bg-slate-300'
                                                    }`} />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    {inst.status === 'waiting_scan' ? 'Aguardando Scan' : inst.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(inst.id)}
                                        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Dynamic Content based on Status */}
                                {inst.status === 'waiting_scan' && inst.qrCode ? (
                                    <div className="flex flex-col items-center gap-4 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 animate-in zoom-in-95 duration-300">
                                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                            <img src={inst.qrCode} alt="WhatsApp QR Code" className="w-36 h-36 grayscale-[0.2] contrast-[1.1]" />
                                            <div className="absolute inset-0 border-2 border-indigo-500/20 pointer-events-none rounded-xl" />
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
                                            <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin-slow" />
                                            <span className="text-[10px] font-bold text-slate-600">Escaneie no seu WhatsApp</span>
                                        </div>
                                    </div>
                                ) : ['connected', 'conectado'].includes(inst.status) ? (
                                    <div className="flex flex-col items-center justify-center py-6 bg-emerald-50/30 rounded-2xl border border-emerald-100 overflow-hidden relative">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 drop-shadow-sm" />
                                        <span className="text-xs font-bold text-emerald-700">Conectado com Sucesso</span>
                                        <div className="absolute top-0 right-0 p-2 opacity-20 translate-x-4 -translate-y-4">
                                            <MessageSquare className="w-20 h-20 text-emerald-600" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Iniciando Sessão...</span>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-medium text-slate-400 font-mono">
                                    ID: {inst.instanceApiId || 'PENDENTE'}
                                </span>
                                <Badge variant={['connected', 'conectado'].includes(inst.status) ? 'success' : 'secondary'} className="rounded-full text-[9px] px-2 py-0.5 border-none shadow-sm">
                                    Ready to Chat
                                </Badge>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};
