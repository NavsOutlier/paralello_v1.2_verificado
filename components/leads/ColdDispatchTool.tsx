import React, { useState, useEffect, useMemo } from 'react';
import { Send, Loader2, AlertCircle, Phone, Code, Fingerprint, ChevronDown, Terminal, CheckCircle2, X, Tag, Users, AlignLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ColdDispatchToolProps {
    preselectedClientId?: string;
}

interface SenderNumber {
    id: string;
    name: string;
    phone_number_id: string;
    sender_phone?: string;
}

interface LeadTemplate {
    id: string;
    name: string;
    template_name: string;
    category: 'marketing' | 'utility' | 'authentication';
    content: string;
    status: 'pending' | 'approved' | 'rejected';
}

export const ColdDispatchTool: React.FC<ColdDispatchToolProps> = ({ preselectedClientId }) => {
    const { organizationId, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);

    // Config Lists
    const [availableNumbers, setAvailableNumbers] = useState<SenderNumber[]>([]);
    const [availableTemplates, setAvailableTemplates] = useState<LeadTemplate[]>([]);
    const [selectedClientName, setSelectedClientName] = useState('');

    // Selection State
    const [selectedTemplateName, setSelectedTemplateName] = useState('');
    const [selectedPhoneId, setSelectedPhoneId] = useState('');
    const [targetPhone, setTargetPhone] = useState('');

    // Response State
    const [responseLog, setResponseLog] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Fetch client data
    useEffect(() => {
        const fetchAll = async () => {
            if (!preselectedClientId || !organizationId) {
                setAvailableNumbers([]);
                setAvailableTemplates([]);
                setSelectedClientName('');
                return;
            }

            setFetchingData(true);

            // Fetch ONLY APPROVED templates for dispatch
            const [clientRes, numbersRes, templatesRes] = await Promise.all([
                supabase.from('clients').select('name').eq('id', preselectedClientId).single(),
                supabase.from('leads_sender_numbers').select('*').eq('client_id', preselectedClientId),
                supabase.from('leads_templates')
                    .select('*')
                    .eq('client_id', preselectedClientId)
                    .eq('status', 'approved') // Only approved ones!
            ]);

            if (clientRes.data) setSelectedClientName(clientRes.data.name);

            if (numbersRes.data) {
                setAvailableNumbers(numbersRes.data);
                if (numbersRes.data.length > 0) setSelectedPhoneId(numbersRes.data[0].id);
                else setSelectedPhoneId('');
            }

            if (templatesRes.data) {
                setAvailableTemplates(templatesRes.data);
                if (templatesRes.data.length > 0) setSelectedTemplateName(templatesRes.data[0].template_name);
                else setSelectedTemplateName('');
            }

            setFetchingData(false);
        };

        fetchAll();
    }, [preselectedClientId, organizationId]);

    // Group approved templates
    const groupedTemplates = useMemo(() => {
        const groups = {
            marketing: [] as LeadTemplate[],
            utility: [] as LeadTemplate[],
            authentication: [] as LeadTemplate[]
        };
        availableTemplates.forEach(t => {
            const cat = t.category || 'marketing';
            if (groups[cat]) groups[cat].push(t);
        });
        return groups;
    }, [availableTemplates]);

    // Selectors
    const currentSender = useMemo(() => availableNumbers.find(n => n.id === selectedPhoneId), [availableNumbers, selectedPhoneId]);
    const currentTemplate = useMemo(() => availableTemplates.find(t => t.template_name === selectedTemplateName), [availableTemplates, selectedTemplateName]);

    // Payload Preview
    const webhookPayloadPreview = useMemo(() => {
        let cleanToPhone = targetPhone.replace(/\D/g, '');
        if (cleanToPhone.length >= 10 && !cleanToPhone.startsWith('55')) {
            cleanToPhone = '55' + cleanToPhone;
        }

        return {
            source: "paralello_leads",
            type: "cold_dispatch",
            payload: {
                client_id: preselectedClientId || "CLIENTE_NAO_SELECIONADO",
                organization_id: organizationId || "ORG_NAO_SELECIONADA",
                user_id: user?.id || "USER_NAO_IDENTIFICADO",
                client_name: selectedClientName || "NOME_DO_CLIENTE",
                sender_target: currentSender?.sender_phone || currentSender?.phone_number_id || "SENDER_NAO_CONFIGURADO",
                template_name: selectedTemplateName || "TEMPLATE_NAO_SELECIONADO",
                language: "pt_BR",
                category: currentTemplate?.category || "marketing",
                to: cleanToPhone || "AGUARDANDO_TELEFONE",
                components: [],
                phone_number_id: currentSender?.phone_number_id || "ID_NAO_SELECIONADO",
                template_content: currentTemplate?.content || ""
            }
        };
    }, [selectedTemplateName, currentSender, targetPhone, preselectedClientId, organizationId, user, selectedClientName, currentTemplate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preselectedClientId) return;
        setLoading(true);
        setResponseLog(null);
        setShowPreview(true);

        try {
            let cleanPhone = targetPhone.replace(/\D/g, '');
            if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;

            const actualPayload = {
                client_id: preselectedClientId,
                organization_id: organizationId,
                user_id: user?.id,
                client_name: selectedClientName,
                template_name: selectedTemplateName,
                phone_number_id: currentSender?.phone_number_id,
                sender_target: currentSender?.sender_phone || currentSender?.phone_number_id,
                targets: [cleanPhone],
                language: 'pt_BR',
                category: currentTemplate?.category || 'marketing',
                variables: {}
            };

            const { data, error } = await supabase.functions.invoke('dispatch-cold-leads', { body: actualPayload });
            if (error) throw error;
            setResponseLog(data);
        } catch (err: any) {
            setResponseLog({ error: err.message, status: 'failed' });
        } finally {
            setLoading(false);
        }
    };

    if (fetchingData) return (
        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando dados...</p>
        </div>
    );

    const hasNumbers = availableNumbers.length > 0;
    const hasTemplates = availableTemplates.length > 0;

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {(!hasNumbers || !hasTemplates) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-10 text-center space-y-4 backdrop-blur-xl">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                    <h3 className="text-white font-black uppercase tracking-tight text-sm">Ação Necessária: {selectedClientName}</h3>
                    <p className="text-[10px] text-slate-400 max-w-sm mx-auto uppercase tracking-widest font-bold leading-relaxed">
                        {!hasNumbers ? "Este cliente não possui números cadastrados." : "Este cliente não possui templates APROVADOS para uso."}
                        <br />Vá em configurações para ajustar.
                    </p>
                </div>
            )}

            <div className={`${(!hasNumbers || !hasTemplates) ? 'opacity-30 pointer-events-none' : ''} bg-[#0f172a]/40 border border-white/5 rounded-3xl p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all divide-y divide-white/5`}>
                <div className="pb-10">
                    <div className="mb-10 text-center">
                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Painel de Disparo</h2>
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Cliente: {selectedClientName}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* TEMPLATE */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Tag className="w-4 h-4 text-violet-400" /> Template Ativo
                            </label>
                            <div className="relative group">
                                <select
                                    value={selectedTemplateName}
                                    onChange={(e) => setSelectedTemplateName(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-950/40 border border-white/10 rounded-2xl text-slate-200 focus:ring-2 focus:ring-violet-500/30 font-bold appearance-none cursor-pointer transition-all"
                                >
                                    {groupedTemplates.marketing.map(t => <option key={t.id} value={t.template_name}>{t.name} (MARKETING)</option>)}
                                    {groupedTemplates.utility.map(t => <option key={t.id} value={t.template_name}>{t.name} (UTILIDADE)</option>)}
                                    {groupedTemplates.authentication.map(t => <option key={t.id} value={t.template_name}>{t.name} (AUTENTICAÇÃO)</option>)}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                            </div>
                        </div>

                        {/* PREVIEW */}
                        {currentTemplate && (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2">
                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3" /> Template Aprovado - Prévia:
                                </p>
                                <p className="text-[11px] text-slate-300 leading-relaxed italic whitespace-pre-wrap font-medium">
                                    {currentTemplate.content || 'Sem texto cadastrado.'}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remetente</label>
                                <div className="relative">
                                    <select
                                        value={selectedPhoneId}
                                        onChange={(e) => setSelectedPhoneId(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-950/40 border border-white/10 rounded-2xl text-slate-200 focus:ring-2 focus:ring-cyan-500/30 font-bold appearance-none cursor-pointer transition-all"
                                    >
                                        {availableNumbers.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Telefone Destino</label>
                                <input
                                    type="text"
                                    value={targetPhone}
                                    onChange={(e) => setTargetPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    required
                                    className="w-full px-5 py-4 bg-slate-950/40 border border-white/10 rounded-2xl text-slate-200 focus:ring-2 focus:ring-indigo-500/30 font-bold placeholder:text-slate-800"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !hasTemplates}
                            className="w-full py-5 bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 border border-white/10"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Enviar Mensagem Aprovada</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
