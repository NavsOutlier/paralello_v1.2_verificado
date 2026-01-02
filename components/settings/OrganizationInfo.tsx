import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2 } from 'lucide-react';

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
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Informações da Organização</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Gerencie as informações básicas da sua organização
                </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                {/* Display Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Nome da Organização *
                    </label>
                    <input
                        type="text"
                        value={settings.display_name}
                        onChange={(e) => setSettings({ ...settings, display_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Ex: Minha Empresa Ltda"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Descrição
                    </label>
                    <textarea
                        value={settings.description}
                        onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="Breve descrição sobre a organização..."
                    />
                </div>

                {/* Logo URL */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        URL do Logo
                    </label>
                    <input
                        type="url"
                        value={settings.logo_url}
                        onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="https://exemplo.com/logo.png"
                    />
                    {settings.logo_url && (
                        <div className="mt-2">
                            <img
                                src={settings.logo_url}
                                alt="Preview"
                                className="h-16 w-16 object-contain border border-slate-200 rounded-lg"
                            />
                        </div>
                    )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Contact Email */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Email de Contato
                    </label>
                    <input
                        type="email"
                        value={settings.contact_email}
                        onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="contato@empresa.com"
                    />
                </div>

                {/* Contact Phone */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Telefone de Contato
                    </label>
                    <input
                        type="tel"
                        value={settings.contact_phone}
                        onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="(11) 99999-9999"
                    />
                </div>

                {/* Timezone */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Fuso Horário
                    </label>
                    <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                        <option value="America/Manaus">Manaus (AMT)</option>
                        <option value="America/Recife">Recife (BRT)</option>
                        <option value="America/Fortaleza">Fortaleza (BRT)</option>
                        <option value="America/Bahia">Bahia (BRT)</option>
                    </select>
                </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
