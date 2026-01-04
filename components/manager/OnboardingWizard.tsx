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
    X,
    HelpCircle,
    Check,
    UserPlus,
    UserCog,
    Trash2,
    Info
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
        members: number;
    };
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, stats: initialStats }) => {
    const { organizationId } = useAuth();
    const { showToast } = useToast();
    const { instances, createInstance, createGroup, loading: wsLoading } = useWhatsApp();

    const [step, setStep] = useState(() => {
        if (initialStats.hasWhatsApp && initialStats.clients > 0 && initialStats.members > 1) return 5;
        // Step 1: WhatsApp -> Step 2: Team (if members <= 1) -> Step 3: Client (if clients == 0) -> Step 4: Assignment
        if (initialStats.hasWhatsApp && initialStats.members > 1 && initialStats.clients === 0) return 3;
        if (initialStats.hasWhatsApp && initialStats.members <= 1) return 2;
        if (initialStats.hasWhatsApp && initialStats.clients > 0) return 4;
        return 1;
    });
    const [loading, setLoading] = useState(false);

    // Step 2 Form State (Previously Step 3)
    const [invitedMembers, setInvitedMembers] = useState([{
        name: '',
        email: '',
        jobTitle: '',
        role: 'member',
        permissions: {
            can_manage_clients: true,
            can_manage_tasks: true,
            can_manage_team: false
        }
    }]);

    // Step 3: Client Logic (Previously Step 2)
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [autoCreateGroup, setAutoCreateGroup] = useState(true);
    const [groupMode, setGroupMode] = useState<'create' | 'link'>('create');
    const [whatsappGroupId, setWhatsappGroupId] = useState('');
    const [groupName, setGroupName] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newClientId, setNewClientId] = useState<string | null>(null);

    // Step 4: Assignment State
    const [allTeamMembers, setAllTeamMembers] = useState<any[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

    // Safety: Reset global loading state whenever switching steps
    useEffect(() => {
        setLoading(false);
    }, [step]);

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

        if (step === 1 && instance && !['connected', 'conectado'].includes(instance.status) && !loading) {
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
                    whatsapp_group_id: groupMode === 'link' ? whatsappGroupId : null,
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;

            if (newClient) {
                if (groupMode === 'create') {
                    setNewClientId(newClient.id);
                    setIsCreatingGroup(true);
                    showToast('Cliente cadastrado! Criando grupo de WhatsApp...');
                    await createGroup(groupName || `Atendimento: ${newClient.name}`, newClient.id, clientPhone);
                    // We don't setStep(3) yet, the useEffect will handle it
                } else {
                    if (groupMode === 'link' && whatsappGroupId) {
                        await supabase
                            .from('clients')
                            .update({ whatsapp_group_id: whatsappGroupId })
                            .eq('id', newClient.id);
                    }
                    showToast('Tudo pronto com seu primeiro cliente!');
                    setStep(4);
                }
            }
            setLoading(false);
        } catch (err: any) {
            showToast(err.message || 'Erro ao cadastrar cliente', 'error');
            setLoading(false);
            setIsCreatingGroup(false);
        }
    };

    // Listen for Group ID update in Realtime
    useEffect(() => {
        if (!isCreatingGroup || !newClientId) return;

        const channel = supabase
            .channel(`client-group-sync-${newClientId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'clients',
                    filter: `id=eq.${newClientId}`
                },
                (payload) => {
                    if (payload.new.whatsapp_group_id) {
                        console.log('--- Group Created Successfully! ---');
                        showToast('Grupo de WhatsApp criado com sucesso!');
                        setIsCreatingGroup(false);
                        setStep(4);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isCreatingGroup, newClientId, showToast]);

    const handleInviteMembers = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId) return;
        setLoading(true);

        try {
            // First, register unique specialties if provided
            const uniqueTitles = Array.from(new Set(invitedMembers.map(m => m.jobTitle.trim()).filter(t => t.length > 0)));
            if (uniqueTitles.length > 0) {
                // Upsert into team_specialties (ignore duplicates via ON CONFLICT if the DB supports it, or just insert)
                for (const title of uniqueTitles) {
                    await supabase
                        .from('team_specialties')
                        .upsert({ organization_id: organizationId, name: title }, { onConflict: 'organization_id,name' })
                        .select();
                }
            }

            for (const member of invitedMembers) {
                if (!member.email || !member.name) continue;

                const { data: response, error: inviteError } = await supabase.functions.invoke('invite-team-member', {
                    body: {
                        email: member.email.trim(),
                        name: member.name.trim(),
                        job_title: (member.jobTitle || '').trim(),
                        role: member.role,
                        organization_id: organizationId,
                        invited_by: (await supabase.auth.getUser()).data.user?.id,
                        permissions: member.permissions
                    }
                });

                if (inviteError || (response && response.error)) {
                    console.error('Erro ao convidar:', member.email, inviteError || response?.error);
                }
            }

            // If we already have clients, we could go to assignment, but usually after team we go to client creation
            showToast('Processamento de convites concluído');
            setStep(3);
        } catch (err: any) {
            showToast(err.message || 'Erro ao processar convites', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllTeamMembers = async () => {
        if (!organizationId) return;
        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*, profile:profiles!team_members_profile_id_fkey(name, email)')
                .eq('organization_id', organizationId)
                .is('deleted_at', null);

            if (error) throw error;
            setAllTeamMembers(data || []);
            // Auto-select the current user (manager)
            const me = (await supabase.auth.getUser()).data.user;
            const myMember = data?.find(m => m.profile_id === me?.id);
            if (myMember) {
                setSelectedMemberIds([myMember.id]);
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    useEffect(() => {
        if (step === 4) {
            fetchAllTeamMembers();
        }
    }, [step]);

    const handleAssignMembers = async () => {
        if (!organizationId || !newClientId || selectedMemberIds.length === 0) {
            setStep(5); // Skip if nothing selected
            return;
        }

        setLoading(true);
        try {
            const assignments = selectedMemberIds.map(memberId => ({
                organization_id: organizationId,
                client_id: newClientId,
                team_member_id: memberId,
                role: 'support'
            }));

            const { error } = await supabase
                .from('client_assignments')
                .insert(assignments);

            if (error) throw error;
            showToast('Equipe vinculada ao cliente com sucesso!');
            setStep(5);
        } catch (error: any) {
            showToast(error.message || 'Erro ao vincular equipe', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addMemberRow = () => {
        setInvitedMembers([...invitedMembers, {
            name: '',
            email: '',
            jobTitle: '',
            role: 'member',
            permissions: {
                can_manage_clients: true,
                can_manage_tasks: true,
                can_manage_team: false
            }
        }]);
    };

    const removeMemberRow = (index: number) => {
        if (invitedMembers.length > 1) {
            setInvitedMembers(invitedMembers.filter((_, i) => i !== index));
        }
    };

    const updateMemberRow = (index: number, field: string, value: any) => {
        const newMembers = [...invitedMembers];
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            (newMembers[index] as any)[parent][child] = value;
        } else {
            (newMembers[index] as any)[field] = value;
        }
        setInvitedMembers(newMembers);
    };

    const renderStep1 = () => {
        const instance = instances[0];
        const isConnected = instance && ['connected', 'conectado'].includes(instance.status);
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
        <div className="animate-in slide-in-from-right-8 fade-in duration-500">
            <div className="mb-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mb-4 shadow-xl shadow-emerald-50">
                    <UserPlus className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight text-center">Convidar Equipe 🤝</h2>
                <p className="text-slate-500 mt-2 text-center max-w-sm text-sm leading-relaxed">
                    Defina quem ajudará você na gestão, suas funções e permissões.
                </p>
            </div>

            <form onSubmit={handleInviteMembers} className="space-y-4">
                <div className="space-y-4 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
                    {invitedMembers.map((member, idx) => (
                        <div key={idx} className="p-5 bg-white border-2 border-slate-100 rounded-3xl relative group animate-in zoom-in-95 shadow-sm hover:border-indigo-100 transition-all">
                            {invitedMembers.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeMemberRow(idx)}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-50 shadow-sm transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        value={member.name}
                                        onChange={(e) => updateMemberRow(idx, 'name', e.target.value)}
                                        placeholder="Ex: João Silva"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email de Convite</label>
                                    <input
                                        required
                                        type="email"
                                        value={member.email}
                                        onChange={(e) => updateMemberRow(idx, 'email', e.target.value)}
                                        placeholder="joao@suaagencia.com"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Especialidade / Cargo</label>
                                    <input
                                        required
                                        type="text"
                                        value={member.jobTitle}
                                        onChange={(e) => updateMemberRow(idx, 'jobTitle', e.target.value)}
                                        placeholder="Ex: Gestor de Tráfego"
                                        className="w-full px-4 py-2.5 bg-indigo-50/30 border border-indigo-100/50 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-bold text-indigo-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Função no Sistema</label>
                                    <select
                                        value={member.role}
                                        onChange={(e) => updateMemberRow(idx, 'role', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium"
                                    >
                                        <option value="member">Membro (Operacional)</option>
                                        <option value="manager">Gestor (Administrativo)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 ml-1">Permissões de Acesso</label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={member.permissions.can_manage_clients}
                                                onChange={(e) => updateMemberRow(idx, 'permissions.can_manage_clients', e.target.checked)}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Clientes</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={member.permissions.can_manage_tasks}
                                                onChange={(e) => updateMemberRow(idx, 'permissions.can_manage_tasks', e.target.checked)}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Tarefas</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={member.permissions.can_manage_team}
                                                onChange={(e) => updateMemberRow(idx, 'permissions.can_manage_team', e.target.checked)}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Equipe</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center mt-2">
                    <button
                        type="button"
                        onClick={addMemberRow}
                        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl hover:bg-indigo-50 hover:border-indigo-300 transition-all font-bold text-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar outro membro
                    </button>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Button
                        type="submit"
                        disabled={loading || invitedMembers.some(m => !m.email || !m.name)}
                        className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <>
                                Próximo: Configurar Primeiro Cliente
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </>
                        )}
                    </Button>
                    <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-center py-2"
                    >
                        Pular por enquanto
                    </button>
                </div>
            </form>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-2xl mb-2">
                    <Users className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-slate-800">Primeiro Cliente</h2>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">
                    Cadastre seu primeiro cliente e crie o grupo de atendimento automático.
                </p>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 max-w-sm mx-auto bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Cliente</label>
                    <input
                        required
                        value={clientName}
                        onChange={(e) => {
                            const newName = e.target.value;
                            setClientName(newName);
                            if (!groupName || groupName === `Atendimento: ${clientName}`) {
                                setGroupName(`Atendimento: ${newName}`);
                            }
                        }}
                        placeholder="Ex: Pedro Alvares"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">WhatsApp (55 + DDD + Número)</label>
                    <input
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="Ex: 5511999998888"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Configuração do Grupo</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setGroupMode('create')}
                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${groupMode === 'create'
                                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-inner'
                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                                }`}
                        >
                            <Sparkles className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Criar Novo</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setGroupMode('link')}
                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${groupMode === 'link'
                                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-inner'
                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                                }`}
                        >
                            <Users className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Já Existente</span>
                        </button>
                    </div>
                </div>

                {groupMode === 'create' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Grupo</label>
                        <input
                            required
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Ex: Suporte VIP - Pedro"
                            className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-700"
                        />
                    </div>
                )}

                {groupMode === 'link' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">ID do Grupo</label>
                            <button
                                type="button"
                                onClick={() => setShowHelp(true)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                            >
                                <HelpCircle className="w-3 h-3" />
                                COMO ACHAR?
                            </button>
                        </div>
                        <input
                            required
                            value={whatsappGroupId}
                            onChange={(e) => setWhatsappGroupId(e.target.value)}
                            placeholder="123456789@g.us"
                            className="w-full px-4 py-3 bg-white border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                        />
                    </div>
                )}

                {isCreatingGroup ? (
                    <Card className="p-6 bg-blue-50/50 border-blue-200 flex flex-col items-center gap-4 animate-pulse mt-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                            <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-500 animate-bounce" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-blue-900 font-bold">Criando Grupo...</h3>
                            <p className="text-blue-600 text-xs mt-1">Quase lá! Estamos configurando seu WhatsApp.</p>
                        </div>
                    </Card>
                ) : (
                    <>
                        <Button
                            type="submit"
                            disabled={loading || !clientName}
                            className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 uppercase tracking-wider text-sm"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <>
                                    Próximo: Vincular Equipe
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </>
                            )}
                        </Button>
                        <button
                            type="button"
                            onClick={() => setStep(5)}
                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-center py-2"
                        >
                            Pular por enquanto
                        </button>
                    </>
                )}
            </form>
        </div>
    );

    const renderStep4 = () => (
        <div className="animate-in slide-in-from-right-8 fade-in duration-500">
            <div className="mb-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 mb-6 shadow-xl shadow-blue-50">
                    <UserCog className="w-8 h-8" />
                </div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight text-center">Quem atuará com o cliente?</h2>
                <p className="text-slate-500 mt-3 text-center max-w-sm text-lg leading-relaxed">
                    Selecione os membros da equipe que terão acesso ao atendimento deste cliente.
                </p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto px-1 mb-8">
                {allTeamMembers.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500 font-bold">Carregando sua equipe...</p>
                    </div>
                ) : (
                    allTeamMembers.map((member) => (
                        <label
                            key={member.id}
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedMemberIds.includes(member.id)
                                ? 'bg-blue-50 border-blue-200 shadow-md transform scale-[1.02]'
                                : 'bg-white border-slate-100 hover:border-blue-100'
                                }`}
                        >
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={selectedMemberIds.includes(member.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedMemberIds([...selectedMemberIds, member.id]);
                                        } else {
                                            setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id));
                                        }
                                    }}
                                />
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedMemberIds.includes(member.id)
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-200 bg-white'
                                    }`}>
                                    {selectedMemberIds.includes(member.id) && <Check className="w-3.5 h-3.5" />}
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-800">{member.profile?.name || 'Membro'}</p>
                                <p className="text-xs text-slate-500">{member.profile?.email}</p>
                            </div>
                            {member.job_title && (
                                <Badge variant="outline" className="bg-white text-blue-600 border-blue-100">
                                    {member.job_title}
                                </Badge>
                            )}
                        </label>
                    ))
                )}
            </div>

            <Button
                onClick={handleAssignMembers}
                disabled={loading || allTeamMembers.length === 0}
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                    <>
                        Vincular Equipe e Finalizar
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                )}
            </Button>
        </div>
    );

    const renderStep5 = () => (
        <div className="text-center space-y-10 py-4 animate-in zoom-in-95 fade-in duration-700">
            {/* Header com Brilho */}
            <div className="relative inline-block group">
                <div className="absolute inset-0 bg-emerald-400 blur-[80px] opacity-30 group-hover:opacity-50 transition-opacity animate-pulse" />
                <div className="relative p-8 bg-white rounded-[40px] shadow-2xl border border-emerald-100 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                    <Sparkles className="w-16 h-16 text-emerald-500" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white p-1">
                        <Check className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Títulos */}
            <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">
                    Tudo Pronto! 🚀
                </h2>
                <p className="text-slate-500 max-w-sm mx-auto text-lg leading-relaxed">
                    Sua organização está configurada e pronta para escalar com o Paralello.
                </p>
            </div>

            {/* Checklist de Sucesso */}
            <div className="max-w-xs mx-auto space-y-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                {[
                    'WhatsApp Conectado',
                    'Equipe Convidada e Roles Atribuídos',
                    'Primeiro Cliente Cadastrado',
                    'Acesso da Equipe Vinculado'
                ].map((item, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-3 animate-in slide-in-from-left-4 fade-in duration-500 fill-mode-both"
                        style={{ animationDelay: `${idx * 200}ms` }}
                    >
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{item}</span>
                    </div>
                ))}
            </div>

            {/* Ação Final */}
            <div className="max-w-sm mx-auto pt-4 px-8">
                <Button
                    onClick={onComplete}
                    className="w-full h-16 rounded-[24px] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl shadow-2xl shadow-indigo-200 active:scale-95 transition-all group overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]" />
                    <span className="relative z-10 flex items-center justify-center">
                        Ir para meu Painel
                        <ArrowRight className="w-6 h-6 ml-2" />
                    </span>
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
                        style={{ width: `${(step / 5) * 100}%` }}
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
                        {window.innerWidth > 768 && (
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <div
                                        key={s}
                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-indigo-600' : s < step ? 'bg-emerald-500' : 'bg-slate-200'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <main className="min-h-[400px] flex flex-col justify-center">
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                        {step === 5 && renderStep5()}
                    </main>

                    {/* Footer Info */}
                    <footer className="mt-12 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Setup de Onboarding • Passo {step} de 5</p>
                    </footer>
                </div>
            </div>

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 scale-in-center animate-in duration-300">
                    <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-700/50">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <Info className="w-6 h-6 text-blue-400" />
                                <h3 className="text-xl font-bold tracking-tight">Como achar o ID do Grupo</h3>
                            </div>
                            <button
                                onClick={() => setShowHelp(false)}
                                className="p-2 hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">1</div>
                                    <p className="text-slate-300 leading-relaxed text-sm">
                                        Acesse o <strong>WhatsApp Web</strong> no seu computador.
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">2</div>
                                    <p className="text-slate-300 leading-relaxed text-sm">
                                        Abra a conversa do <strong>grupo desejado</strong>.
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">3</div>
                                    <p className="text-slate-300 leading-relaxed text-sm">
                                        Clique com o <strong>botão direito</strong> sobre qualquer mensagem ou sobre o nome do grupo na barra lateral e selecione <strong>"Inspecionar"</strong>.
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">4</div>
                                    <p className="text-slate-300 leading-relaxed text-sm">
                                        No código que aparecer, procure pelo atributo que contenha o termo <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 font-bold">@g.us</code>.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                <p className="text-xs text-blue-300 italic text-center leading-relaxed">
                                    <strong>Dica:</strong> Pressione <code className="bg-blue-900/40 px-1 rounded text-white font-mono uppercase text-[10px]">Ctrl + F</code> e digite <span className="text-white font-bold ml-1">@g.us</span> para localizar o ID numérico que precede esse sufixo.
                                </p>
                            </div>

                            <Button
                                onClick={() => setShowHelp(false)}
                                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                            >
                                Entendi, Vou Copiar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
