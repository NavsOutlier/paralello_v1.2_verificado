import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Users, Calendar, Filter, Download, ArrowRight, Table, BarChart3, GripHorizontal, Pencil, CheckCircle2, LayoutDashboard,
    Settings, ShieldCheck, Link, Activity, Check, X, Copy, ExternalLink, ChevronDown
} from 'lucide-react';
import { TintimIntegrationForm } from './manager/TintimIntegrationForm';
import { TintimConfig } from '../types/marketing';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

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

export const MarketingDashboard: React.FC = () => {
    const { organizationId, isSuperAdmin, permissions } = useAuth();
    const canManageMarketing = isSuperAdmin || permissions?.can_manage_marketing;
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');

    // Scroll Drag Logic
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Filters - Default: last 7 days (not counting today)
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 8); // 8 days ago to get 7 full days before yesterday
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 1); // Yesterday
        return date.toISOString().split('T')[0];
    });
    const [granularity, setGranularity] = useState<Granularity>('day');

    // Preset Date Filter
    const [selectedPreset, setSelectedPreset] = useState('last7');
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);

    // Preset date filter options
    const datePresets = [
        {
            key: 'today', label: 'Hoje', getDates: () => {
                const today = new Date().toISOString().split('T')[0];
                return { start: today, end: today };
            }
        },
        {
            key: 'yesterday', label: 'Ontem', getDates: () => {
                const d = new Date(); d.setDate(d.getDate() - 1);
                const yesterday = d.toISOString().split('T')[0];
                return { start: yesterday, end: yesterday };
            }
        },
        {
            key: 'todayYesterday', label: 'Hoje e ontem', getDates: () => {
                const today = new Date().toISOString().split('T')[0];
                const d = new Date(); d.setDate(d.getDate() - 1);
                return { start: d.toISOString().split('T')[0], end: today };
            }
        },
        {
            key: 'last7', label: 'Últimos 7 dias', getDates: () => {
                const end = new Date(); end.setDate(end.getDate() - 1);
                const start = new Date(); start.setDate(start.getDate() - 7);
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            }
        },
        {
            key: 'last14', label: 'Últimos 14 dias', getDates: () => {
                const end = new Date(); end.setDate(end.getDate() - 1);
                const start = new Date(); start.setDate(start.getDate() - 14);
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            }
        },
        {
            key: 'last28', label: 'Últimos 28 dias', getDates: () => {
                const end = new Date(); end.setDate(end.getDate() - 1);
                const start = new Date(); start.setDate(start.getDate() - 28);
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            }
        },
        {
            key: 'last30', label: 'Últimos 30 dias', getDates: () => {
                const end = new Date(); end.setDate(end.getDate() - 1);
                const start = new Date(); start.setDate(start.getDate() - 30);
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            }
        },
        {
            key: 'thisWeek', label: 'Esta semana', getDates: () => {
                const today = new Date();
                const dayOfWeek = today.getDay();
                const start = new Date(today); start.setDate(today.getDate() - dayOfWeek);
                return { start: start.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
            }
        },
        {
            key: 'lastWeek', label: 'Semana passada', getDates: () => {
                const today = new Date();
                const dayOfWeek = today.getDay();
                const endOfLastWeek = new Date(today); endOfLastWeek.setDate(today.getDate() - dayOfWeek - 1);
                const startOfLastWeek = new Date(endOfLastWeek); startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
                return { start: startOfLastWeek.toISOString().split('T')[0], end: endOfLastWeek.toISOString().split('T')[0] };
            }
        },
        {
            key: 'thisMonth', label: 'Este mês', getDates: () => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                return { start: start.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
            }
        },
        {
            key: 'lastMonth', label: 'Mês passado', getDates: () => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
            }
        },
        {
            key: 'max', label: 'Máximo', getDates: () => {
                const start = new Date(); start.setFullYear(start.getFullYear() - 1);
                return { start: start.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] };
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

    const selectedPresetLabel = datePresets.find(p => p.key === selectedPreset)?.label || 'Selecionar período';

    // Real Data State
    const [rawData, setRawData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // New Marketing Data State (from new tables)
    const [leadsData, setLeadsData] = useState<any[]>([]);
    const [conversionsData, setConversionsData] = useState<any[]>([]);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);

    // View Mode State
    const [viewMode, setViewMode] = useState<'table' | 'dashboard'>('dashboard');

    // Tintim Integration State
    const [isTintimModalOpen, setIsTintimModalOpen] = useState(false);
    const [tintimConfig, setTintimConfig] = useState<TintimConfig>({
        customer_code: '',
        security_token: '',
        conversion_event: ''
    });

    // Load and Save Tintim Config
    useEffect(() => {
        if (isTintimModalOpen && selectedClient) {
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
    }, [isTintimModalOpen, selectedClient]);

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

    // Cell Save Handler
    const handleSaveCell = async (dateKey: string, channel: string, metric: 'leads' | 'investment' | 'conversions' | 'revenue', value: string) => {
        if (!organizationId || !selectedClient) return;

        // Parse value
        const numValue = (metric === 'investment' || metric === 'revenue')
            ? parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
            : parseInt(value.replace(/\D/g, '')) || 0;

        // Optimistic Update (Local State)
        setRawData(prev => {
            const existingIndex = prev.findIndex(r => r.report_date === dateKey && r.channel === channel);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], [metric]: numValue };
                return updated;
            } else {
                return [...prev, {
                    organization_id: organizationId,
                    client_id: selectedClient,
                    report_date: dateKey,
                    channel,
                    [metric]: numValue
                }];
            }
        });

        const { data: existing } = await supabase.from('marketing_performance')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('client_id', selectedClient)
            .eq('report_date', dateKey)
            .eq('channel', channel)
            .single();

        if (existing) {
            await supabase.from('marketing_performance').update({ [metric]: numValue }).eq('id', existing.id);
        } else {
            await supabase.from('marketing_performance').insert({
                organization_id: organizationId,
                client_id: selectedClient,
                report_date: dateKey,
                channel,
                [metric]: numValue
            });
        }
    };

    // ... (Table Data Generation remains same) ...

    // Helper Components for Editing
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
                <span className={value === 0 ? "text-slate-300" : "text-slate-700 font-semibold"}>
                    {isMoney ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : value}
                </span>
            );
        }

        return (
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={(e) => handleSaveCell(dateKey, channel, metric, e.target.value)}
                className="w-20 text-center text-xs p-1 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-indigo-50/50"
            />
        );
    };

    const DataRow = ({ label, channel, metric, getter, format = (v: any) => v, bg = '', editable = false }: any) => (
        <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${bg}`}>
            <td className="sticky left-0 bg-white z-10 py-3 px-4 font-medium text-slate-700 text-sm border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                {label}
            </td>
            {tableData.map((d) => (
                <td key={d.dateKey} className="py-3 px-4 text-center text-sm text-slate-600 whitespace-nowrap min-w-[120px]">
                    {editable && channel && metric ? (
                        <EditableCell
                            value={getter(d)}
                            dateKey={d.dateKey}
                            channel={channel}
                            metric={metric}
                            isMoney={metric === 'investment'}
                        />
                    ) : (
                        format(getter(d))
                    )}
                </td>
            ))}
        </tr>
    );

    // ... (Return JSX updates to include DataRow changes and Toggle Button) ...
    // Note: I will only replace the top logic and helper components here, then do another pass for the JSX if needed.
    // Actually, I need to update DataRow calls in the JSX to pass 'channel' and 'metric'.

    // Let's replace the whole component body logic part first.



    // Fetch Metrics from Supabase
    useEffect(() => {
        if (!organizationId || !selectedClient) return;

        const fetchData = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('marketing_performance')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('client_id', selectedClient)
                .gte('report_date', startDate)
                .lte('report_date', endDate);

            if (error) {
                console.error('Error fetching marketing metrics:', error);
            } else {
                setRawData(data || []);
            }
            setLoading(false);
        };

        fetchData();
    }, [organizationId, selectedClient, startDate, endDate]);

    // Fetch data from new tables (marketing_leads and marketing_conversions)
    useEffect(() => {
        if (!organizationId || !selectedClient) return;

        const fetchNewData = async () => {
            console.log('Fetching new data for:', { organizationId, selectedClient, startDate, endDate });

            // Fetch leads
            const { data: leads, error: leadsError } = await supabase
                .from('marketing_leads')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('client_id', selectedClient)
                .gte('created_at', startDate)
                .lte('created_at', endDate + 'T23:59:59');

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

        fetchNewData();
    }, [organizationId, selectedClient, startDate, endDate]);

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
        return periods.map(p => {
            // Filter raw data belonging to this period
            const periodRows = rawData.filter(row => {
                const rowDate = row.report_date;
                if (granularity === 'day') return rowDate === p.key;
                if (granularity === 'month') return rowDate.startsWith(p.key.slice(0, 7)); // 'YYYY-MM'
                // Week logic approximation check
                return rowDate >= p.key && (p.endKey ? rowDate <= p.endKey : true);
            });

            // Aggregate helpers
            const sumStart = { leads: 0, investment: 0, conversions: 0, revenue: 0 };
            const groupByChannel = (channel: string) => {
                const rows = periodRows.filter(r => r.channel === channel);
                return rows.reduce((acc, curr) => ({
                    leads: acc.leads + (curr.leads || 0),
                    investment: acc.investment + (curr.investment || 0),
                    conversions: acc.conversions + (curr.conversions || 0),
                    revenue: acc.revenue + (curr.revenue || 0)
                }), { ...sumStart });
            };

            const meta = groupByChannel('meta');
            const google = groupByChannel('google');
            const direct = groupByChannel('direct'); // includes 'direct' or no channel

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
    }, [periods, rawData, granularity]);

    // Dashboard View Render Logic
    const renderDashboardView = () => {
        // Calculate Totals from NEW tables (marketing_leads and marketing_conversions)
        const totalLeadsNew = leadsData.length;
        const totalConversionsNew = conversionsData.length;
        const totalRevenueNew = conversionsData.reduce((acc, c) => acc + (parseFloat(c.revenue) || 0), 0);
        const conversionRateNew = totalLeadsNew > 0 ? totalConversionsNew / totalLeadsNew : 0;

        // Calculate Totals for Cards (from old table for backwards compatibility)
        const grandTotal = tableData.reduce((acc, curr) => ({
            leads: acc.leads + curr.total.leads,
            investment: acc.investment + curr.total.investment,
            conversions: acc.conversions + curr.total.conversions,
        }), { leads: 0, investment: 0, conversions: 0 });

        const avgCpl = grandTotal.leads > 0 ? grandTotal.investment / grandTotal.leads : 0;

        return (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* New Metrics from Integration */}
                {(totalLeadsNew > 0 || totalConversionsNew > 0) && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                        <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Dados da Integração (Tempo Real)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Leads (Integração)</p>
                                <h3 className="text-2xl font-bold text-indigo-600 mt-1">{totalLeadsNew}</h3>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Vendas (Conversões)</p>
                                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{totalConversionsNew}</h3>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Receita Total</p>
                                <h3 className="text-2xl font-bold text-green-600 mt-1">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenueNew)}
                                </h3>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase">Taxa de Conversão</p>
                                <h3 className="text-2xl font-bold text-purple-600 mt-1">
                                    {new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1 }).format(conversionRateNew)}
                                </h3>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overview Cards (from manual data) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Leads (Manual)</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-2">{grandTotal.leads}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Investimento Total</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal.investment)}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Custo por Lead (Médio)</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgCpl)}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Conversões (Manual)</p>
                        <h3 className="text-3xl font-bold text-emerald-600 mt-2">{grandTotal.conversions}</h3>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-auto xl:h-[400px]">
                    {/* Line Chart: Leads over Time */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[400px] xl:h-full">
                        <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            Evolução de Leads
                        </h4>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={tableData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="meta.leads" name="Meta Ads" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="google.leads" name="Google Ads" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="direct.leads" name="Sem Rastreio" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bar Chart: Investment vs Conversions */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[400px] xl:h-full">
                        <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-emerald-500" />
                            Investimento x Conversões
                        </h4>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={tableData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" orientation="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="total.investment" name="Investimento (R$)" fill="#0f172a" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="total.conversions" name="Conversões" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatPercent = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(val);

    const SectionHeader = ({ title, color }: { title: string, color: string }) => (
        <tr className={`${color} bg-opacity-10 border-b border-slate-200`}>
            <td className={`sticky left-0 z-10 py-2 px-4 font-black text-xs uppercase tracking-wider text-slate-800 border-l-4 border-slate-800 bg-slate-50`}>
                {title}
            </td>
            {tableData.map(d => <td key={d.dateKey} className="bg-slate-50/50"></td>)}
        </tr>
    );

    return (
        <div className="flex-1 w-full h-full flex flex-col bg-slate-50">
            {/* Header Controls */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm z-20">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-indigo-600" />
                            Painel Tintim
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {viewMode === 'table' ? 'Análise comparativa horizontal' : 'Visualização gráfica de performance'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* View Mode Toggle */}
                        <div className="bg-slate-100 p-1 rounded-lg flex items-center mr-2">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Tabela"
                            >
                                <Table className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Dashboard Gráfico"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Edit Mode Toggle (Only viewable in Table mode) */}
                        {viewMode === 'table' && (
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${isEditing
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                {isEditing ? 'Concluir Edição' : 'Editar Dados'}
                            </button>
                        )}

                        <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

                        <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                            <Users className="w-4 h-4 text-slate-400 ml-2" />
                            <select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                className="bg-transparent border-none text-sm font-semibold text-slate-700 py-1.5 pl-2 pr-8 w-40 focus:ring-0 cursor-pointer"
                            >
                                {clients.length === 0 && <option value="">Cadastre um cliente</option>}
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {/* Preset Date Filter Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                                className="bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-all"
                            >
                                <Calendar className="w-4 h-4 text-slate-500" />
                                {selectedPresetLabel}
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showPresetDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showPresetDropdown && (
                                <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[200px] py-2 max-h-[400px] overflow-y-auto">
                                    {datePresets.map(preset => (
                                        <button
                                            key={preset.key}
                                            onClick={() => handlePresetChange(preset.key)}
                                            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 transition-all ${selectedPreset === preset.key ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-slate-700'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPreset === preset.key ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                                                }`}>
                                                {selectedPreset === preset.key && (
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                )}
                                            </div>
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Custom Date Range (collapsed by default) */}
                        <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-2 px-3">
                            <span className="text-xs font-bold text-slate-400 uppercase">De</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setSelectedPreset(''); }}
                                className="bg-transparent border-none text-sm font-medium text-slate-700 py-1 focus:ring-0 p-0 w-28"
                            />
                            <span className="text-xs font-bold text-slate-400 uppercase">Até</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setSelectedPreset(''); }}
                                className="bg-transparent border-none text-sm font-medium text-slate-700 py-1 focus:ring-0 p-0 w-28"
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {(['day', 'week', 'month'] as Granularity[]).map(g => (
                                <button
                                    key={g}
                                    onClick={() => setGranularity(g)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${granularity === g ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {g === 'day' ? 'Dia' : g === 'week' ? 'Semana' : 'Mês'}
                                </button>
                            ))}
                        </div>

                        {canManageMarketing && (
                            <button
                                onClick={() => setIsTintimModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-all border border-indigo-200"
                            >
                                <Link className="w-4 h-4" />
                                Integração Tintim
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {/* Horizontal Scrollbar Styles */}
            <style>{`
                .horizontal-scroll-container::-webkit-scrollbar {
                    height: 16px;
                }
                .horizontal-scroll-container::-webkit-scrollbar-track {
                    background: #e2e8f0;
                    border-radius: 0 0 12px 12px;
                }
                .horizontal-scroll-container::-webkit-scrollbar-thumb {
                    background-color: #94a3b8;
                    border-radius: 20px;
                    border: 4px solid transparent;
                    background-clip: content-box;
                }
                .horizontal-scroll-container::-webkit-scrollbar-thumb:hover {
                    background-color: #64748b;
                }
            `}</style>

            {
                viewMode === 'dashboard' ? renderDashboardView() : (
                    /* Scrollable Table Area */
                    <div className="flex-1 overflow-hidden p-4 flex flex-col relative w-full">
                        {/* Scroll Hint overlay if needed, or just the container */}
                        <div
                            ref={scrollContainerRef}
                            onMouseDown={handleMouseDown}
                            onMouseLeave={handleMouseLeave}
                            onMouseUp={handleMouseUp}
                            onMouseMove={handleMouseMove}
                            className="horizontal-scroll-container bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto w-full pb-2"
                            style={{ cursor: isEditing ? 'default' : (isDragging ? 'grabbing' : 'grab') }}
                        >
                            <table className="w-full border-collapse select-none" style={{ minWidth: '100%' }}>
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="sticky left-0 z-20 bg-slate-900 py-4 px-4 text-left font-bold text-sm min-w-[200px] border-r border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] pointer-events-none">
                                            Métrica / Período
                                        </th>
                                        {tableData.map(d => (
                                            <th key={d.dateKey} className="py-4 px-4 text-center font-bold text-sm min-w-[180px] border-l border-slate-800 pointer-events-none">
                                                {d.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* META ADS */}
                                    <SectionHeader title="Meta Ads" color="bg-blue-50" />
                                    <DataRow label="Leads Gerados" getter={d => d.meta.leads} editable channel="meta" metric="leads" />
                                    <DataRow label="Custo por Lead" getter={d => d.meta.leads > 0 ? d.meta.investment / d.meta.leads : 0} format={formatCurrency} />
                                    <DataRow label="Investimento" getter={d => d.meta.investment} format={formatCurrency} editable channel="meta" metric="investment" />
                                    <DataRow label="Conversões" getter={d => d.meta.conversions} editable channel="meta" metric="conversions" />
                                    <DataRow label="Valor de Conversões" getter={d => d.meta.revenue} format={formatCurrency} editable channel="meta" metric="revenue" />
                                    <DataRow label="Taxa de Conversão" getter={d => d.meta.leads > 0 ? d.meta.conversions / d.meta.leads : 0} format={formatPercent} />

                                    {/* GOOGLE ADS */}
                                    <SectionHeader title="Google Ads" color="bg-emerald-50" />
                                    <DataRow label="Leads Gerados" getter={d => d.google.leads} editable channel="google" metric="leads" />
                                    <DataRow label="Custo por Lead" getter={d => d.google.leads > 0 ? d.google.investment / d.google.leads : 0} format={formatCurrency} />
                                    <DataRow label="Investimento" getter={d => d.google.investment} format={formatCurrency} editable channel="google" metric="investment" />
                                    <DataRow label="Conversões" getter={d => d.google.conversions} editable channel="google" metric="conversions" />
                                    <DataRow label="Valor de Conversões" getter={d => d.google.revenue} format={formatCurrency} editable channel="google" metric="revenue" />
                                    <DataRow label="Taxa de Conversão" getter={d => d.google.leads > 0 ? d.google.conversions / d.google.leads : 0} format={formatPercent} />

                                    {/* SEM RASTREIO */}
                                    <SectionHeader title="Sem Rastreio" color="bg-purple-50" />
                                    <DataRow label="Leads Gerados" getter={d => d.direct.leads} editable channel="direct" metric="leads" />
                                    <DataRow label="Conversões" getter={d => d.direct.conversions} editable channel="direct" metric="conversions" />
                                    <DataRow label="Taxa de Conversão" getter={d => d.direct.leads > 0 ? d.direct.conversions / d.direct.leads : 0} format={formatPercent} />

                                    {/* GERAL */}
                                    <SectionHeader title="Resumo Geral" color="bg-slate-100" />
                                    <DataRow label="Total Leads" getter={d => d.total.leads} bg="bg-slate-50 font-bold" />
                                    <DataRow label="Inv. Total" getter={d => d.total.investment} format={formatCurrency} bg="bg-slate-50 font-bold" />
                                    <DataRow label="CPL Médio" getter={d => d.total.cpl} format={formatCurrency} bg="bg-slate-50" />
                                    <DataRow label="Total Conversões" getter={d => d.total.conversions} bg="bg-slate-50" />
                                    <DataRow label="Valor de Conversões" getter={d => d.total.revenue} format={formatCurrency} bg="bg-slate-50 font-bold" />
                                    <DataRow label="Taxa Global" getter={d => d.total.rate} format={formatPercent} bg="bg-slate-50" />
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
            {/* Tintim Integration Modal */}
            {
                isTintimModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Configurar Integração Tintim</h3>
                                        <p className="text-xs text-slate-500">Conecte sua conta para automatizar os dados</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsTintimModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <TintimIntegrationForm
                                    clientId={selectedClient}
                                    clientName={clients.find(c => c.id === selectedClient)?.name}
                                    config={tintimConfig}
                                    onChange={setTintimConfig}
                                />
                            </div>
                            {/* Modal Footer */}
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setIsTintimModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-all font-sans"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveTintimConfig}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Salvar Configurações
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
