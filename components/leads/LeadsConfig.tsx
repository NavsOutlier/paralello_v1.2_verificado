import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Plus, Trash2, Code, Loader2, AlertCircle, Clock, CheckCircle2,
    XCircle, User, Send, Settings2, Smartphone, Layout, Fingerprint,
    Sparkles, Link2, Unlink, Phone, Check, Languages, History
} from 'lucide-react';

interface SenderNumber {
    id: string;
    organization_id: string;
    client_id: string;
    name: string;
    phone_number_id: string;
    sender_phone?: string;
}

interface LeadTemplate {
    id: string;
    organization_id: string;
    client_id: string;
    name: string;
    template_name: string;
    category: 'marketing' | 'utility' | 'authentication';
    content: string;
    status: 'pending' | 'approved' | 'rejected';
    language?: string;
}

interface LeadsConfigProps {
    selectedClientId: string;
}

const LANGUAGES = [
    { code: 'pt_BR', name: 'Português (Brasil)' },
    { code: 'en_US', name: 'Inglês (EUA)' },
    { code: 'es', name: 'Espanhol' },
    { code: 'fr', name: 'Francês' },
    { code: 'de', name: 'Alemão' },
    { code: 'it', name: 'Italiano' },
    { code: 'ar', name: 'Árabe' },
    { code: 'zh_CN', name: 'Chinês (Simplificado)' },
    { code: 'ru', name: 'Russo' },
    { code: 'ja', name: 'Japonês' }
];

