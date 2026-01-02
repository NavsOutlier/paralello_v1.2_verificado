import React, { useState } from 'react';
import { Client } from '../../types';

interface ClientFormModalProps {
    isOpen: boolean;
    client?: Client;
    onClose: () => void;
    onSave: (client: Partial<Client>) => Promise<void>;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
    isOpen,
    client,
    onClose,
    onSave
}) => {
    const [formData, setFormData] = useState<Partial<Client>>({
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        whatsappGroupId: '',
        notes: '',
        status: 'active'
    });
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
                status: client?.status || 'active'
            });
        }
    }, [isOpen, client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name?.trim()) return;

        setLoading(true);
        try {
            await onSave({
                ...formData,
                name: formData.name.trim(),
                email: formData.email?.trim() || '',
            });
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

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            ID do Grupo WhatsApp (@g.us)
                        </label>
                        <input
                            type="text"
                            value={formData.whatsappGroupId}
                            onChange={(e) => setFormData({ ...formData, whatsappGroupId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="1234567890@g.us"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                            Deixe vazio para mapeamento automático na primeira mensagem recebida.
                        </p>
                    </div>

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
