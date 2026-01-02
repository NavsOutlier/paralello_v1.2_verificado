import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Lock, Eye, EyeOff, Loader2, Save } from 'lucide-react';

interface SecuritySettingsProps {
    organizationId: string;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ organizationId }) => {
    const [isSaving, setIsSaving] = useState(false);

    // Mock settings for now as they require deeper backend integration
    const [settings, setSettings] = useState({
        invite_only: true,
        allow_member_invites: false,
        restrict_client_view: true
    });

    const handleSave = async () => {
        setIsSaving(true);
        // In a real app, this would save to organization_settings.security_config JSONB
        setTimeout(() => {
            setIsSaving(false);
            alert('Configurações de segurança atualizadas!');
        }, 1000);
    };

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Segurança e Permissões</h2>
                <p className="text-sm text-slate-500 mt-1">Controle o acesso e a visibilidade dos dados</p>
            </div>

            <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">Políticas de Convite</h3>
                            <p className="text-xs text-slate-500 mb-4">Gerencie como novos membros entram na organização</p>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-bold text-slate-700">Apenas por convite</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.invite_only}
                                        onChange={() => setSettings({ ...settings, invite_only: !settings.invite_only })}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-bold text-slate-700">Membros podem convidar</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.allow_member_invites}
                                        onChange={() => setSettings({ ...settings, allow_member_invites: !settings.allow_member_invites })}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Eye className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">Restrições de Visualização</h3>
                            <p className="text-xs text-slate-500 mb-4">Limite o que os membros podem ver por padrão</p>

                            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <EyeOff className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-bold text-slate-700">Restringir visão de clientes</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.restrict_client_view}
                                    onChange={() => setSettings({ ...settings, restrict_client_view: !settings.restrict_client_view })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                                />
                            </label>
                        </div>
                    </div>
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
import { Users } from 'lucide-react';
