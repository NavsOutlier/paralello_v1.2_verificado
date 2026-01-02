import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, Bell, Mail, Monitor, Smartphone } from 'lucide-react';

interface NotificationPrefs {
    email: boolean;
    browser: boolean;
    mobile: boolean;
    daily_digest: boolean;
}

interface OrganizationSettings {
    id?: string;
    organization_id: string;
    notification_preferences: NotificationPrefs;
}

interface NotificationSettingsProps {
    organizationId: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ organizationId }) => {
    const [settings, setSettings] = useState<OrganizationSettings>({
        organization_id: organizationId,
        notification_preferences: {
            email: true,
            browser: true,
            mobile: false,
            daily_digest: true
        },
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
                .select('id, organization_id, notification_preferences')
                .eq('organization_id', organizationId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data && data.notification_preferences) {
                setSettings(data as OrganizationSettings);
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
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
            alert('Preferências de notificação salvas!');
        } catch (error) {
            console.error('Error saving notification settings:', error);
            alert('Erro ao salvar preferências.');
        } finally {
            setIsSaving(false);
        }
    };

    const togglePref = (key: keyof NotificationPrefs) => {
        setSettings({
            ...settings,
            notification_preferences: {
                ...settings.notification_preferences,
                [key]: !settings.notification_preferences[key]
            }
        });
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>;

    const prefs = settings.notification_preferences;

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Canais de Notificação</h2>
                <p className="text-sm text-slate-500 mt-1">Defina como a organização recebe alertas</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">E-mail</h4>
                            <p className="text-xs text-slate-500">Notificações automáticas por e-mail</p>
                        </div>
                    </div>
                    <button
                        onClick={() => togglePref('email')}
                        className={`w-12 h-6 rounded-full transition-all relative ${prefs.email ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.email ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">Browser (Push)</h4>
                            <p className="text-xs text-slate-500">Alertas na área de trabalho</p>
                        </div>
                    </div>
                    <button
                        onClick={() => togglePref('browser')}
                        className={`w-12 h-6 rounded-full transition-all relative ${prefs.browser ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.browser ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">Mobile App</h4>
                            <p className="text-xs text-slate-500">Notificações no celular (em breve)</p>
                        </div>
                    </div>
                    <button
                        onClick={() => togglePref('mobile')}
                        className={`w-12 h-6 rounded-full transition-all relative ${prefs.mobile ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.mobile ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">Daily Digest</h4>
                            <p className="text-xs text-slate-500">Resumo diário de atividades pendentes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => togglePref('daily_digest')}
                        className={`w-12 h-6 rounded-full transition-all relative ${prefs.daily_digest ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.daily_digest ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};
