import React, { useState, useEffect } from 'react';
import {
    X,
    Calendar,
    ExternalLink,
    FolderOpen,
    MessageCircle,
    Edit3,
    Check,
    Plus,
    Trash2,
    Video,
    Clock,
    DollarSign,
    AlertCircle,
    Smile,
    Meh,
    Frown,
    Users,
    Copy,
    Link2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Client } from '../../types';

interface BudgetItem {
    service: string;
    amount: number;
    color: string;
}

interface MeetingInfo {
    title: string;
    date: string;
    time: string;
    type: 'video' | 'call' | 'presential';
}

interface QuickLink {
    label: string;
    url: string;
    icon: 'folder' | 'link' | 'doc';
}

interface ClientMetadata {
    id?: string;
    client_id: string;
    organization_id: string;
    priority: 'high' | 'medium' | 'low';
    health_status: 'onboarding' | 'happy' | 'neutral' | 'at_risk' | 'churning';
    client_since: string | null;
    monthly_budget: BudgetItem[];
    last_meeting: MeetingInfo | null;
    quick_links: QuickLink[];
    whatsapp_group_url: string | null;
}

interface ClientInfoDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    width?: number;
}

const PRIORITY_CONFIG = {
    high: { label: 'Alta', color: 'bg-rose-500', dot: 'bg-rose-500' },
    medium: { label: 'Média', color: 'bg-amber-500', dot: 'bg-amber-500' },
    low: { label: 'Baixa', color: 'bg-emerald-500', dot: 'bg-emerald-500' }
};

