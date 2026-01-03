import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    Users,
    CheckCircle2,
    ArrowRight,
    Loader2,
    Smartphone,
    Plus,
    Building2,
    Sparkles,
    RefreshCw,
    X
} from 'lucide-react';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Badge } from '../ui';

interface OnboardingWizardProps {
    onComplete: () => void;
    stats: {
        hasWhatsApp: boolean;
        clients: number;
    };
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, stats: initialStats }) => {
    const { organizationId } = useAuth();
    const { showToast } = useToast();
    const { instances, createInstance, createGroup, loading: wsLoading } = useWhatsApp();

    const [step, setStep] = useState(() => {
        if (initialStats.hasWhatsApp && initialStats.clients > 0) return 3;
        if (initialStats.hasWhatsApp) return 2;
        return 1;
    });
    const [loading, setLoading] = useState(false);

    // Step 2 Form State
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [autoCreateGroup, setAutoCreateGroup] = useState(true);

    // No longer jumping automatically via useEffect to avoid jarring transitions
    // while the user is actively using the wizard. The initial state handles the "reopen" case.

    // Step 1: WhatsApp Logic
    const handleConnectWhatsApp = async () => {
        setLoading(true);
        try {
            const { error } = await createInstance('Principal');
            if (error) throw error;
            showToast('Solicitação enviada. Aguardando QR Code...');
        } catch (err: any) {
            showToast(err.message || 'Erro ao criar instância', 'error');
        } finally {
            // Keep loading true until qrCode actually appears via realtime
            setTimeout(() => setLoading(false), 2000);
        }
    };

    // Auto-refresh interval (10s)
    useEffect(() => {
        let interval: any;
        const instance = instances[0];

        if (step === 1 && instance && instance.status !== 'connected' && !loading) {
            interval = setInterval(() => {
                console.log('--- Automated QR Refresh (10s) ---');
                createInstance('Principal').catch(console.error);
            }, 10000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [step, instances, loading, createInstance]);

    // Step 2: Client Logic
    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId) return;
        setLoading(true);

        try {
            const { data: newClient, error } = await supabase
                .from('clients')
                .insert({
                    organization_id: organizationId,
                    name: clientName,
                    email: clientEmail || null,
                    phone: clientPhone || null,
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;

            if (autoCreateGroup && newClient) {
                showToast('Cliente cadastrado! Criando grupo de WhatsApp...');
                await createGroup(newClient.name, newClient.id);
            }

            showToast('Tudo pronto! Seu primeiro cliente foi configurado.');
            setStep(3);
        } catch (err: any) {
            showToast(err.message || 'Erro ao cadastrar cliente', 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => {
        const instance = instances[0];
        const isConnected = instance?.status === 'connected';
        const isWaiting = instance?.status === 'waiting_scan' || instance?.status === 'connecting';

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-2">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Conectar WhatsApp</h2>
                    <p className="text-slate-500 max-w-sm mx-auto">
                        Para automatizar seus atendimentos, precisamos conectar seu WhatsApp.
                    </p>
                </div>

                {(!instance || (!instance.qrCode && !isConnected)) && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-center w-full max-w-sm flex flex-col items-center justify-center min-h-[220px]">
                            {loading ? (
                                <>
                                    <div className="relative">
                                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl animate-pulse rounded-full" />
                                    </div>
                                    <p className="font-bold text-slate-800">Gerando seu QR Code...</p>
                                    <p className="text-xs text-slate-400 mt-2 max-w-[200px]">Isso pode levar alguns segundos enquanto falamos com o WhatsApp.</p>
                                </>
                            ) : (
                                <>
                                    <Smartphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-sm text-slate-400 font-medium">Nenhuma conexão ativa</p>
                                </>
                            )}
                        </div>
                        {!loading && (
                            <Button
                                onClick={handleConnectWhatsApp}
                                className="w-full max-w-sm h-12 rounded-xl text-md font-bold"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Gerar QR Code de Conexão
                            </Button>
                        )}
                    </div>
                )}

                {isWaiting && instance.qrCode && (
                    <Card className="p-8 border-indigo-200 bg-indigo-50/30 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                        <div className="relative group">
                            <div className="bg-white p-3 rounded-2xl border-2 border-indigo-100 shadow-xl transition-all group-hover:shadow-indigo-200">
                                <img src={instance.qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                            </div>
                            <button
                                onClick={handleConnectWhatsApp}
                                disabled={loading}
                                className="absolute -top-3 -right-3 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Atualizar QR Code"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-indigo-900">Aguardando leitura...</p>
                            <p className="text-xs text-indigo-600 mt-1 mb-4">Abra o WhatsApp &gt; Dispositivos Conectados</p>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleConnectWhatsApp}
                                disabled={loading}
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 font-bold"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Não apareceu? Gerar novo código
                            </Button>
                        </div>
                    </Card>
                )}

                {isConnected && (
                    <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="inline-flex p-4 bg-emerald-100 text-emerald-600 rounded-full">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-slate-800">Conectado!</h3>
                            <p className="text-sm text-slate-500">Sua conta está pronta para enviar mensagens.</p>
                        </div>
                        <Button
                            onClick={() => setStep(2)}
                            className="w-full max-w-xs h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
                        >
                            Ir para Próxima Etapa
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    const renderStep2 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-2xl mb-2">
                    <Users className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Primeiro Cliente</h2>
                <p className="text-slate-500 max-w-sm mx-auto">
                    Vamos cadastrar seu primeiro cliente para testar o sistema.
                </p>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 max-w-sm mx-auto bg-white p-6 rounded-3xl border border-slate-200">
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Cliente</label>
                    <input
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: Pedro Alvares"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">WhatsApp (com DDD)</label>
                    <input
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="5511999999999"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <input
                        type="checkbox"
                        id="autoGroup"
                        checked={autoCreateGroup}
                        onChange={(e) => setAutoCreateGroup(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500"
                    />
                    <label htmlFor="autoGroup" className="text-sm font-bold text-blue-800 cursor-pointer">
                        Criar Grupo WhatsApp automaticamente
                    </label>
                </div>
                <Button
                    type="submit"
                    disabled={loading || !clientName}
                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-black tracking-wide"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                    Finalizar Cadastro
                </Button>
            </form>
        </div>
    );

    const renderStep3 = () => (
        <div className="text-center space-y-8 py-10 animate-in zoom-in-95 duration-700">
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-400 blur-3xl opacity-20 animate-pulse" />
                <div className="relative p-6 bg-white rounded-[40px] shadow-2xl border border-emerald-50">
                    <Sparkles className="w-20 h-20 text-emerald-500" />
                </div>
            </div>
            <div className="space-y-3">
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">Tudo Pronto!</h2>
                <p className="text-slate-500 max-w-sm mx-auto text-lg">
                    Sua organização foi configurada com sucesso. Agora você pode gerenciar sua equipe e tarefas.
                </p>
            </div>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <Button
                    onClick={onComplete}
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg shadow-xl shadow-indigo-200 active:scale-95 transition-all"
                >
                    Ir para meu Painel
                    <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4">
            <div className="w-full max-w-2xl bg-[#F8FAFC] rounded-[48px] shadow-2xl border border-white/50 overflow-hidden relative">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                <div className="p-8 md:p-12 relative">
                    {/* Exit Button - Positioned in the top-right corner */}
                    <button
                        onClick={onComplete}
                        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all z-10"
                        title="Sair e configurar depois"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Header Controls */}
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <span className="font-black text-slate-800 tracking-tighter text-xl">PARALELLO</span>
                        </div>
                        <div className="flex gap-2">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-indigo-600' : s < step ? 'bg-emerald-500' : 'bg-slate-200'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <main className="min-h-[400px] flex flex-col justify-center">
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                    </main>

                    {/* Footer Info */}
                    <footer className="mt-12 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Setup de Onboarding • Passo {step} de 3</p>
                    </footer>
                </div>
            </div>
        </div>
    );
};
