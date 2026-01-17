import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Users, Calendar, Filter, Download, ArrowRight, Table, BarChart3, GripHorizontal, Pencil, CheckCircle2, LayoutDashboard
} from 'lucide-react';
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
    meta: { leads: number; investment: number; conversions: number };
    google: { leads: number; investment: number; conversions: number };
    direct: { leads: number; investment: number; conversions: number };
    total: { leads: number; investment: number; conversions: number; cpl: number; rate: number };
}

export const MarketingDashboard: React.FC = () => {
    const { organizationId } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');

    // Scroll Drag Logic
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Filters
    const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [granularity, setGranularity] = useState<Granularity>('month');

    // Real Data State
    const [rawData, setRawData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);

    // View Mode State
    const [viewMode, setViewMode] = useState<'table' | 'dashboard'>('dashboard');

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
    const handleSaveCell = async (dateKey: string, channel: string, metric: 'leads' | 'investment' | 'conversions', value: string) => {
        if (!organizationId || !selectedClient) return;

        // Parse value
        const numValue = metric === 'investment'
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

        // Database Update (Upsert)
        // Note: We need to handle the case where the row might not exist.
        // We'll verify/fetch existing row ID first or use upsert constraint if we had one.
        // For simplicity/robustness without unique constraint knowledge:

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
    }: { value: number, dateKey: string, channel: string, metric: 'leads' | 'investment' | 'conversions', isMoney?: boolean }) => {
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
            const sumStart = { leads: 0, investment: 0, conversions: 0 };
            const groupByChannel = (channel: string) => {
                const rows = periodRows.filter(r => r.channel === channel);
                return rows.reduce((acc, curr) => ({
                    leads: acc.leads + (curr.leads || 0),
                    investment: acc.investment + (curr.investment || 0),
                    conversions: acc.conversions + (curr.conversions || 0)
                }), { ...sumStart });
            };

            const meta = groupByChannel('meta');
            const google = groupByChannel('google');
            const direct = groupByChannel('direct'); // includes 'direct' or no channel

            const totalLeads = meta.leads + google.leads + direct.leads;
            const totalInvest = meta.investment + google.investment + direct.investment;
            const totalConv = meta.conversions + google.conversions + direct.conversions;

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
                    cpl: totalLeads > 0 ? totalInvest / totalLeads : 0,
                    rate: totalLeads > 0 ? totalConv / totalLeads : 0
                }
            } as PeriodData;
        });
    }, [periods, rawData, granularity]);

    // Dashboard View Render Logic
    const renderDashboardView = () => {
        // Calculate Totals for Cards
        const grandTotal = tableData.reduce((acc, curr) => ({
            leads: acc.leads + curr.total.leads,
            investment: acc.investment + curr.total.investment,
            conversions: acc.conversions + curr.total.conversions,
        }), { leads: 0, investment: 0, conversions: 0 });

        const avgCpl = grandTotal.leads > 0 ? grandTotal.investment / grandTotal.leads : 0;
        const avgRate = grandTotal.leads > 0 ? grandTotal.conversions / grandTotal.leads : 0;

        return (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Leads</p>
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
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Taxa de Conversão</p>
                        <h3 className="text-3xl font-bold text-emerald-600 mt-2">{new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(avgRate)}</h3>
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

                        <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-2 px-3">
                            <span className="text-xs font-bold text-slate-400 uppercase">De</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-sm font-medium text-slate-700 py-1 focus:ring-0 p-0"
                            />
                            <span className="text-xs font-bold text-slate-400 uppercase">Até</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-sm font-medium text-slate-700 py-1 focus:ring-0 p-0"
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

            {viewMode === 'dashboard' ? renderDashboardView() : (
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
                                <DataRow label="Taxa de Conversão" getter={d => d.meta.leads > 0 ? d.meta.conversions / d.meta.leads : 0} format={formatPercent} />

                                {/* GOOGLE ADS */}
                                <SectionHeader title="Google Ads" color="bg-emerald-50" />
                                <DataRow label="Leads Gerados" getter={d => d.google.leads} editable channel="google" metric="leads" />
                                <DataRow label="Custo por Lead" getter={d => d.google.leads > 0 ? d.google.investment / d.google.leads : 0} format={formatCurrency} />
                                <DataRow label="Investimento" getter={d => d.google.investment} format={formatCurrency} editable channel="google" metric="investment" />
                                <DataRow label="Conversões" getter={d => d.google.conversions} editable channel="google" metric="conversions" />
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
                                <DataRow label="Taxa Global" getter={d => d.total.rate} format={formatPercent} bg="bg-slate-50" />
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
