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
            <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Parâmetros do Sistema</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Configurações globais de orquestração</p>
                    </div>
                </div>

                <div className="p-8 divide-y divide-white/5">
                    {settings.length === 0 ? (
                        <p className="text-center py-8 text-slate-500 italic">Nenhuma configuração encontrada no banco de dados.</p>
                    ) : (
                        settings.map((setting) => (
                            <div key={setting.key} className="py-6 first:pt-0 last:pb-0">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] bg-white/5 px-3 py-1 rounded-full border border-white/5">{setting.key.replace(/_/g, ' ')}</span>
                                            {setting.key === 'tintim_webhook_base_url' && <Link className="w-3.5 h-3.5 text-indigo-400" />}
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium mb-5">{setting.description}</p>

                                        <div className="relative max-w-2xl">
                                            <input
                                                type="text"
                                                value={setting.value}
                                                onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm font-medium text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all shadow-inner"
                                                placeholder="Insira o valor..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleSaveSetting(setting.key)}
                                        disabled={saving === setting.key}
                                        className={`flex items-center gap-3 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${saving === setting.key
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                            : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:scale-95'
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