export const LeadsConfig: React.FC<LeadsConfigProps> = ({ selectedClientId }) => {
    const { organizationId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedClientName, setSelectedClientName] = useState('');

    const [activeNumber, setActiveNumber] = useState<SenderNumber | null>(null);
    const [templates, setTemplates] = useState<LeadTemplate[]>([]);

    const [newNumber, setNewNumber] = useState({ name: '', phone_number_id: '', sender_phone: '' });
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        category: 'marketing' as const,
        language: 'pt_BR',
        content: ''
    });

    useEffect(() => {
        if (!selectedClientId) return;
        fetchData();
        const channel = supabase
            .channel(`leads-config-standard-${selectedClientId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_templates', filter: `client_id=eq.${selectedClientId}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_sender_numbers', filter: `client_id=eq.${selectedClientId}` }, () => fetchData())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [selectedClientId]);

    const fetchData = async () => {
        if (!selectedClientId) return;
        setLoading(true);
        try {
            const [clientRes, numbersRes, templatesRes] = await Promise.all([
                supabase.from('clients').select('name').eq('id', selectedClientId).single(),
                supabase.from('leads_sender_numbers').select('*').eq('client_id', selectedClientId).order('created_at', { ascending: false }),
                supabase.from('leads_templates').select('*').eq('client_id', selectedClientId)
            ]);
            if (clientRes.data) setSelectedClientName(clientRes.data.name);
            setActiveNumber(numbersRes.data && numbersRes.data.length > 0 ? numbersRes.data[0] : null);
            setTemplates(templatesRes.data || []);
        } catch (err) {
            setError('Erro ao sincronizar.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNumber = async () => {
        if (!newNumber.name || !newNumber.phone_number_id || !newNumber.sender_phone) return;
        setSaving(true);
        if (activeNumber) await supabase.from('leads_sender_numbers').delete().eq('client_id', selectedClientId);
        const { error: err } = await supabase.from('leads_sender_numbers').insert([{
            ...newNumber, organization_id: organizationId, client_id: selectedClientId
        }]);
        if (err) setError(err.message);
        else setNewNumber({ name: '', phone_number_id: '', sender_phone: '' });
        setSaving(false);
    };

    const handleAddTemplate = async () => {
        if (!newTemplate.name || !newTemplate.content) return;
        setSaving(true);

        const technicalName = newTemplate.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .trim();

        const { error: err } = await supabase.from('leads_templates').insert([{
            name: newTemplate.name,
            template_name: technicalName,
            category: newTemplate.category,
            language: newTemplate.language,
            content: newTemplate.content,
            organization_id: organizationId,
            client_id: selectedClientId,
            status: 'pending'
        }]);

        if (err) setError(err.code === '23505' ? 'Este nome já está em uso.' : err.message);
        else setNewTemplate({ name: '', category: 'marketing', language: 'pt_BR', content: '' });
        setSaving(false);
    };

    const handleDelete = async (table: 'leads_templates' | 'leads_sender_numbers', id: string) => {
        await supabase.from(table).delete().eq('id', id);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-16 animate-pulse space-y-4 h-full">
            <Loader2 className="w-8 h-8 text-[#6366f1] animate-spin" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sincronizando Leads...</p>
        </div>
    );

    const approved = templates.filter(t => t.status === 'approved');
    const pending = templates.filter(t => t.status === 'pending');
    const rejected = templates.filter(t => t.status === 'rejected');

    return (
        <div className="max-w-[1300px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

            {/* 1. SEÇÃO DE HEADER IDENTIDADE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                            <Smartphone className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Canais de Disparo</h1>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{selectedClientName || 'Carregando...'}</p>
                        </div>
                    </div>

                    {/* INDICADORES DE STATUS NO HEADER */}
                    <div className="hidden lg:flex items-center gap-1.5 bg-white/5 p-1.5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Aprovados</span>
                            <span className="text-xs font-black text-emerald-400">{approved.length}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Análise</span>
                            <span className="text-xs font-black text-amber-400">{pending.length}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Erros</span>
                            <span className="text-xs font-black text-red-400">{rejected.length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 bg-slate-900/40 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                    <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">
                        <Settings2 className="w-4 h-4" /> Configuração
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all">
                        <History className="w-4 h-4" /> Histórico de disparos
                    </button>
                </div>
            </div>

            {/* 2. ESTAÇÃO DE CONEXÃO */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-800 rounded-xl border border-white/5">
                        <Link2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h3 className="font-black text-slate-300 text-[11px] uppercase tracking-[0.2em]">Estação de Conexão</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <section className={`${activeNumber ? 'md:col-span-12' : 'md:col-span-8'} bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 flex items-center justify-between shadow-2xl transition-all duration-700`}>
                        <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 ${activeNumber ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20' : 'bg-slate-800'} rounded-[1.25rem] flex items-center justify-center shadow-xl transition-all`}>
                                {activeNumber ? <Check className="w-8 h-8 text-white" /> : <Smartphone className="w-7 h-7 text-slate-600" />}
                            </div>
                            {activeNumber ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:divide-x md:divide-white/10">
                                    <div>
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 opacity-60">Canal Identificado</p>
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{activeNumber.name}</h4>
                                    </div>
                                    <div className="md:pl-12">
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 opacity-60">WABA Oficial</p>
                                        <p className="text-base font-black text-indigo-400 tracking-tight">{activeNumber.sender_phone}</p>
                                    </div>
                                    <div className="md:pl-12">
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 opacity-60">Status API</p>
                                        <p className="text-[11px] text-slate-400 font-mono tracking-tighter">PH-{activeNumber.phone_number_id}</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="text-sm font-black text-white/50 uppercase tracking-tight">VINCULAÇÃO PENDENTE</h4>
                                    <p className="text-[11px] text-slate-600 font-semibold mt-1">Preencha os campos ao lado para registrar o número oficial.</p>
                                </div>
                            )}
                        </div>
                        {activeNumber && (
                            <button onClick={() => handleDelete('leads_sender_numbers', activeNumber.id)} className="px-6 py-3 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-black uppercase rounded-xl border border-red-500/20 transition-all shadow-xl active:scale-95">
                                <Unlink className="w-4 h-4 mr-2 inline" /> Desconectar Canal
                            </button>
                        )}
                    </section>

                    {!activeNumber && (
                        <section className="md:col-span-4 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                            <div className="space-y-3">
                                <input type="text" placeholder="APELIDO DO CANAL" value={newNumber.name} onChange={e => setNewNumber({ ...newNumber, name: e.target.value })} className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-xl text-[11px] text-white focus:ring-2 focus:ring-indigo-500/40 focus:outline-none placeholder:text-slate-600 transition-all font-bold" />
                                <input type="text" placeholder="DDD + NÚMERO" value={newNumber.sender_phone} onChange={e => setNewNumber({ ...newNumber, sender_phone: e.target.value })} className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-xl text-[11px] text-emerald-400 font-black focus:ring-2 focus:ring-indigo-500/40 focus:outline-none placeholder:text-slate-600 transition-all" />
                                <input type="text" placeholder="PHONE ID (META)" value={newNumber.phone_number_id} onChange={e => setNewNumber({ ...newNumber, phone_number_id: e.target.value })} className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-xl text-[11px] text-indigo-400 font-mono focus:ring-2 focus:ring-indigo-500/40 focus:outline-none placeholder:text-slate-600 transition-all" />
                            </div>
                            <button onClick={handleAddNumber} disabled={saving} className="w-full py-4 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] transition-all shadow-xl shadow-indigo-500/30 active:scale-95">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'VINCULAR AGORA'}
                            </button>
                        </section>
                    )}
                </div>
            </div>

            {/* 3. ENGENHARIA DE TEMPLATE */}
            <div className="space-y-4 mt-12">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-800 rounded-xl border border-white/5">
                        <Layout className="w-4 h-4 text-violet-400" />
                    </div>
                    <h3 className="font-black text-slate-300 text-[11px] uppercase tracking-[0.2em]">Engenharia de Template</h3>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="grid grid-cols-1 lg:grid-cols-5 bg-white/[0.02]">
                        <div className="lg:col-span-2 p-10 space-y-8">
                            <div className="space-y-2.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Identificação Interna</label>
                                <div className="relative">
                                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                    <input type="text" placeholder="EX: BOAS VINDAS" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-[11px] text-white font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Idioma Oficial Meta</label>
                                <div className="relative">
                                    <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                    <select value={newTemplate.language} onChange={e => setNewTemplate({ ...newTemplate, language: e.target.value })} className="w-full pl-12 pr-10 py-4 bg-black/40 border border-white/5 rounded-2xl text-[11px] text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none">
                                        {LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-[9px]">▼</div>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoria Comercial</label>
                                <select value={newTemplate.category} onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value as any })} className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-[11px] text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/40 transition-all appearance-none">
                                    <option value="marketing">MARKETING</option>
                                    <option value="utility">UTILIDADE</option>
                                    <option value="authentication">AUTENTICAÇÃO</option>
                                </select>
                            </div>
                            <button onClick={handleAddTemplate} disabled={saving} className="w-full py-5 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-[1.25rem] text-[12px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-indigo-500/40 hover:scale-[1.02] active:scale-95">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'SOLICITAR APROVAÇÃO'}
                            </button>
                        </div>

                        <div className="lg:col-span-3 p-10 bg-black/20 flex flex-col border-l border-white/5 shadow-inner">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Payload (Estrutura da Mensagem)</label>
                            <textarea placeholder="Construa o corpo da mensagem oficial aqui..." value={newTemplate.content} onChange={e => setNewTemplate({ ...newTemplate, content: e.target.value })} className="w-full flex-1 min-h-[280px] p-8 bg-black/40 border border-white/5 rounded-[2rem] text-[12px] text-slate-200 font-medium leading-relaxed resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                            <div className="mt-4 flex items-center justify-between text-[8px] text-slate-700 font-extrabold uppercase tracking-widest">
                                <span className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-violet-500" /> Suporte: Variáveis {"{{1}}"} e Markdown</span>
                                <span>Preview Engine Ativa</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. GRID DE STATUS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-16 pb-32">
                {[
                    { label: 'DISPONÍVEIS', icon: CheckCircle2, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', list: approved },
                    { label: 'ANÁLISE META', icon: Clock, bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', list: pending },
                    { label: 'RECUSADOS', icon: XCircle, bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', list: rejected }
                ].map((col, idx) => (
                    <section key={idx} className="space-y-5">
                        <div className={`flex items-center justify-between p-5 ${col.bg} border ${col.border} rounded-2xl shadow-xl backdrop-blur-md`}>
                            <div className="flex items-center gap-3">
                                <col.icon className={`w-5 h-5 ${col.text}`} />
                                <h3 className={`text-[11px] font-black ${col.text} uppercase tracking-[0.2em]`}>{col.label}</h3>
                            </div>
                            <span className={`text-[12px] font-black ${col.text}`}>{col.list.length}</span>
                        </div>
                        <div className="space-y-4">
                            {col.list.map(t => (
                                <div key={t.id} className="p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] group hover:border-indigo-500/40 transition-all shadow-2xl">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-slate-800 rounded-xl border border-white/5">
                                                <Code className={`w-4 h-4 ${col.text}`} />
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-black text-white uppercase tracking-tight">{t.name}</p>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">{t.language}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete('leads_templates', t.id)} className="p-2 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all scale-110"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <div className="px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-[11px] text-slate-400 italic truncate font-medium">
                                        {t.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {error && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-red-600 px-10 py-5 rounded-2xl border border-white/30 flex items-center gap-6 animate-in slide-in-from-bottom-10 shadow-[0_25px_60px_-15px_rgba(220,38,38,0.5)]">
                    <AlertCircle className="w-7 h-7 text-white" />
                    <div>
                        <p className="text-[14px] font-black text-white uppercase leading-tight">{error}</p>
                        <p className="text-[10px] text-white/60 font-black uppercase mt-1 tracking-widest">Erro de Sistema</p>
                    </div>
                    <button onClick={() => setError(null)} className="p-2 text-white hover:bg-white/20 rounded-full transition-all"><XCircle className="w-5 h-5" /></button>
                </div>
            )}
        </div>
    );
};
