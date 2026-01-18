import React, { useState } from 'react';
import { X, Save, User, Phone, Calendar, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ManualLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    organizationId: string;
    clientId: string;
    onSuccess: () => void;
}

export const ManualLeadModal: React.FC<ManualLeadModalProps> = ({ isOpen, onClose, organizationId, clientId, onSuccess }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [source, setSource] = useState('manual');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate Phone (Basic check)
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length < 10) {
                alert('Telefone inválido. Digite DDD + Número.');
                setLoading(false);
                return;
            }

            // Insert into marketing_leads
            const { error } = await supabase.from('marketing_leads').insert({
                organization_id: organizationId,
                client_id: clientId,
                name: name || 'Lead Manual',
                phone: cleanPhone,
                source: source,
                first_interaction_at: new Date(date).toISOString(), // Use selected date
                created_at: new Date().toISOString() // Created now
            });

            if (error) throw error;

            onSuccess();
            onClose();
            setName('');
            setPhone('');
            setSource('manual');
        } catch (error) {
            console.error('Error inserting manual lead:', error);
            alert('Erro ao salvar lead. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        Novo Lead Manual
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Origem / Canal
                        </label>
                        <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="manual">Manual (Direto)</option>
                            <option value="indication">Indicação</option>
                            <option value="presencial">Presencial / Balcão</option>
                            <option value="whatsapp_active">WhatsApp (Ativo)</option>
                            <option value="outbound">Outbound / Prospecção</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Data
                            </label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                Telefone *
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="DDD + Número"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome do Lead (Opcional)</label>
                        <input
                            type="text"
                            placeholder="Ex: João da Silva"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Salvando...' : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Salvar Lead
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
