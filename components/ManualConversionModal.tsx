import React, { useState } from 'react';
import { X, Save, User, Phone, Calendar, Banknote, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ManualConversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    organizationId: string;
    clientId: string;
    onSuccess: () => void;
}

export const ManualConversionModal: React.FC<ManualConversionModalProps> = ({ isOpen, onClose, organizationId, clientId, onSuccess }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [convertedAt, setConvertedAt] = useState(new Date().toISOString().split('T')[0]);
    const [firstContactAt, setFirstContactAt] = useState(new Date().toISOString().split('T')[0]);
    const [revenue, setRevenue] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate Phone and Enforce '55' prefix
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                cleanPhone = '55' + cleanPhone;
            }

            if (cleanPhone.length < 12) {
                alert('Telefone inválido. Digite DDD + Número (ex: 11999999999).');
                setLoading(false);
                return;
            }

            // Validate Revenue
            const cleanRevenue = parseFloat(revenue.replace(',', '.'));
            if (isNaN(cleanRevenue) || cleanRevenue < 0) {
                alert('Valor da venda inválido.');
                setLoading(false);
                return;
            }

            // Insert into marketing_conversions
            const { error } = await supabase.from('marketing_conversions').insert({
                organization_id: organizationId,
                client_id: clientId,
                name: name || 'Venda Manual',
                phone: cleanPhone,
                source: 'manual', // Dashboard will try to match this phone to a lead to attribute real source
                converted_at: new Date(convertedAt).toISOString(),
                first_contact_at: new Date(firstContactAt).toISOString(),
                revenue: cleanRevenue,
                provider: 'manual',
                created_at: new Date().toISOString()
            });

            if (error) throw error;

            onSuccess();
            onClose();
            setName('');
            setPhone('');
            setRevenue('');
        } catch (error) {
            console.error('Error inserting manual conversion:', error);
            alert('Erro ao salvar venda. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        Nova Venda Manual
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Data da Venda
                            </label>
                            <input
                                type="date"
                                required
                                value={convertedAt}
                                onChange={(e) => setConvertedAt(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                1º Contato
                            </label>
                            <input
                                type="date"
                                required
                                value={firstContactAt}
                                onChange={(e) => setFirstContactAt(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Telefone do Cliente *
                        </label>
                        <input
                            type="tel"
                            required
                            placeholder="DDD + Número"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <p className="text-[10px] text-slate-400">Usado para identificar a origem do lead automaticamente.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Banknote className="w-3 h-3" />
                                Valor (R$) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0,00"
                                value={revenue}
                                onChange={(e) => setRevenue(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Nome (Opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Maria"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
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
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Salvando...' : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Salvar Venda
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
