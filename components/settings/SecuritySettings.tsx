import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Lock, Eye, EyeOff, Loader2, Save, Users } from 'lucide-react';

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
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                    <Shield className="w-8 h-8 text-rose-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Segurança e Permissões</h2>
                    <p className="text-sm text-slate-400 mt-1">Controle o acesso e a visibilidade dos dados</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 shadow-xl">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 border border-rose-500/10">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">Controle de Acesso</h3>
                            <p className="text-sm text-slate-400 mb-6">Defina quem pode entrar e quem pode convidar</p>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-200 block">Acesso Restrito</span>
                                            <span className="text-xs text-slate-500">Novos membros entram apenas por convite</span>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full transition-all relative ${settings.invite_only ? 'bg-rose-600' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${settings.invite_only ? 'right-1' : 'left-1'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.invite_only}
                                        onChange={() => setSettings({ ...settings, invite_only: !settings.invite_only })}
                                        className="hidden"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-200 block">Convites de Membros</span>
                                            <span className="text-xs text-slate-500">Permitir que membros convidem outros usuários</span>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full transition-all relative ${settings.allow_member_invites ? 'bg-rose-600' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${settings.allow_member_invites ? 'right-1' : 'left-1'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.allow_member_invites}
                                        onChange={() => setSettings({ ...settings, allow_member_invites: !settings.allow_member_invites })}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 shadow-xl">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 border border-indigo-500/10">
                            <Eye className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">Privacidade de Dados</h3>
                            <p className="text-sm text-slate-400 mb-6">Controle a visibilidade de informações sensíveis</p>

                            <label className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                        <EyeOff className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-slate-200 block">Ocultar Clientes</span>
                                        <span className="text-xs text-slate-500">Membros veem apenas clientes atribuídos a eles</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full transition-all relative ${settings.restrict_client_view ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${settings.restrict_client_view ? 'right-1' : 'left-1'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.restrict_client_view}
                                    onChange={() => setSettings({ ...settings, restrict_client_view: !settings.restrict_client_view })}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};
