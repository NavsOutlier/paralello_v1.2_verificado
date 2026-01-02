import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Info } from 'lucide-react';
import { Client } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface ClientFormModalProps {
    isOpen: boolean;
    client?: Client;
    onClose: () => void;
    onSave: (client: Partial<Client> & { autoCreateGroup?: boolean }) => Promise<void>;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
    isOpen,
    client,
    onClose,
    onSave
}) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<Partial<Client> & { autoCreateGroup: boolean }>({
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        whatsappGroupId: '',
        autoCreateGroup: false,
        notes: '',
        status: 'active'
    });
    const [groupMode, setGroupMode] = useState<'create' | 'link' | 'none'>('none');
    const [showHelp, setShowHelp] = useState(false);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                name: client?.name || '',
                email: client?.email || '',
                phone: client?.phone || '',
                whatsapp: client?.whatsapp || '',
                whatsappGroupId: client?.whatsappGroupId || '',
                notes: client?.notes || '',
                status: client?.status || 'active',
                autoCreateGroup: false
            });
            setGroupMode(client?.whatsappGroupId ? 'link' : 'none');
        }
    }, [isOpen, client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name?.trim()) {
            showToast('Nome é obrigatório', 'error');
            return;
        }

        if (groupMode === 'link' && !formData.whatsappGroupId?.trim()) {
            showToast('O ID do grupo é obrigatório para vincular um grupo existente', 'error');
            return;
        }

        setLoading(true);
        try {
            const finalPayload = {
                ...formData,
                name: formData.name.trim(),
                email: formData.email?.trim() || '',
                autoCreateGroup: groupMode === 'create',
                whatsappGroupId: groupMode === 'link' ? formData.whatsappGroupId : ''
            };

            await onSave(finalPayload);
            onClose();
        } catch (error) {
            console.error('Error saving client:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-800">
                        {client ? 'Editar Cliente' : 'Novo Cliente'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nome *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Telefone
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            WhatsApp
                        </label>
                        <input
                            type="tel"
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="(00) 00000-0000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                        </select>
                    </div>

                    {!client && (
                        <div className="space-y-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                            <label className="block text-sm font-semibold text-emerald-800 mb-2">
                                Grupo do WhatsApp
                            </label>

                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="groupMode"
                                        checked={groupMode === 'none'}
                                        onChange={() => setGroupMode('none')}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-emerald-700">Sem grupo no momento</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="groupMode"
                                        checked={groupMode === 'create'}
                                        onChange={() => setGroupMode('create')}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-emerald-700">Criar NOVO grupo automaticamente</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="groupMode"
                                        checked={groupMode === 'link'}
                                        onChange={() => setGroupMode('link')}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-emerald-700">Vincular grupo EXISTENTE (colar ID)</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {groupMode === 'link' && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    ID do Grupo WhatsApp *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowHelp(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    COMO ACHAR O ID?
                                </button>
                            </div>
                            <input
                                type="text"
                                required={groupMode === 'link'}
                                value={formData.whatsappGroupId}
                                onChange={(e) => setFormData({ ...formData, whatsappGroupId: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="1234567890@g.us"
                            />
                        </div>
                    )}

                    {showHelp && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                            <div className="bg-slate-900 text-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-700">
                                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                                    <div className="flex items-center gap-2">
                                        <Info className="w-5 h-5 text-blue-400" />
                                        <h3 className="font-semibold">Como encontrar o ID do Grupo</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowHelp(false)}
                                        className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-slate-800/80 p-6 rounded-xl space-y-5 text-sm leading-relaxed border border-slate-700">
                                        <h4 className="text-blue-400 text-base font-extrabold mb-4 tracking-tight">Método 1: Usando as Ferramentas de Desenvolvedor</h4>

                                        <div className="space-y-4 text-slate-100">
                                            <p><span className="text-white font-bold mr-2">1. Abra o WhatsApp Web:</span>Vá para <code className="bg-slate-700 px-1.5 py-0.5 rounded text-blue-300">web.whatsapp.com</code> e faça login.</p>

                                            <p><span className="text-white font-bold mr-2">2. Acesse o Grupo:</span>Abra a conversa do grupo desejado.</p>

                                            <p><span className="text-white font-bold mr-2">3. Abra as Ferramentas de Desenvolvedor:</span>Clique com o botão direito na página e selecione <span className="text-yellow-400">"Inspecionar"</span> (ou use as teclas <code className="bg-slate-700 px-1.5 py-0.5 rounded text-yellow-200">Ctrl+Shift+I</code> / <code className="bg-slate-700 px-1.5 py-0.5 rounded text-yellow-200">Cmd+Option+I</code>).</p>

                                            <p><span className="text-white font-bold mr-2">4. Procure por <code className="text-emerald-400 font-bold">@g.us</code>:</span>No painel de elementos, use <code className="bg-slate-700 px-1.5 py-0.5 rounded text-emerald-200">Ctrl+F</code> para buscar por <code className="text-emerald-400">@g.us</code>. Você verá uma linha com <code className="text-emerald-300">data-id="... @g.us"</code>.</p>

                                            <p><span className="text-white font-bold mr-2">5. Copie o ID:</span>O código que termina em <code className="text-emerald-400 font-bold">@g.us</code> é o ID único do seu grupo.</p>
                                        </div>

                                        <div className="pt-2 border-t border-slate-700">
                                            <p className="text-[11px] text-slate-400 italic">Dica: O ID sempre começa com números e termina em @g.us</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-800/50 flex justify-end">
                                    <button
                                        onClick={() => setShowHelp(false)}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Entendi
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Observações
                        </label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Notas sobre o cliente..."
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
