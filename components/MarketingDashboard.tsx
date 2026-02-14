import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Users, Calendar, Filter, Download, ArrowRight, Table, BarChart3, GripHorizontal, Pencil, CheckCircle2, LayoutDashboard,
    Settings, ShieldCheck, Link, Activity, Check, X, Copy, ExternalLink, ChevronDown, Sparkles, Plus, Target
} from 'lucide-react';
import { TintimIntegrationForm } from './manager/TintimIntegrationForm';
import { ManualLeadModal } from './ManualLeadModal';
import { ManualConversionModal } from './ManualConversionModal';
import { TintimConfig } from '../types/marketing';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import { CampaignExplorer } from './marketing/CampaignExplorer';

interface Client {
    id: string;
    name: string;
}

type Granularity = 'day' | 'week' | 'month';

// Mock Data Structure
interface PeriodData {
    label: string;
    dateKey: string;
    meta: { leads: number; investment: number; conversions: number; revenue: number };
    google: { leads: number; investment: number; conversions: number; revenue: number };
    direct: { leads: number; investment: number; conversions: number; revenue: number };
    total: { leads: number; investment: number; conversions: number; revenue: number; cpl: number; rate: number };
}

// Helper to get local date string YYYY-MM-DD
const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const MarketingDashboard: React.FC = () => {
    const { organizationId, isSuperAdmin, permissions, user } = useAuth();
    const canManageMarketing = isSuperAdmin || permissions?.can_manage_marketing;
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');

    // Scroll Drag Logic
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Filters - Default: last 7 days (including today)
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 6); // 6 days ago + today = 7 days
        return toLocalDateString(date);
    });
    const [endDate, setEndDate] = useState(() => {
        return toLocalDateString(new Date()); // Today
    });
    const [granularity, setGranularity] = useState<Granularity>('day');

    // Preset Date Filter
    // Preset Date Filter
    const [selectedPreset, setSelectedPreset] = useState('last7');
    const [viewMode, setViewMode] = useState<'geral' | 'campaigns'>('geral');
    const [geralSubView, setGeralSubView] = useState<'dashboard' | 'table'>('dashboard');
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isManualLeadModalOpen, setIsManualLeadModalOpen] = useState(false);
    const [isManualConversionModalOpen, setIsManualConversionModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);



    // Preset date filter options
    const datePresets = [
        {
            key: 'today', label: 'Hoje', getDates: () => {
                const today = toLocalDateString(new Date());
                return { start: today, end: today };
            }
        },
        {
            key: 'yesterday', label: 'Ontem', getDates: () => {
                const d = new Date(); d.setDate(d.getDate() - 1);
                const yesterday = toLocalDateString(d);
                return { start: yesterday, end: yesterday };
            }
        },
        {
            key: 'todayYesterday', label: 'Hoje e ontem', getDates: () => {
                const today = toLocalDateString(new Date());
                const d = new Date(); d.setDate(d.getDate() - 1);
                return { start: toLocalDateString(d), end: today };
            }
        },
        {
            key: 'last7', label: 'Últimos 7 dias', getDates: () => {
                const end = new Date();
                const start = new Date(); start.setDate(start.getDate() - 6);
                return { start: toLocalDateString(start), end: toLocalDateString(end) };
            }
        },
        {
            key: 'last14', label: 'Últimos 14 dias', getDates: () => {
                const end = new Date();
                const start = new Date(); start.setDate(start.getDate() - 13);
                return { start: toLocalDateString(start), end: toLocalDateString(end) };
            }
        },
        {
            key: 'last28', label: 'Últimos 28 dias', getDates: () => {
                const end = new Date();
                const start = new Date(); start.setDate(start.getDate() - 27);
                return { start: toLocalDateString(start), end: toLocalDateString(end) };
            }
        },
        {
            key: 'last30', label: 'Últimos 30 dias', getDates: () => {
                const end = new Date();
                const start = new Date(); start.setDate(start.getDate() - 29);
                return { start: toLocalDateString(start), end: toLocalDateString(end) };
            }
        },
        {
            key: 'thisWeek', label: 'Esta semana', getDates: () => {
                const today = new Date();
                const dayOfWeek = today.getDay();
                const start = new Date(today); start.setDate(today.getDate() - dayOfWeek);
                return { start: toLocalDateString(start), end: toLocalDateString(today) };
            }
        },
        {
            key: 'lastWeek', label: 'Semana passada', getDates: () => {
                const today = new Date();
                const dayOfWeek = today.getDay();
                const endOfLastWeek = new Date(today); endOfLastWeek.setDate(today.getDate() - dayOfWeek - 1);
                const startOfLastWeek = new Date(endOfLastWeek); startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
                return { start: toLocalDateString(startOfLastWeek), end: toLocalDateString(endOfLastWeek) };
            }
        },
        {
            key: 'thisMonth', label: 'Este mês', getDates: () => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                return { start: toLocalDateString(start), end: toLocalDateString(today) };
            }
        },
        {
            key: 'lastMonth', label: 'Mês passado', getDates: () => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                return { start: toLocalDateString(start), end: toLocalDateString(end) };
            }
        },
        {
            key: 'max', label: 'Máximo', getDates: () => {
                const start = new Date(); start.setFullYear(start.getFullYear() - 1);
                return { start: toLocalDateString(start), end: toLocalDateString(new Date()) };
            }
        },
    ];

    const handlePresetChange = (presetKey: string) => {
        const preset = datePresets.find(p => p.key === presetKey);
        if (preset) {
            const { start, end } = preset.getDates();
            setStartDate(start);
            setEndDate(end);
            setSelectedPreset(presetKey);
            setShowPresetDropdown(false);
        }
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const selectedPresetLabel = useMemo(() => {
        const preset = datePresets.find(p => p.key === selectedPreset);
        // Special case for 'today' or 'yesterday' to avoid redundancy if label already implies it? 
        // User asked: "when date is a single day let it appear only it". 
        // Example: "Hoje: 18 de jan." or just "18 de jan."? User said "deixe aparecer somente ele".
        // If it's a preset like "Hoje", maybe separate logic? 
        // Default behavior: "Label: Date".

        const label = preset?.label || 'Personalizado';
        if (!startDate || !endDate) return label;

        const startStr = formatDateDisplay(startDate);
        const endStr = formatDateDisplay(endDate);

        if (startDate === endDate) {
            return `${label}: ${startStr}`;
        }
        return `${label}: ${startStr} a ${endStr}`;
    }, [selectedPreset, startDate, endDate]);

    // Real Data State
    const [rawData, setRawData] = useState<any[]>([]);
    // const [loading, setLoading] = useState(false); // Removed separate loading state to fix potential conflicts, relying on effect

    // New Marketing Data State (from new tables)
    const [leadsData, setLeadsData] = useState<any[]>([]);
    const [conversionsData, setConversionsData] = useState<any[]>([]);
    const [manualData, setManualData] = useState<any[]>([]);

    // Tintim Integration State
    const [isTintimModalOpen, setIsTintimModalOpen] = useState(false);
    const [tintimConfig, setTintimConfig] = useState<TintimConfig>({
        customer_code: '',
        security_token: '',
        conversion_event: ''
    });

    // Integration Check (Must be after state declaration)
    const isIntegrated = !!tintimConfig.customer_code;

    // Load and Save Tintim Config
    useEffect(() => {
        if (selectedClient) {
            const loadConfig = async () => {
                const { data, error } = await supabase
                    .from('client_integrations')
                    .select('*')
                    .eq('client_id', selectedClient)
                    .eq('provider', 'tintim')
                    .maybeSingle();

                if (data) {
                    setTintimConfig({
                        customer_code: data.customer_code || '',
                        security_token: data.security_token || '',
                        conversion_event: data.conversion_event || '',
                        conversion_event_id: data.conversion_event_id || undefined
                    });
                } else {
                    setTintimConfig({
                        customer_code: '',
                        security_token: '',
                        conversion_event: '',
                        conversion_event_id: undefined
                    });
                }
            };
            loadConfig();
        }
    }, [selectedClient]);

    const handleSaveTintimConfig = async () => {
        if (!selectedClient || !organizationId) return;

        const integrationData = {
            organization_id: organizationId,
            client_id: selectedClient,
            provider: 'tintim',
            customer_code: tintimConfig.customer_code || null,
            security_token: tintimConfig.security_token || null,
            conversion_event: tintimConfig.conversion_event || null,
            conversion_event_id: tintimConfig.conversion_event_id || null,
            is_active: true,
            updated_at: new Date().toISOString()
        };

        await supabase
            .from('client_integrations')
            .upsert(integrationData, {
                onConflict: 'client_id,provider',
                ignoreDuplicates: false
            });

        setIsTintimModalOpen(false);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing || !scrollContainerRef.current) return; // Disable drag when editing to allow text selection
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => { setIsDragging(false); };
    const handleMouseUp = () => { setIsDragging(false); };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isEditing || !isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    // Load Clients
    useEffect(() => {
        if (organizationId) {
            const fetchClients = async () => {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name')
                    .eq('organization_id', organizationId)
                    .order('name');

                if (error) {
                    console.error('Error fetching clients:', error);
                } else if (data) {
                    setClients(data);
                    if (data.length > 0 && !selectedClient) {
                        setSelectedClient(data[0].id);
                    }
                }
            };
            fetchClients();
        }
    }, [organizationId]);

    // Cell Save Handler [RESTORED]
    const handleSaveCell = async (dateKey: string, channel: string, metric: 'leads' | 'investment' | 'conversions' | 'revenue' | 'impressions' | 'clicks', value: string) => {
        if (!organizationId || !selectedClient) return;

        // Convert string formatted value back to number
        const numValue = parseFloat(value.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0;

        try {
            const { error } = await supabase
                .from('marketing_daily_performance')
                .upsert({
                    organization_id: organizationId,
                    client_id: selectedClient,
                    date: dateKey,
                    channel: channel,
                    [metric]: numValue,
                    created_by: user?.id
                }, {
                    onConflict: 'client_id,date,channel'
                });

            if (error) throw error;

            // Trigger refresh
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error saving manual data:', error);
            alert('Erro ao salvar dados manuais.');
        }
    };

    // Fetch data from new tables (marketing_leads and marketing_conversions)
    useEffect(() => {
        if (!organizationId || !selectedClient) return;

        const fetchNewData = async () => {
            console.log('Fetching new data for:', { organizationId, selectedClient, startDate, endDate });

            // Fetch leads - filter by first_interaction_at (actual lead date)
            const { data: leads, error: leadsError } = await supabase
                .from('marketing_leads')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('client_id', selectedClient)
                .gte('first_interaction_at', startDate)
                .lte('first_interaction_at', endDate + 'T23:59:59');

            console.log('Leads result:', { leads, leadsError });

            if (leadsError) {
                console.error('Error fetching leads:', leadsError);
            } else {
                setLeadsData(leads || []);
            }

            // Fetch conversions
            const { data: conversions, error: conversionsError } = await supabase
                .from('marketing_conversions')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('client_id', selectedClient)
                .gte('converted_at', startDate)
                .lte('converted_at', endDate + 'T23:59:59');

            console.log('Conversions result:', { conversions, conversionsError });

            if (conversionsError) {
                console.error('Error fetching conversions:', conversionsError);
            } else {
                setConversionsData(conversions || []);
            }
        };

        const fetchManual = async () => {
            const { data, error } = await supabase
                .from('marketing_daily_performance')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('client_id', selectedClient)
                .gte('date', startDate)
                .lte('date', endDate);

            if (error) {
                console.error('Error fetching manual data:', error);
            } else {
                setManualData(data || []);
            }
        };

        fetchNewData();
        fetchManual();
    }, [organizationId, selectedClient, startDate, endDate, refreshTrigger]);

    // Generate Period Columns based on Range & Granularity
    const periods = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const result: { label: string, key: string, endKey?: string }[] = [];

        let current = new Date(start);
        let loops = 0;

        // Helper to format date key YYYY-MM-DD
        const getKey = (d: Date) => d.toISOString().split('T')[0];

        while (current <= end && loops < 100) {
            let label = '';
            let key = getKey(current);
            let nextDate = new Date(current);

            if (granularity === 'day') {
                label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                nextDate.setDate(current.getDate() + 1);
            } else if (granularity === 'week') {
                const weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 6);
                label = `${current.getDate()}/${current.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
                nextDate.setDate(current.getDate() + 7);
            } else { // Month
                label = current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                nextDate.setMonth(current.getMonth() + 1);
                nextDate.setDate(1);
            }

            // For aggregation filtering
            result.push({
                label,
                key,
                endKey: getKey(new Date(nextDate.getTime() - 1)) // End of this period (e.g. end of week)
            });

            current = nextDate;
            loops++;
        }
        return result;
    }, [startDate, endDate, granularity]);

    // Process Data into Table Format (Pivot)
    const tableData = useMemo(() => {
        // 1. Process Real-time Leads into aggregations
        const realTimeLeads = leadsData.map(l => {
            const date = l.first_interaction_at.split('T')[0];
            let channel = 'direct';
            if (l.source?.toLowerCase().includes('meta') || l.source?.toLowerCase().includes('facebook') || l.source?.toLowerCase().includes('instagram')) channel = 'meta';
            else if (l.source?.toLowerCase().includes('google')) channel = 'google';

            return { date, channel, type: 'lead', phone: l.phone };
        });

        // 2. Process Real-time Conversions into aggregations
        // Try to match conversion to a lead to get source
        const realTimeConversions = conversionsData.map(c => {
            const date = c.converted_at.split('T')[0];
            const revenue = parseFloat(c.revenue) || 0;
            // Find specific lead source if possible (naive matching by phone)
            const matchedLead = leadsData.find(l => l.phone === c.phone); // This searches across all fetched leads
            let channel = 'direct';
            if (matchedLead) {
                if (matchedLead.source?.toLowerCase().includes('meta') || matchedLead.source?.toLowerCase().includes('facebook') || matchedLead.source?.toLowerCase().includes('instagram')) channel = 'meta';
                else if (matchedLead.source?.toLowerCase().includes('google')) channel = 'google';
            }

            return { date, channel, revenue, type: 'conversion' };
        });

        // 3. Merge Real-time data with Manual Raw Data
        // We create a combined list of "data points" to aggregate
        // Manual data has { report_date, channel, leads, conversions, revenue, investment }

        return periods.map(p => {
            // A. Filter Manual Rows
            // A. Filter Manual Rows
            const manualRows = manualData.filter(r => {
                const rowDate = r.date;
                if (granularity === 'day') return rowDate === p.key;
                if (granularity === 'month') return rowDate.startsWith(p.key.slice(0, 7));
                return rowDate >= p.key && (p.endKey ? rowDate <= p.endKey : true);
            });


            // B. Filter Real-time Data
            const periodLeads = realTimeLeads.filter(l => {
                const rowDate = l.date;
                if (granularity === 'day') return rowDate === p.key;
                if (granularity === 'month') return rowDate.startsWith(p.key.slice(0, 7));
                return rowDate >= p.key && (p.endKey ? rowDate <= p.endKey : true);
            });

            const periodConversions = realTimeConversions.filter(c => {
                const rowDate = c.date;
                if (granularity === 'day') return rowDate === p.key;
                if (granularity === 'month') return rowDate.startsWith(p.key.slice(0, 7));
                return rowDate >= p.key && (p.endKey ? rowDate <= p.endKey : true);
            });

            // Aggregate helpers
            const sumStart = { leads: 0, investment: 0, conversions: 0, revenue: 0 };
            const groupByChannel = (channel: string) => {
                // Manual Aggregate
                const manual = manualRows.filter(r => r.channel === channel).reduce((acc, curr) => ({
                    leads: acc.leads + (curr.leads || 0),
                    investment: acc.investment + (curr.investment || 0),
                    conversions: acc.conversions + (curr.conversions || 0),
                    revenue: acc.revenue + (curr.revenue || 0)
                }), { ...sumStart });

                // Real-time Aggregate
                const rtLeadsCount = periodLeads.filter(l => l.channel === channel).length;
                const rtConversions = periodConversions.filter(c => c.channel === channel);
                const rtConversionsCount = rtConversions.length;
                const rtRevenue = rtConversions.reduce((acc, c) => acc + c.revenue, 0);

                // Combine (Integration ADDs to manual, usually you use one or other, but summing ensures no data loss if hybrid)
                return {
                    leads: manual.leads + rtLeadsCount,
                    investment: manual.investment, // Investment currently only manual
                    conversions: manual.conversions + rtConversionsCount,
                    revenue: manual.revenue + rtRevenue
                };
            };

            const meta = groupByChannel('meta');
            const google = groupByChannel('google');
            const direct = groupByChannel('direct');

            const totalLeads = meta.leads + google.leads + direct.leads;
            const totalInvest = meta.investment + google.investment + direct.investment;
            const totalConv = meta.conversions + google.conversions + direct.conversions;
            const totalRevenue = meta.revenue + google.revenue + direct.revenue;

            return {
                label: p.label,
                dateKey: p.key,
                meta,
                google,
                direct,
                total: {
                    leads: totalLeads,
                    investment: totalInvest,
                    conversions: totalConv,
                    revenue: totalRevenue,
                    cpl: totalLeads > 0 ? totalInvest / totalLeads : 0,
                    rate: totalLeads > 0 ? totalConv / totalLeads : 0
                }
            } as PeriodData;
        });
    }, [periods, rawData, leadsData, conversionsData, granularity]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatPercent = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(val);

    // Dashboard View Render Logic
    const renderDashboardView = () => {
        const totalLeadsNew = leadsData.length;
        const totalConversionsNew = conversionsData.length;
        const totalRevenueNew = conversionsData.reduce((acc, c) => acc + (parseFloat(c.revenue) || 0), 0);
        const conversionRateNew = totalLeadsNew > 0 ? totalConversionsNew / totalLeadsNew : 0;

        const grandTotal = tableData.reduce((acc, curr) => ({
            leads: acc.leads + curr.total.leads,
            investment: acc.investment + curr.total.investment,
            conversions: acc.conversions + curr.total.conversions,
        }), { leads: 0, investment: 0, conversions: 0 });

        const avgCpl = grandTotal.leads > 0 ? grandTotal.investment / grandTotal.leads : 0;

        return (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 custom-scrollbar">
                {/* Real-time Integration Panel */}
                {(totalLeadsNew > 0 || totalConversionsNew > 0) && (
                    <div className="relative group overflow-hidden bg-slate-900/40 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-3xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

                        <h4 className="relative z-10 text-[10px] md:text-xs font-black text-cyan-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                            <Activity className="w-5 h-5 animate-pulse" />
                            Dados da Integração em Tempo Real
                        </h4>

                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {[
                                { label: 'Leads (n8n)', val: totalLeadsNew, color: 'text-indigo-400', icon: Users },
                                { label: 'Vendas (CRM)', val: totalConversionsNew, color: 'text-emerald-400', icon: Activity },
                                { label: 'Receita Total', val: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenueNew), color: 'text-cyan-400', icon: ExternalLink },
                                { label: 'Taxa de Conversão', val: new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1 }).format(conversionRateNew), color: 'text-violet-400', icon: Sparkles }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl hover:bg-white/[0.06] transition-all group/stat">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                                        {stat.label}
                                        <stat.icon className="w-3 h-3 opacity-30" />
                                    </p>
                                    <h3 className={`text-xl md:text-2xl font-black ${stat.color} group-hover/stat:scale-105 transition-transform origin-left`}>{stat.val}</h3>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Manual Totals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                        { label: 'Leads Totais', val: grandTotal.leads, sub: 'Manual + n8n', color: 'text-white' },
                        { label: 'Investimento', val: formatCurrency(grandTotal.investment), sub: 'Meta/Google', color: 'text-white' },
                        { label: 'CPL Médio', val: formatCurrency(avgCpl), sub: 'Custo por Lead', color: 'text-cyan-400' },
                        { label: 'Conversões', val: grandTotal.conversions, sub: 'Vendas Fechadas', color: 'text-emerald-400' }
                    ].map((stat, i) => (
                        <div key={i} className="relative bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl group hover:border-white/20 transition-all">
                            <div className="absolute top-4 right-4 text-[9px] font-black text-slate-600 uppercase tracking-widest bg-slate-950/30 px-2 py-1 rounded-full">{stat.sub}</div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
                            <h3 className={`text-2xl md:text-3xl font-black ${stat.color}`}>{stat.val}</h3>
                        </div>
                    ))}
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-auto xl:h-[400px]">
                    {/* Line Chart: Leads over Time */}
                    <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col h-[400px] xl:h-full">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            Evolução de Leads
                        </h4>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={tableData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)', color: '#fff' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                    <Line type="monotone" dataKey="meta.leads" name="Meta Ads" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    <Line type="monotone" dataKey="google.leads" name="Google Ads" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#10b981' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    <Line type="monotone" dataKey="direct.leads" name="Sem Rastreio" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: '#a855f7' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bar Chart: Investment vs Conversions */}
                    <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col h-[400px] xl:h-full">
                        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-emerald-500" />
                            Investimento x Conversões
                        </h4>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={tableData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                                    <YAxis yAxisId="left" orientation="left" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)', color: '#fff' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                    <Bar yAxisId="left" dataKey="total.investment" name="Investimento (R$)" fill="#334155" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="total.conversions" name="Conversões" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Helper Components for Table View
    const EditableCell = ({
        value,
        dateKey,
        channel,
        metric,
        isMoney = false
    }: { value: number, dateKey: string, channel: string, metric: 'leads' | 'investment' | 'conversions' | 'revenue', isMoney?: boolean }) => {
        const [localValue, setLocalValue] = useState(isMoney ? value.toFixed(2).replace('.', ',') : value.toString());

        useEffect(() => {
            setLocalValue(isMoney ? value.toFixed(2).replace('.', ',') : value.toString());
        }, [value, isMoney]);

        if (!isEditing) {
            return (
                <span className={value === 0 ? "text-slate-600" : "text-slate-200 font-bold"}>
                    {isMoney ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : value}
                </span>
            );
        }

        const isLocked = isIntegrated && metric !== 'investment';

        if (isLocked) {
            return (
                <span className="text-slate-600 italic text-xs flex items-center justify-center gap-1 opacity-60" title="Gerenciado pela Integração">
                    {isMoney ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : value}
                    <ShieldCheck className="w-3 h-3 text-cyan-500 opacity-50" />
                </span>
            );
        }

        return (
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={(e) => handleSaveCell(dateKey, channel, metric, e.target.value)}
                className="w-24 text-center text-xs p-2 bg-slate-950/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:outline-none text-white font-bold placeholder:text-slate-700 transition-all font-mono"
            />
        );
    };

    const DataRow = ({ label, channel, metric, getter, format = (v: any) => v, bg = '', editable = false }: any) => (
        <tr className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${bg}`}>
            <td className="sticky left-0 bg-[#0b101b] z-10 py-4 px-6 font-black text-slate-500 text-[10px] uppercase tracking-[0.2em] border-r border-white/5 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                {label}
            </td>
            {tableData.map((d) => (
                <td key={d.dateKey} className="py-4 px-6 text-center text-xs font-medium text-slate-400 whitespace-nowrap min-w-[140px]">
                    {editable && channel && metric ? (
                        <EditableCell
                            value={getter(d)}
                            dateKey={d.dateKey}
                            channel={channel}
                            metric={metric}
                            isMoney={metric === 'investment'}
                        />
                    ) : (
                        <span className="font-bold text-slate-300">{format(getter(d))}</span>
                    )}
                </td>
            ))}
        </tr>
    );

    const SectionHeader = ({ title, color }: { title: string, color: string }) => (
        <tr className={`bg-white/[0.01] border-b border-white/5`}>
            <td className={`sticky left-0 z-10 py-3 px-4 font-black text-[10px] uppercase tracking-[0.3em] text-cyan-500/80 border-l-[3px] border-cyan-500/50 bg-[#0b101b] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]`}>
                {title}
            </td>
            {tableData.map(d => <td key={d.dateKey} className=""></td>)}
        </tr>
    );

    return (
        <div className="flex-1 w-full h-full flex flex-col bg-[#0d121f] rounded-tl-[2.5rem] overflow-hidden relative border-t border-l border-white/5">
            {/* Header Controls */}
            <div className="bg-slate-900/40 backdrop-blur-xl border-b border-white/5 px-6 md:px-8 py-5 z-20 sticky top-0">
                <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
                    {/* 1. Title & View Mode */}
                    <div className="flex items-center gap-6 w-full xl:w-auto justify-between xl:justify-start">
                        <div>
                            <h1 className="text-2xl font-black text-white flex items-center gap-3">
                                <span className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <BarChart3 className="w-6 h-6 text-indigo-400" />
                                </span>
                                <div className="flex flex-col justify-center">
                                    <h1 className="text-2xl font-black text-white leading-none">MetricFlow</h1>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-0.5 mt-1">Performance Analytics</p>
                                </div>
                            </h1>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="bg-slate-950/50 p-1.5 rounded-xl border border-white/5 flex items-center">
                            <button
                                onClick={() => setViewMode('geral')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'geral'
                                    ? 'bg-slate-800 text-white shadow-lg border border-white/10'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                Geral
                            </button>
                            <button
                                onClick={() => setViewMode('campaigns')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'campaigns'
                                    ? 'bg-slate-800 text-white shadow-lg border border-white/10'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <Target className="w-3.5 h-3.5" />
                                Campanhas
                            </button>
                        </div>
                    </div>

                    {/* 2. Controls & Filters */}
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">

                        {/* Client & Date Group */}
                        <div className="flex items-center gap-1 bg-slate-950/30 p-1.5 rounded-xl border border-white/5">
                            <div className="relative">
                                <button
                                    onClick={() => setShowClientDropdown(!showClientDropdown)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors text-xs text-indigo-300 font-bold uppercase tracking-wider shadow-sm"
                                >
                                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-left truncate max-w-[150px]">
                                        {clients.find(c => c.id === selectedClient)?.name || (clients.length === 0 ? 'Cadastre um cliente' : 'Selecione um cliente')}
                                    </span>
                                    <ChevronDown className="w-3 h-3 opacity-70" />
                                </button>

                                {showClientDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowClientDropdown(false)} />
                                        <div className="absolute top-full left-0 mt-2 w-64 bg-[#0b101b] rounded-xl shadow-2xl border border-white/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            {clients.length === 0 ? (
                                                <div className="px-4 py-2 text-xs text-slate-500 italic">Nenhum cliente cadastrado</div>
                                            ) : (
                                                clients.map(client => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => {
                                                            setSelectedClient(client.id);
                                                            setShowClientDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors ${selectedClient === client.id ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'}`}
                                                    >
                                                        {client.name}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="w-px h-4 bg-white/10" />

                            <div className="relative">
                                <button
                                    onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-xs text-slate-400 font-bold uppercase tracking-wider"
                                >
                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{selectedPresetLabel}</span>
                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                </button>

                                {showPresetDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowPresetDropdown(false)} />
                                        <div className="absolute top-full right-0 mt-2 w-72 bg-[#0b101b] rounded-xl shadow-2xl border border-white/10 py-2 z-50 grid grid-cols-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            {datePresets.map(preset => (
                                                <button
                                                    key={preset.key}
                                                    onClick={() => handlePresetChange(preset.key)}
                                                    className={`text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors ${selectedPreset === preset.key ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400'}`}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                            <div className="border-t border-white/10 mt-2 pt-3 px-4 pb-3 bg-slate-950/30">
                                                <p className="text-[9px] uppercase font-black text-slate-500 mb-2">Personalizado</p>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => { setStartDate(e.target.value); setSelectedPreset(''); }}
                                                        className="w-full text-xs bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500/50"
                                                    />
                                                    <input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => { setEndDate(e.target.value); setSelectedPreset(''); }}
                                                        className="w-full text-xs bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500/50"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Granularity (Dashboard Only) */}
                        {viewMode === 'dashboard' && (
                            <div className="flex bg-slate-950/30 p-1.5 rounded-xl border border-white/5">
                                {(['day', 'week', 'month'] as Granularity[]).map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setGranularity(g)}
                                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${granularity === g ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {g === 'day' ? 'Dia' : g === 'week' ? 'Sem' : 'Mês'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Data Actions (Table Only) */}
                        {viewMode === 'table' && (
                            <>
                                {/* Table Granularity Filter */}
                                <div className="flex bg-[#0f1623] p-1 rounded-lg border border-white/5 mr-2">
                                    {(['day', 'week', 'month'] as Granularity[]).map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setGranularity(g)}
                                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${granularity === g
                                                ? 'bg-slate-700 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            {g === 'day' ? 'Dia' : g === 'week' ? 'Sem' : 'Mês'}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                                    {isIntegrated && (
                                        <>
                                            <button
                                                onClick={() => setIsManualLeadModalOpen(true)}
                                                className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
                                                title="Novo Lead Manual"
                                            >
                                                <Users className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setIsManualConversionModalOpen(true)}
                                                className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                                                title="Nova Venda Manual"
                                            >
                                                <Activity className="w-4 h-4" />
                                            </button>
                                            <div className="w-px h-6 bg-white/10 mx-1" />
                                        </>
                                    )}
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isEditing
                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                            : 'bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700'
                                            }`}
                                    >
                                        {isEditing ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                                        {isEditing ? 'FINALIZADO' : 'EDITAR DADOS'}
                                    </button>
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => setIsTintimModalOpen(true)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${isIntegrated
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-slate-800 text-slate-500 border-white/5 hover:text-slate-300'
                                }`}
                        >
                            <Link className="w-3.5 h-3.5" />
                            {isIntegrated ? 'INTEGRADO' : 'CRM CONNECT'}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .horizontal-scroll-container::-webkit-scrollbar {
                    height: 10px;
                }
                .horizontal-scroll-container::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.2);
                    border-radius: 0 0 20px 20px;
                }
                .horizontal-scroll-container::-webkit-scrollbar-thumb {
                    background-color: rgba(255,255,255,0.1);
                    border-radius: 20px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .horizontal-scroll-container::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(255,255,255,0.2);
                }
            `}</style>

            {
                viewMode === 'campaigns' ? (
                    <CampaignExplorer
                        organizationId={organizationId}
                        clientId={selectedClient}
                        startDate={startDate}
                        endDate={endDate}
                    />
                ) : (
                    /* ========= GERAL VIEW ========= */
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Sub-view toggle: Dash / Tabela */}
                        <div className="flex items-center justify-between px-6 md:px-8 py-3 bg-white/[0.01] border-b border-white/5">
                            <div />
                            <div className="bg-slate-950/50 p-1 rounded-lg border border-white/5 flex items-center">
                                <button
                                    onClick={() => setGeralSubView('dashboard')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${geralSubView === 'dashboard'
                                        ? 'bg-slate-700 text-white shadow-sm border border-white/10'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <LayoutDashboard className="w-3 h-3" />
                                    Dash
                                </button>
                                <button
                                    onClick={() => setGeralSubView('table')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${geralSubView === 'table'
                                        ? 'bg-slate-700 text-white shadow-sm border border-white/10'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <Table className="w-3 h-3" />
                                    Tabela
                                </button>
                            </div>
                        </div>

                        {geralSubView === 'dashboard' ? renderDashboardView() : (
                            /* Scrollable Table Area */
                            <div className="flex-1 overflow-hidden p-8 flex flex-col relative w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div
                                    ref={scrollContainerRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseLeave={handleMouseLeave}
                                    onMouseUp={handleMouseUp}
                                    onMouseMove={handleMouseMove}
                                    className="horizontal-scroll-container bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-x-auto w-full pb-0 shadow-2xl relative"
                                    style={{ cursor: isEditing ? 'default' : (isDragging ? 'grabbing' : 'grab') }}
                                >
                                    <table className="w-full border-collapse select-none" style={{ minWidth: '100%' }}>
                                        <thead>
                                            <tr className="bg-[#0b101b] border-b border-white/5">
                                                <th className="sticky left-0 z-20 bg-[#0b101b] py-6 px-6 text-left font-black text-[10px] uppercase tracking-[0.3em] text-cyan-500/80 min-w-[200px] border-r border-white/5 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)] pointer-events-none">
                                                    Métrica / Período
                                                </th>
                                                {tableData.map(d => (
                                                    <th key={d.dateKey} className="py-6 px-6 text-center font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] min-w-[160px] border-l border-white/5 pointer-events-none">
                                                        {d.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* META ADS */}
                                            <SectionHeader title="Meta Ads" color="border-l-blue-500" />
                                            <DataRow label="Leads Gerados" getter={d => d.meta.leads} editable channel="meta" metric="leads" />
                                            <DataRow label="Custo por Lead" getter={d => d.meta.leads > 0 ? d.meta.investment / d.meta.leads : 0} format={formatCurrency} />
                                            <DataRow label="Investimento" getter={d => d.meta.investment} format={formatCurrency} editable channel="meta" metric="investment" />
                                            <DataRow label="Conversões" getter={d => d.meta.conversions} editable channel="meta" metric="conversions" />
                                            <DataRow label="Valor de Conversões" getter={d => d.meta.revenue} format={formatCurrency} editable channel="meta" metric="revenue" />
                                            <DataRow label="Taxa de Conversão" getter={d => d.meta.leads > 0 ? d.meta.conversions / d.meta.leads : 0} format={formatPercent} />

                                            {/* GOOGLE ADS */}
                                            <SectionHeader title="Google Ads" color="border-l-emerald-500" />
                                            <DataRow label="Leads Gerados" getter={d => d.google.leads} editable channel="google" metric="leads" />
                                            <DataRow label="Custo por Lead" getter={d => d.google.leads > 0 ? d.google.investment / d.google.leads : 0} format={formatCurrency} />
                                            <DataRow label="Investimento" getter={d => d.google.investment} format={formatCurrency} editable channel="google" metric="investment" />
                                            <DataRow label="Conversões" getter={d => d.google.conversions} editable channel="google" metric="conversions" />
                                            <DataRow label="Valor de Conversões" getter={d => d.google.revenue} format={formatCurrency} editable channel="google" metric="revenue" />
                                            <DataRow label="Taxa de Conversão" getter={d => d.google.leads > 0 ? d.google.conversions / d.google.leads : 0} format={formatPercent} />

                                            {/* SEM RASTREIO */}
                                            <SectionHeader title="Sem Rastreio" color="border-l-purple-500" />
                                            <DataRow label="Leads Gerados" getter={d => d.direct.leads} editable channel="direct" metric="leads" />
                                            <DataRow label="Conversões" getter={d => d.direct.conversions} editable channel="direct" metric="conversions" />
                                            <DataRow label="Taxa de Conversão" getter={d => d.direct.leads > 0 ? d.direct.conversions / d.direct.leads : 0} format={formatPercent} />

                                            {/* GERAL */}
                                            <SectionHeader title="Resumo Geral" color="border-l-slate-200" />
                                            <DataRow label="Total Leads" getter={d => d.total.leads} bg="bg-white/[0.03] font-bold" />
                                            <DataRow label="Inv. Total" getter={d => d.total.investment} format={formatCurrency} bg="bg-white/[0.03] font-bold" />
                                            <DataRow label="CPL Médio" getter={d => d.total.cpl} format={formatCurrency} bg="bg-white/[0.01]" />
                                            <DataRow label="Total Conversões" getter={d => d.total.conversions} bg="bg-white/[0.01]" />
                                            <DataRow label="Valor de Conversões" getter={d => d.total.revenue} format={formatCurrency} bg="bg-white/[0.03] font-bold" />
                                            <DataRow label="Taxa Global" getter={d => d.total.rate} format={formatPercent} bg="bg-white/[0.01]" />
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            {/* Manual Lead Modal */}
            <ManualLeadModal
                isOpen={isManualLeadModalOpen}
                onClose={() => setIsManualLeadModalOpen(false)}
                organizationId={organizationId || ''}
                clientId={selectedClient}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
            />

            {/* Manual Conversion Modal */}
            <ManualConversionModal
                isOpen={isManualConversionModalOpen}
                onClose={() => setIsManualConversionModalOpen(false)}
                organizationId={organizationId || ''}
                clientId={selectedClient}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
            />

            {/* Tintim Integration Modal */}
            {isTintimModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#0d121f] rounded-[2.5rem] shadow-3xl w-full max-w-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
                                    <Settings className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">Arquitetura de Conexão</h3>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sincronização com ecossistema Tintim</p>
                                </div>
                            </div>
                            <button onClick={() => setIsTintimModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-500 hover:text-white" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <TintimIntegrationForm
                                clientId={selectedClient}
                                clientName={clients.find(c => c.id === selectedClient)?.name}
                                config={tintimConfig}
                                onChange={setTintimConfig}
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-6 bg-white/[0.01] border-t border-white/5 flex items-center justify-end gap-4">
                            <button
                                onClick={() => setIsTintimModalOpen(false)}
                                className="px-6 py-3 text-xs font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSaveTintimConfig}
                                className="px-8 py-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl text-xs font-black hover:scale-105 shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-2 uppercase tracking-widest"
                            >
                                <Check className="w-4 h-4" />
                                CONSOLIDAR CONFIGURAÇÃO
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
