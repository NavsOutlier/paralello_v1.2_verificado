import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

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

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Definições de Workflow</h2>
                <p className="text-sm text-slate-500 mt-1">Configure o comportamento automático das tarefas</p>
            </div>

            <div className="space-y-6">
                {/* Auto-archive */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">Auto-arquivamento</h3>
                            <p className="text-xs text-slate-500 mb-4">Arquivar tarefas concluídas automaticamente após um período</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={settings.auto_archive_days}
                                    onChange={(e) => setSettings({ ...settings, auto_archive_days: parseInt(e.target.value) || 0 })}
                                    className="w-20 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                                <span className="text-sm text-slate-600 font-medium">dias após a conclusão</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Required Fields */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">Campos Obrigatórios</h3>
                            <p className="text-xs text-slate-500 mb-4">Selecione quais campos devem ser preenchidos antes de concluir uma tarefa</p>
                            <div className="grid grid-cols-2 gap-3">
                                {AVAILABLE_FIELDS.map(field => (
                                    <button
                                        key={field.id}
                                        onClick={() => toggleField(field.id)}
                                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all text-sm font-bold ${(settings.required_fields || []).includes(field.id)
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-100 hover:border-slate-200 text-slate-500'
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

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};