const STATUS_CONFIG = {
    onboarding: { label: 'Onboarding', icon: Users, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    happy: { label: 'Feliz', icon: Smile, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    neutral: { label: 'Neutro', icon: Meh, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
    at_risk: { label: 'Em Risco', icon: AlertCircle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    churning: { label: 'Churn', icon: Frown, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
};

const SERVICE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export const ClientInfoDrawer: React.FC<ClientInfoDrawerProps> = ({
    isOpen,
    onClose,
    client,
    width = 440
}) => {
    const { organizationId } = useAuth();
    const { showToast } = useToast();
    const [metadata, setMetadata] = useState<ClientMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingBudget, setEditingBudget] = useState(false);
    const [editingLinks, setEditingLinks] = useState(false);
    const [newBudgetItem, setNewBudgetItem] = useState({ service: '', amount: 0 });
    const [newLink, setNewLink] = useState({ label: '', url: '' });

    useEffect(() => {
        if (isOpen && client?.id && organizationId) {
            loadMetadata();
        }
    }, [isOpen, client?.id, organizationId]);

    const loadMetadata = async () => {
        if (!client?.id || !organizationId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('client_metadata')
                .select('*')
                .eq('client_id', client.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading metadata:', error);
                showToast('Erro ao carregar dados', 'error');
            }

            if (data) {
                setMetadata({
                    ...data,
                    monthly_budget: data.monthly_budget || [],
                    quick_links: data.quick_links || [],
                    last_meeting: data.last_meeting || null
                });
            } else {
                // Create default metadata
                setMetadata({
                    client_id: client.id,
                    organization_id: organizationId,
                    priority: 'medium',
                    health_status: 'onboarding',
                    client_since: client.createdAt ? new Date(client.createdAt).toISOString().split('T')[0] : null,
                    monthly_budget: [],
                    last_meeting: null,
                    quick_links: [],
                    whatsapp_group_url: client.whatsappGroupId ? `https://chat.whatsapp.com/${client.whatsappGroupId}` : null
                });
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveMetadata = async (updates: Partial<ClientMetadata>) => {
        if (!metadata || !client?.id || !organizationId) return;

        setSaving(true);
        try {
            const payload = {
                ...metadata,
                ...updates,
                client_id: client.id,
                organization_id: organizationId
            };

            const { error } = await supabase
                .from('client_metadata')
                .upsert(payload, {
                    onConflict: 'client_id'
                });

            if (error) throw error;

            setMetadata(prev => prev ? { ...prev, ...updates } : null);
            showToast('Dados salvos!', 'success');
        } catch (err) {
            console.error('Error saving:', err);
            showToast('Erro ao salvar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePriorityChange = (priority: 'high' | 'medium' | 'low') => {
        saveMetadata({ priority });
    };

    const handleStatusChange = (health_status: ClientMetadata['health_status']) => {
        saveMetadata({ health_status });
    };

    const addBudgetItem = () => {
        if (!newBudgetItem.service.trim() || newBudgetItem.amount <= 0) return;

        const newItem: BudgetItem = {
            service: newBudgetItem.service.trim(),
            amount: newBudgetItem.amount,
            color: SERVICE_COLORS[(metadata?.monthly_budget.length || 0) % SERVICE_COLORS.length]
        };

        const updatedBudget = [...(metadata?.monthly_budget || []), newItem];
        saveMetadata({ monthly_budget: updatedBudget });
        setNewBudgetItem({ service: '', amount: 0 });
    };

    const removeBudgetItem = (index: number) => {
        const updatedBudget = metadata?.monthly_budget.filter((_, i) => i !== index) || [];
        saveMetadata({ monthly_budget: updatedBudget });
    };

    const addQuickLink = () => {
        if (!newLink.label.trim() || !newLink.url.trim()) return;

        const newLinkItem: QuickLink = {
            label: newLink.label.trim(),
            url: newLink.url.trim(),
            icon: newLink.url.includes('drive.google') ? 'folder' : 'link'
        };

        const updatedLinks = [...(metadata?.quick_links || []), newLinkItem];
        saveMetadata({ quick_links: updatedLinks });
        setNewLink({ label: '', url: '' });
    };

    const removeQuickLink = (index: number) => {
        const updatedLinks = metadata?.quick_links.filter((_, i) => i !== index) || [];
        saveMetadata({ quick_links: updatedLinks });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Copiado!', 'success');
    };

    const totalBudget = metadata?.monthly_budget.reduce((sum, item) => sum + item.amount, 0) || 0;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getClientSinceYear = () => {
        if (!metadata?.client_since) return null;
        return new Date(metadata.client_since).getFullYear();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl shadow-black/50 z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ width: `${width}px` }}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20 border border-white/20">
                                {client?.name?.slice(0, 2).toUpperCase() || 'CL'}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white leading-tight">
                                    {client?.name || 'Cliente'}
                                </h2>
                                {getClientSinceYear() && (
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        Cliente desde {getClientSinceYear()}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-100px)] custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <>
                            {/* Priority Section */}
                            <section>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                                    Prioridade
                                </label>
                                <div className="flex items-center gap-2">
                                    {(['high', 'medium', 'low'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => handlePriorityChange(p)}
                                            className={`flex-1 py-2.5 px-4 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2 ${metadata?.priority === p
                                                ? 'bg-white/10 border-white/20 text-white'
                                                : 'bg-transparent border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[p].dot}`} />
                                            <span className="text-xs font-bold">{PRIORITY_CONFIG[p].label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Status Section */}
                            <section>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                                    Status do Cliente
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, config]) => {
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => handleStatusChange(key)}
                                                className={`py-2.5 px-3 rounded-xl border transition-all duration-200 flex items-center gap-2 ${metadata?.health_status === key
                                                    ? config.color + ' border-current'
                                                    : 'bg-transparent border-white/5 text-slate-500 hover:border-white/10'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span className="text-xs font-bold">{config.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Monthly Budget Section */}
                            <section className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-emerald-400" />
                                        <span className="text-sm font-bold text-white">Orçamento Mensal</span>
                                    </div>
                                    <button
                                        onClick={() => setEditingBudget(!editingBudget)}
                                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                        {editingBudget ? 'Concluir' : 'Editar'}
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {metadata?.monthly_budget.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-sm text-slate-300">{item.service}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-emerald-400">{formatCurrency(item.amount)}</span>
                                                {editingBudget && (
                                                    <button
                                                        onClick={() => removeBudgetItem(i)}
                                                        className="p-1 text-rose-400 hover:text-rose-300"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {editingBudget && (
                                        <div className="flex items-center gap-2 pt-2">
                                            <input
                                                type="text"
                                                value={newBudgetItem.service}
                                                onChange={(e) => setNewBudgetItem(prev => ({ ...prev, service: e.target.value }))}
                                                placeholder="Serviço"
                                                className="flex-1 px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                                            />
                                            <input
                                                type="number"
                                                value={newBudgetItem.amount || ''}
                                                onChange={(e) => setNewBudgetItem(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                                placeholder="R$"
                                                className="w-24 px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                                            />
                                            <button
                                                onClick={addBudgetItem}
                                                className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {totalBudget > 0 && (
                                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10">
                                            <span className="text-sm font-bold text-slate-400">Total</span>
                                            <span className="text-lg font-black text-white">{formatCurrency(totalBudget)}</span>
                                        </div>
                                    )}

                                    {metadata?.monthly_budget.length === 0 && !editingBudget && (
                                        <p className="text-xs text-slate-500 text-center py-4">
                                            Nenhum orçamento definido
                                        </p>
                                    )}
                                </div>
                            </section>

                            {/* Last Meeting Section */}
                            <section className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="w-4 h-4 text-indigo-400" />
                                    <span className="text-sm font-bold text-white">Última Reunião</span>
                                </div>

                                {metadata?.last_meeting ? (
                                    <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl">
                                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                                            <Video className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">{metadata.last_meeting.title}</p>
                                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(metadata.last_meeting.date)} • {metadata.last_meeting.time}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 text-center py-4">
                                        Nenhuma reunião registrada
                                    </p>
                                )}
                            </section>

                            {/* Quick Links Section */}
                            <section className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Link2 className="w-4 h-4 text-amber-400" />
                                        <span className="text-sm font-bold text-white">Links Rápidos</span>
                                    </div>
                                    <button
                                        onClick={() => setEditingLinks(!editingLinks)}
                                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                        {editingLinks ? 'Concluir' : 'Editar'}
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {metadata?.quick_links.map((link, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl group">
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 flex-1 hover:text-cyan-400 transition-colors"
                                            >
                                                <FolderOpen className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm text-slate-300">{link.label}</span>
                                            </a>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => window.open(link.url, '_blank')}
                                                    className="p-1.5 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </button>
                                                {editingLinks && (
                                                    <button
                                                        onClick={() => removeQuickLink(i)}
                                                        className="p-1.5 text-rose-400 hover:text-rose-300"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {editingLinks && (
                                        <div className="space-y-2 pt-2">
                                            <input
                                                type="text"
                                                value={newLink.label}
                                                onChange={(e) => setNewLink(prev => ({ ...prev, label: e.target.value }))}
                                                placeholder="Nome do link"
                                                className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                                            />
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="url"
                                                    value={newLink.url}
                                                    onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                                                    placeholder="https://..."
                                                    className="flex-1 px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                                                />
                                                <button
                                                    onClick={addQuickLink}
                                                    className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {metadata?.quick_links.length === 0 && !editingLinks && (
                                        <p className="text-xs text-slate-500 text-center py-4">
                                            Nenhum link adicionado
                                        </p>
                                    )}
                                </div>
                            </section>

                            {/* WhatsApp Group */}
                            {metadata?.whatsapp_group_url && (
                                <section className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                                        <span className="text-sm font-bold text-emerald-400">Grupo WhatsApp</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={metadata.whatsapp_group_url}
                                            readOnly
                                            className="flex-1 px-3 py-2 bg-emerald-950/30 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 font-mono truncate"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(metadata.whatsapp_group_url!)}
                                            className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
