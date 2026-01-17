import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Info, Activity } from 'lucide-react';
import { Client } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { TintimIntegrationForm } from './TintimIntegrationForm';
import { TintimConfig, ClientIntegration } from '../../types/marketing';
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

            // Load existing Tintim integration if editing
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
                .maybeSingle(); // Use maybeSingle to avoid error when no record exists

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

            // Save Tintim integration separately if enabled
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

        // Upsert: insert or update if exists
        await supabase
            .from('client_integrations')
            .upsert(integrationData, {
                onConflict: 'client_id,provider',
                ignoreDuplicates: false
            });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">
                        {client ? 'Editar Cliente' : 'Novo Cliente'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Nome do Cliente *
                            </label>
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
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Telefone
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                WhatsApp
                            </label>
                            <input
                                type="tel"
                                value={formData.whatsapp}
                                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                <option value="active">Ativo</option>
                                <option value="inactive">Inativo</option>
                            </select>
                        </div>
                    </div>

                    {/* WHATSAPP GROUP SECTION */}
                    {!client && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-4">
                            <label className="block text-sm font-bold text-emerald-800">
                                Configuração de Grupo Atendimento
                            </label>

                            <div className="flex flex-col gap-2.5">
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="groupMode"
                                        checked={groupMode === 'none'}
                                        onChange={() => setGroupMode('none')}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                                    />
                                    <span className="text-sm text-emerald-700 group-hover:text-emerald-900 transition-colors">Sem grupo no momento</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="groupMode"
                                        checked={groupMode === 'create'}
                                        onChange={() => setGroupMode('create')}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                                    />
                                    <span className="text-sm text-emerald-700 group-hover:text-emerald-900 transition-colors">Criar NOVO grupo automaticamente</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="groupMode"
                                        checked={groupMode === 'link'}
                                        onChange={() => setGroupMode('link')}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                                    />
                                    <span className="text-sm text-emerald-700 group-hover:text-emerald-900 transition-colors">Vincular grupo EXISTENTE (ID)</span>
                                </label>
                            </div>

                            {groupMode === 'create' && (
                                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1 ml-1">Nome do Novo Grupo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.groupName}
                                        onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                                        className="w-full px-4 py-2 border border-emerald-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>
                            )}

                            {groupMode === 'link' && (
                                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between mb-1.5 px-1">
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase">ID do Grupo (@g.us)</label>
                                        <button type="button" onClick={() => setShowHelp(true)} className="text-[10px] font-bold text-blue-600 hover:underline">COMO ACHAR?</button>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={formData.whatsappGroupId}
                                        onChange={(e) => setFormData({ ...formData, whatsappGroupId: e.target.value })}
                                        className="w-full px-4 py-2 border border-emerald-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        placeholder="12345678@g.us"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* TINTIM INTEGRATION SECTION */}
                    <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Integração Tintim</h3>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Marketing & Conversão</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={showTintim}
                                    onChange={(e) => setShowTintim(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {showTintim && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
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
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Observações
                        </label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Notas internas sobre o cliente..."
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar Cliente'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Help Modal for Group ID */}
            {showHelp && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Como encontrar o ID do Grupo</h3>
                            <button onClick={() => setShowHelp(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 text-sm text-slate-600">
                            <p>1. Abra o <b>WhatsApp Web</b> no seu computador.</p>
                            <p>2. Entre na conversa do grupo desejado.</p>
                            <p>3. Clique com o botão direito e selecione <b>"Inspecionar"</b>.</p>
                            <p>4. Procure no código por algo que termine em <b>@g.us</b>.</p>
                            <p>5. O ID será algo como <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-mono">1234567890@g.us</code>.</p>
                        </div>
                        <div className="p-4 bg-slate-50 flex justify-end">
                            <button onClick={() => setShowHelp(false)} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold">Entendi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
