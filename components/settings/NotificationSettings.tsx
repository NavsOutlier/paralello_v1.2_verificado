import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, Bell, Mail, Monitor, Smartphone, Volume2 } from 'lucide-react';

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

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" /></div>;

    const prefs = settings.notification_preferences;

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <Bell className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Canais de Notificação</h2>
                    <p className="text-sm text-slate-400 mt-1">Defina como a organização recebe alertas</p>
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden shadow-xl">
                <div className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/10">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-base">E-mail</h4>
                            <p className="text-sm text-slate-400">Receba atualizações importantes direto na sua caixa de entrada</p>
                        </div>
                    </div>
                    <button
                        onClick={() => togglePref('email')}
                        className={`w-14 h-7 rounded-full transition-all relative ${prefs.email ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${prefs.email ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>

                <div className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-base">Notificações Web</h4>
                            <p className="text-sm text-slate-400">Pop-ups em tempo real enquanto você usa o sistema</p>
                        </div>
                    </div>
                    <button
                        onClick={() => togglePref('browser')}
                        className={`w-14 h-7 rounded-full transition-all relative ${prefs.browser ? 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${prefs.browser ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>

                <div className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors opacity-60">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/10">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-base">Mobile App</h4>
                                <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-2 rounded border border-white/5 uppercase">Em Breve</span>
                            </div>
                            <p className="text-sm text-slate-400">Notificações push em seus dispositivos móveis</p>
                        </div>
                    </div>
                    <button
                        onClick={() => togglePref('mobile')}
                        disabled
                        className={`w-14 h-7 rounded-full transition-all relative cursor-not-allowed ${prefs.mobile ? 'bg-amber-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-slate-400 rounded-full transition-all ${prefs.mobile ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>

                <div className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/10">
                            <Volume2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-base">Resumo Diário</h4>
                            <p className="text-sm text-slate-400">Um email diário com todas as suas tarefas pendentes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => togglePref('daily_digest')}
                        className={`w-14 h-7 rounded-full transition-all relative ${prefs.daily_digest ? 'bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.4)]' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${prefs.daily_digest ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};
