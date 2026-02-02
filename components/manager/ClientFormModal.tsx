import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Info, Activity, User, Phone, Mail, MessageSquare, Building, FileText } from 'lucide-react';
import { Client } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { TintimIntegrationForm } from './TintimIntegrationForm';
import { TintimConfig } from '../../types/marketing';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ClientFormModalProps {
    isOpen: boolean;
    client?: Client;
    onClose: () => void;
    onSave: (client: Partial<Client> & { autoCreateGroup?: boolean; groupName?: string }) => Promise<void>;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
    isOpen,
    client,
    onClose,
    onSave
}) => {
    const { showToast } = useToast();
    const { organizationId } = useAuth();
    const [formData, setFormData] = useState<Partial<Client> & { autoCreateGroup: boolean; groupName: string }>({
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        whatsappGroupId: '',
        autoCreateGroup: false,
        groupName: '',
        notes: '',
        status: 'active'
    });
    const [groupMode, setGroupMode] = useState<'create' | 'link' | 'none'>('none');
    const [showHelp, setShowHelp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showTintim, setShowTintim] = useState(false);
    const [tintimConfig, setTintimConfig] = useState<TintimConfig>({});

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: client?.name || '',
                email: client?.email || '',
                phone: client?.phone || '',
                whatsapp: client?.whatsapp || '',
                whatsappGroupId: client?.whatsappGroupId || '',
                notes: client?.notes || '',
                status: client?.status || 'active',
                autoCreateGroup: false,
                groupName: client?.name ? `Atendimento: ${client.name}` : ''
            });
            setGroupMode(client?.whatsappGroupId ? 'link' : 'none');

            if (client?.id) {
                loadTintimIntegration(client.id);
            } else {
                setShowTintim(false);
                setTintimConfig({});
            }
        }
    }, [isOpen, client]);

    const loadTintimIntegration = async (clientId: string) => {
        try {
            const { data, error } = await supabase
                .from('client_integrations')
                .select('*')
                .eq('client_id', clientId)
                .eq('provider', 'tintim')
                .maybeSingle();

            if (error) {
                console.error('Error loading Tintim integration:', error);
                setShowTintim(false);
                setTintimConfig({});
                return;
            }

            if (data) {
                setShowTintim(true);
                setTintimConfig({
                    customer_code: data.customer_code || '',
                    security_token: data.security_token || '',
                    conversion_event: data.conversion_event || '',
                    conversion_event_id: data.conversion_event_id || undefined
                });
            } else {
                setShowTintim(false);
                setTintimConfig({});
            }
        } catch (err) {
            console.error('Error loading Tintim integration:', err);
            setShowTintim(false);
            setTintimConfig({});
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name?.trim()) {
            showToast('Nome é obrigatório', 'error');
            return;
        }

        if (groupMode === 'link' && !formData.whatsappGroupId?.trim()) {
            showToast('O ID do grupo é obrigatório para vincular um grupo existente', 'error');
            return;
        }

        setLoading(true);
        try {
            const finalPayload = {
                ...formData,
                name: formData.name.trim(),
                email: formData.email?.trim() || '',
                autoCreateGroup: groupMode === 'create',
                groupName: groupMode === 'create' ? formData.groupName : undefined,
                whatsappGroupId: groupMode === 'link' ? formData.whatsappGroupId : ''
            };

            await onSave(finalPayload);

            if (showTintim && client?.id && organizationId) {
                await saveTintimIntegration(client.id);
            }

            onClose();
        } catch (error) {
            console.error('Error saving client:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveTintimIntegration = async (clientId: string) => {
        if (!organizationId) return;

        const integrationData = {
            organization_id: organizationId,
            client_id: clientId,
            provider: 'tintim',
            customer_code: tintimConfig.customer_code || null,
            security_token: tintimConfig.security_token || null,
            conversion_event: tintimConfig.conversion_event || null,
            conversion_event_id: tintimConfig.conversion_event_id || null,
            is_active: true,
            updated_at: new Date().toISOString()
        };

        await supabase
            .from('client_integrations')
            .upsert(integrationData, {
                onConflict: 'client_id,provider',
                ignoreDuplicates: false
            });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <Building className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            {client ? 'Editar Cliente' : 'Novo Cliente'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Nome do Cliente *
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setFormData(prev => {
                                            const newData = { ...prev, name: newName };
                                            if (!prev.groupName || prev.groupName === `Atendimento: ${prev.name}`) {
                                                newData.groupName = `Atendimento: ${newName}`;
                                            }
                                            return newData;
                                        });
                                    }}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                                    placeholder="Nome da empresa ou cliente"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                                    placeholder="contato@empresa.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Telefone
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                WhatsApp
                            </label>
                            <div className="relative">
                                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="tel"
                                    value={formData.whatsapp}
                                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-200 transition-all appearance-none cursor-pointer"
                            >
                                <option value="active" className="bg-slate-900">Ativo</option>
                                <option value="inactive" className="bg-slate-900">Inativo</option>
                            </select>
                        </div>
                    </div>

                    {/* WHATSAPP GROUP SECTION - Premium Dark */}
                    {!client && (
                        <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-4">
                            <label className="block text-sm font-bold text-emerald-400 mb-2">
                                Configuração de Grupo Atendimento
                            </label>

                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-emerald-500/5 transition-colors">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${groupMode === 'none' ? 'border-emerald-500' : 'border-slate-500'}`}>
                                        {groupMode === 'none' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                    </div>
                                    <input
                                        type="radio"
                                        name="groupMode"
                                        checked={groupMode === 'none'}
                                        onChange={() => setGroupMode('none')}
                                        className="sr-only"
                                    />
                                    <span className="text-sm text-slate-300 group-hover:text-emerald-300 transition-colors">Sem grupo no momento</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-emerald-500/5 transition-colors">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${groupMode === 'create' ? 'border-emerald-500' : 'border-slate-500'}`}>
                                        {groupMode === 'create' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                    </div>
                                    <input
                                        type="radio"
                                        name="groupMode"
                                        checked={groupMode === 'create'}
                                        onChange={() => setGroupMode('create')}
                                        className="sr-only"
                                    />
                                    <span className="text-sm text-slate-300 group-hover:text-emerald-300 transition-colors">Criar NOVO grupo automaticamente</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-emerald-500/5 transition-colors">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${groupMode === 'link' ? 'border-emerald-500' : 'border-slate-500'}`}>
                                        {groupMode === 'link' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                    </div>
                                    <input
                                        type="radio"
                                        name="groupMode"
                                        checked={groupMode === 'link'}
                                        onChange={() => setGroupMode('link')}
                                        className="sr-only"
                                    />
                                    <span className="text-sm text-slate-300 group-hover:text-emerald-300 transition-colors">Vincular grupo EXISTENTE (ID)</span>
                                </label>
                            </div>

                            {groupMode === 'create' && (
                                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 pl-7">
                                    <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-2">Nome do Novo Grupo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.groupName}
                                        onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-emerald-200 placeholder:text-emerald-700 text-sm"
                                        placeholder="Ex: Atendimento: Cliente X"
                                    />
                                </div>
                            )}

                            {groupMode === 'link' && (
                                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 pl-7">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-bold text-emerald-400 uppercase">ID do Grupo (@g.us)</label>
                                        <button type="button" onClick={() => setShowHelp(true)} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline">COMO ACHAR?</button>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={formData.whatsappGroupId}
                                        onChange={(e) => setFormData({ ...formData, whatsappGroupId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-emerald-200 placeholder:text-emerald-700 text-sm font-mono"
                                        placeholder="12345678@g.us"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* TINTIM INTEGRATION SECTION - Premium Dark */}
                    <div className="pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Integração Tintim</h3>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Marketing & Conversão</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={showTintim}
                                    onChange={(e) => setShowTintim(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 border border-white/5"></div>
                            </label>
                        </div>

                        {showTintim && (
                            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                <TintimIntegrationForm
                                    clientId={client?.id}
                                    clientName={formData.name}
                                    config={tintimConfig}
                                    onChange={setTintimConfig}
                                    showWebhook={true}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Observações
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-200 placeholder:text-slate-600 transition-all custom-scrollbar"
                                placeholder="Notas internas sobre o cliente..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-6 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 border border-white/10"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar Cliente'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Help Modal for Group ID - Premium Dark */}
            {showHelp && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0f172a] rounded-2xl shadow-2xl border border-white/10 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-blue-400" />
                                Como encontrar o ID do Grupo
                            </h3>
                            <button onClick={() => setShowHelp(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 text-sm text-slate-300">
                            <p>1. Abra o <b className="text-white">WhatsApp Web</b> no seu computador.</p>
                            <p>2. Entre na conversa do grupo desejado.</p>
                            <p>3. Clique com o botão direito e selecione <b className="text-white">"Inspecionar"</b>.</p>
                            <p>4. Procure no código por algo que termine em <b className="text-white">@g.us</b>.</p>
                            <p>5. O ID será algo como <code className="bg-slate-800 border border-white/10 px-2 py-1 rounded text-blue-400 font-mono text-xs">1234567890@g.us</code>.</p>
                        </div>
                        <div className="p-4 bg-slate-900/50 border-t border-white/5 flex justify-end">
                            <button onClick={() => setShowHelp(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">Entendi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
