import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, Clock, CheckCircle2, AlertCircle, Settings as SettingsIcon } from 'lucide-react';

interface OrganizationSettings {
    id?: string;
    organization_id: string;
    auto_archive_days: number;
    required_fields: string[];
}

interface WorkflowSettingsProps {
    organizationId: string;
}

const AVAILABLE_FIELDS = [
    { id: 'tags', label: 'Tags' },
    { id: 'deadline', label: 'Prazo' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'assignees', label: 'Responsáveis' },
];

export const WorkflowSettings: React.FC<WorkflowSettingsProps> = ({ organizationId }) => {
    const [settings, setSettings] = useState<OrganizationSettings>({
        organization_id: organizationId,
        auto_archive_days: 30,
        required_fields: [],
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
                .select('id, organization_id, auto_archive_days, required_fields')
                .eq('organization_id', organizationId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data) setSettings(data);
        } catch (error) {
            console.error('Error loading workflow settings:', error);
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
            alert('Configurações de workflow salvas!');
        } catch (error) {
            console.error('Error saving workflow settings:', error);
            alert('Erro ao salvar configurações.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleField = (fieldId: string) => {
        const current = settings.required_fields || [];
        const next = current.includes(fieldId)
            ? current.filter(id => id !== fieldId)
            : [...current, fieldId];
        setSettings({ ...settings, required_fields: next });
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" /></div>;

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                    <SettingsIcon className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Definições de Workflow</h2>
                    <p className="text-sm text-slate-400 mt-1">Configure o comportamento automático das tarefas</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Auto-archive */}
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 shadow-xl hover:border-purple-500/30 transition-colors">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/10">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white text-lg">Auto-arquivamento</h3>
                            <p className="text-xs text-slate-400 mb-6">Arquivar tarefas concluídas automaticamente após um período</p>

                            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                                <input
                                    type="number"
                                    value={settings.auto_archive_days}
                                    onChange={(e) => setSettings({ ...settings, auto_archive_days: parseInt(e.target.value) || 0 })}
                                    className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500/50 text-white font-mono text-center outline-none"
                                />
                                <span className="text-sm text-slate-300 font-medium">dias após a conclusão</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Required Fields */}
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 shadow-xl hover:border-purple-500/30 transition-colors">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500 border border-purple-500/10">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-white text-lg">Campos Obrigatórios</h3>
                            <p className="text-xs text-slate-400 mb-6">Bloquear conclusão se faltar informações</p>

                            <div className="grid grid-cols-2 gap-3">
                                {AVAILABLE_FIELDS.map(field => (
                                    <button
                                        key={field.id}
                                        onClick={() => toggleField(field.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-sm font-bold active:scale-95 ${(settings.required_fields || []).includes(field.id)
                                                ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-slate-500'
                                            }`}
                                    >
                                        {field.label}
                                        {(settings.required_fields || []).includes(field.id) && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};
