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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <RefreshCw className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Setup Assistant</h2>
                            <p className="text-xs text-slate-500 font-medium">{organization.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dono (Owner)</span>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className={`w-4 h-4 ${organization.onboardingStatus?.isOwnerActive ? 'text-emerald-500' : 'text-slate-300'}`} />
                                <span className="text-sm font-bold text-slate-700">
                                    {organization.onboardingStatus?.isOwnerActive ? 'Já acessou o painel' : 'Aguardando primeiro acesso'}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">WhatsApp</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${organization.onboardingStatus?.isWhatsAppConnected ? 'bg-emerald-50 animate-pulse' : 'bg-slate-300'}`} />
                                <span className="text-sm font-bold text-slate-700">
                                    {organization.onboardingStatus?.isWhatsAppConnected ? 'Conectado e Operacional' : 'Desconectado'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                            Canais de WhatsApp (Remoto)
                        </h3>

                        {loading ? (
                            <div className="py-12 flex justify-center">
                                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                            </div>
                        ) : instances.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                                <p className="text-slate-400 text-sm font-medium">Nenhuma instância criada pelo cliente ainda.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {instances.map((inst) => (
                                    <div key={inst.id} className="p-5 border border-slate-200 rounded-3xl bg-white shadow-sm hover:border-indigo-200 transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${inst.status === 'conectado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{inst.name}</h4>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{inst.status}</span>
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
                                        ) : inst.status === 'conectado' ? (
                                            <div className="bg-emerald-50 rounded-2xl p-4 flex items-center justify-center gap-2 border border-emerald-100 text-emerald-700">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="text-xs font-bold">Tudo certo! Canal operando normalmente.</span>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-center gap-2 text-slate-400">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="text-xs font-medium">Instância sem QR Code ou em processamento...</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} className="rounded-xl font-bold">
                        Fechar Painel
                    </Button>
                </div>
            </div>
        </div>
    );
};
