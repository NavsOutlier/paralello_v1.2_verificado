import React, { useState } from 'react';
import { X, Save, User, Phone, Calendar, Banknote, Clock, Loader2 } from 'lucide-react';
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-[#0d121f] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0d121f]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <Banknote className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-lg">Nova Venda Manual</h3>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Registro de Conversão</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                Data da Venda
                            </label>
                            <input
                                type="date"
                                required
                                value={convertedAt}
                                onChange={(e) => setConvertedAt(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                1º Contato
                            </label>
                            <input
                                type="date"
                                required
                                value={firstContactAt}
                                onChange={(e) => setFirstContactAt(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            Telefone do Cliente *
                        </label>
                        <input
                            type="tel"
                            required
                            placeholder="DDD + Número"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none placeholder:text-slate-600"
                        />
                        <p className="text-[9px] text-slate-500 font-medium">Usado para atribuir origem automaticamente.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Banknote className="w-3.5 h-3.5" />
                                Valor (R$) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0,00"
                                value={revenue}
                                onChange={(e) => setRevenue(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none placeholder:text-slate-600"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                Nome (Opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Maria"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-800 border border-white/5 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {loading ? 'Salvando...' : 'Salvar Venda'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
