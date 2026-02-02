import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, Building2, Globe, Mail, Phone, Clock, Image as ImageIcon } from 'lucide-react';

interface OrganizationSettings {
    id?: string;
    organization_id: string;
    display_name: string;
    description: string;
    logo_url: string;
    contact_email: string;
    contact_phone: string;
    timezone: string;
}

interface OrganizationInfoProps {
    organizationId: string;
}

export const OrganizationInfo: React.FC<OrganizationInfoProps> = ({ organizationId }) => {
    const [settings, setSettings] = useState<OrganizationSettings>({
        organization_id: organizationId,
        display_name: '',
        description: '',
        logo_url: '',
        contact_email: '',
        contact_phone: '',
        timezone: 'America/Sao_Paulo',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, [organizationId]);

    const loadSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('*')
                .eq('organization_id', organizationId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setSettings(data);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            const { error } = settings.id
                ? await supabase
                    .from('organization_settings')
                    .update(settings)
                    .eq('id', settings.id)
                : await supabase
                    .from('organization_settings')
                    .insert([settings]);

            if (error) throw error;

            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar configurações.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                    <Building2 className="w-8 h-8 text-violet-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Informações da Organização</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Identidade e dados de contato da sua empresa
                    </p>
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 space-y-6 shadow-xl">
                {/* Display Name */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Nome da Organização *
                    </label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={settings.display_name}
                            onChange={(e) => setSettings({ ...settings, display_name: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 placeholder:text-slate-600 transition-all font-medium"
                            placeholder="Ex: Minha Empresa Ltda"
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Descrição
                    </label>
                    <textarea
                        value={settings.description}
                        onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 placeholder:text-slate-600 transition-all resize-none custom-scrollbar"
                        placeholder="Breve descrição sobre a organização..."
                    />
                </div>

                {/* Logo URL */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        URL do Logo
                    </label>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="url"
                                value={settings.logo_url}
                                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                                placeholder="https://exemplo.com/logo.png"
                            />
                        </div>
                        {settings.logo_url && (
                            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                <img
                                    src={settings.logo_url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-px bg-white/5" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Email */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Email de Contato
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="email"
                                value={settings.contact_email}
                                onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                                placeholder="contato@empresa.com"
                            />
                        </div>
                    </div>

                    {/* Contact Phone */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Telefone de Contato
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="tel"
                                value={settings.contact_phone}
                                onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                                placeholder="(11) 99999-9999"
                            />
                        </div>
                    </div>
                </div>

                {/* Timezone */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Fuso Horário
                    </label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                            value={settings.timezone}
                            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-slate-200 transition-all appearance-none cursor-pointer"
                        >
                            <option value="America/Sao_Paulo" className="bg-slate-900">São Paulo (BRT)</option>
                            <option value="America/Manaus" className="bg-slate-900">Manaus (AMT)</option>
                            <option value="America/Recife" className="bg-slate-900">Recife (BRT)</option>
                            <option value="America/Fortaleza" className="bg-slate-900">Fortaleza (BRT)</option>
                            <option value="America/Bahia" className="bg-slate-900">Bahia (BRT)</option>
                        </select>
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-violet-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </div>
    );
};
