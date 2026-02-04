import React, { useState, useEffect } from 'react';
import { X, MessageSquare, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Organization, WhatsAppInstance } from '../../types';
import { Button, Badge } from '../ui';
import { supabase } from '../../lib/supabase';

interface AdminOrgSetupModalProps {
    organization: Organization | null;
    isOpen: boolean;
    onClose: () => void;
}

export const AdminOrgSetupModal: React.FC<AdminOrgSetupModalProps> = ({
    organization,
    isOpen,
    onClose
}) => {
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && organization) {
            fetchInstances();

            const channel = supabase
                .channel(`admin-setup-${organization.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'instances',
                        filter: `organization_id=eq.${organization.id}`
                    },
                    () => fetchInstances()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isOpen, organization]);

    const fetchInstances = async () => {
        if (!organization) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('instances')
                .select('*')
                .eq('organization_id', organization.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setInstances((data || []).map(inst => ({
                id: inst.id,
                organizationId: inst.organization_id,
                name: inst.name,
                status: inst.status,
                qrCode: inst.qr_code,
                instanceApiId: inst.instance_api_id,
                instanceApiToken: inst.instance_api_token,
                createdAt: new Date(inst.created_at),
                updatedAt: new Date(inst.updated_at)
            })));
        } catch (error) {
            console.error('Error fetching instances for admin:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !organization) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                            <RefreshCw className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Setup Assistant</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{organization.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-slate-950/40 rounded-3xl border border-white/5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Dono (Owner)</span>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className={`w-4 h-4 ${organization.onboardingStatus?.isOwnerActive ? 'text-emerald-500' : 'text-slate-600'}`} />
                                <span className={`text-sm font-bold ${organization.onboardingStatus?.isOwnerActive ? 'text-white' : 'text-slate-500'}`}>
                                    {organization.onboardingStatus?.isOwnerActive ? 'Já acessou o painel' : 'Aguardando primeiro acesso'}
                                </span>
                            </div>
                        </div>
                        <div className="p-5 bg-slate-950/40 rounded-3xl border border-white/5">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">WhatsApp</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${organization.onboardingStatus?.isWhatsAppConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-600'}`} />
                                <span className={`text-sm font-bold ${organization.onboardingStatus?.isWhatsAppConnected ? 'text-white' : 'text-slate-500'}`}>
                                    {organization.onboardingStatus?.isWhatsAppConnected ? 'Conectado e Operacional' : 'Desconectado'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                            <MessageSquare className="w-4 h-4 text-indigo-400" />
                            Canais de WhatsApp (Remoto)
                        </h3>

                        {loading ? (
                            <div className="py-12 flex justify-center">
                                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                            </div>
                        ) : instances.length === 0 ? (
                            <div className="text-center py-16 bg-slate-950/40 rounded-[2rem] border-2 border-dashed border-white/5">
                                <p className="text-slate-500 text-sm font-bold">Nenhuma instância criada pelo cliente ainda.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {instances.map((inst) => (
                                    <div key={inst.id} className="p-6 border border-white/5 rounded-[2rem] bg-slate-950/40 hover:border-indigo-500/30 transition-all group/inst">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 rounded-2xl ${['connected', 'conectado'].includes(inst.status) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                    <MessageSquare className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-white text-sm group-hover/inst:text-cyan-400 transition-colors uppercase tracking-tight">{inst.name}</h4>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{inst.status}</span>
                                                </div>
                                            </div>
                                            <Badge variant={inst.status === 'conectado' ? 'success' : 'warning'}>
                                                {inst.status === 'conectado' ? 'Ativa' : 'Pendente'}
                                            </Badge>
                                        </div>

                                        {inst.status === 'waiting_scan' && inst.qrCode ? (
                                            <div className="bg-slate-900 rounded-2xl p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                                                <div className="bg-white p-2 rounded-xl">
                                                    <img src={inst.qrCode} alt="Remote QR Code" className="w-32 h-32" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-white text-xs font-bold mb-1">QR Code Disponível!</p>
                                                    <p className="text-slate-400 text-[10px]">Você pode enviar este código para o cliente escanear remotamente.</p>
                                                </div>
                                            </div>
                                        ) : ['connected', 'conectado'].includes(inst.status) ? (
                                            <div className="bg-emerald-500/10 rounded-2xl p-5 flex items-center justify-center gap-3 border border-emerald-500/20 text-emerald-400">
                                                <CheckCircle2 className="w-5 h-5" />
                                                <span className="text-xs font-black uppercase tracking-widest">Tudo certo! Canal operando normalmente.</span>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-950/50 rounded-2xl p-5 flex items-center justify-center gap-3 text-slate-500 border border-white/5">
                                                <AlertCircle className="w-5 h-5" />
                                                <span className="text-xs font-black uppercase tracking-widest">Instância sem QR Code ou em processamento...</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-white/5 border-white/10 text-slate-300">
                        Fechar Painel
                    </Button>
                </div>
            </div>
        </div>
    );
};
