import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, Save, RefreshCw, Link } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface GlobalSetting {
    key: string;
    value: any;
    description: string;
}

export const SystemSettings: React.FC = () => {
    const [settings, setSettings] = useState<GlobalSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .order('key');

            if (error) throw error;
            setSettings(data || []);
        } catch (err) {
            console.error('Error loading settings:', err);
            showToast('Erro ao carregar configurações globais', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSetting = (key: string, newValue: any) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
    };

    const handleSaveSetting = async (key: string) => {
        const setting = settings.find(s => s.key === key);
        if (!setting) return;

        try {
            setSaving(key);
            const { error } = await supabase
                .from('system_settings')
                .update({ value: setting.value, updated_at: new Date().toISOString() })
                .eq('key', key);

            if (error) throw error;
            showToast('Configuração salva com sucesso', 'success');
        } catch (err) {
            console.error('Error saving setting:', err);
            showToast('Erro ao salvar configuração', 'error');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Parâmetros do Sistema</h3>
                        <p className="text-xs text-slate-500">Configurações globais que afetam todas as instâncias</p>
                    </div>
                </div>

                <div className="p-6 divide-y divide-slate-100">
                    {settings.length === 0 ? (
                        <p className="text-center py-8 text-slate-500 italic">Nenhuma configuração encontrada no banco de dados.</p>
                    ) : (
                        settings.map((setting) => (
                            <div key={setting.key} className="py-6 first:pt-0 last:pb-0">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{setting.key.replace(/_/g, ' ')}</span>
                                            {setting.key === 'tintim_webhook_base_url' && <Link className="w-3 h-3 text-indigo-400" />}
                                        </div>
                                        <p className="text-xs text-slate-500 mb-4">{setting.description}</p>

                                        <div className="relative max-w-2xl">
                                            <input
                                                type="text"
                                                value={setting.value}
                                                onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                placeholder="Insira o valor..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleSaveSetting(setting.key)}
                                        disabled={saving === setting.key}
                                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${saving === setting.key
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                                            }`}
                                    >
                                        {saving === setting.key ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        {saving === setting.key ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
