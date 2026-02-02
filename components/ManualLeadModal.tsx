import React, { useState } from 'react';
import { X, Save, User, Phone, Calendar, Tag, Loader2 } from 'lucide-react';
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
            // Validate Phone and Enforce '55' prefix
            let cleanPhone = phone.replace(/\D/g, '');

            // If phone starts with 10-11 digits (no country code), add 55
            if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                cleanPhone = '55' + cleanPhone;
            }

            if (cleanPhone.length < 12) { // 55 + 2 (DDD) + 8-9 (Number) = minimum 12
                alert('Telefone inválido. Digite DDD + Número (ex: 11999999999).');
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-[#0d121f] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0d121f]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <User className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-lg">Novo Lead Manual</h3>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Registro de Entrada</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" />
                            Origem / Canal
                        </label>
                        <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                        >
                            <option value="manual">Manual (Direto)</option>
                            <option value="indication">Indicação</option>
                            <option value="presencial">Presencial / Balcão</option>
                            <option value="whatsapp_active">WhatsApp (Ativo)</option>
                            <option value="outbound">Outbound / Prospecção</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                Data
                            </label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                Telefone *
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="DDD + Número"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-slate-500">Nome do Lead (Opcional)</label>
                        <input
                            type="text"
                            placeholder="Ex: João da Silva"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none placeholder:text-slate-600"
                        />
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
                            className="flex-1 py-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {loading ? 'Salvando...' : 'Salvar Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
