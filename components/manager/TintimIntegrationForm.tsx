import React, { useState, useEffect } from 'react';
import {
    Settings, ShieldCheck, Link, Activity, Check, X, Copy, RefreshCw, AlertCircle, Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface TintimConfig {
    customer_code?: string;
    security_token?: string;
    lead_mapped_events?: string[];
    conversion_mapped_events?: string[];
}

interface TintimIntegrationFormProps {
    clientId?: string | null;
    clientName?: string | null;
    config?: TintimConfig;
    onChange: (config: TintimConfig) => void;
    showWebhook?: boolean;
}

export const TintimIntegrationForm: React.FC<TintimIntegrationFormProps> = ({
    clientId,
    clientName,
    config = {
        customer_code: '',
        security_token: '',
        lead_mapped_events: [],
        conversion_mapped_events: []
    },
    onChange,
    showWebhook = true
}) => {
    const [customerCode, setCustomerCode] = useState(config.customer_code || '');
    const [securityToken, setSecurityToken] = useState(config.security_token || '');
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveredEvents, setDiscoveredEvents] = useState<string[]>([]);
    const [eventMappings, setEventMappings] = useState<{ leads: string[], conversions: string[] }>({
        leads: config.lead_mapped_events || [],
        conversions: config.conversion_mapped_events || []
    });
    const [webhookBaseUrl, setWebhookBaseUrl] = useState('');
    const [discoveryUrl, setDiscoveryUrl] = useState('');

    useEffect(() => {
        const fetchGlobalUrls = async () => {
            try {
                const { data } = await supabase
                    .from('system_settings')
                    .select('key, value');

                if (data) {
                    const webhook = data.find(s => s.key === 'tintim_webhook_base_url');
                    const discovery = data.find(s => s.key === 'tintim_discovery_url');

                    if (webhook?.value) setWebhookBaseUrl(webhook.value);
                    if (discovery?.value) setDiscoveryUrl(discovery.value);
                }
            } catch (err) {
                console.error('Error fetching global URLs:', err);
            }
        };
        fetchGlobalUrls();
    }, []);

    useEffect(() => {
        onChange({
            customer_code: customerCode,
            security_token: securityToken,
            lead_mapped_events: eventMappings.leads,
            conversion_mapped_events: eventMappings.conversions
        });
    }, [customerCode, securityToken, eventMappings]);

    const handleDiscoverEvents = async () => {
        if (!customerCode || !securityToken) return;
        setIsDiscovering(true);
        try {
            const baseUrl = discoveryUrl || `https://api.tintim.app/v1/conversions`;

            const { data, error } = await supabase.functions.invoke('tintim-proxy', {
                body: {
                    url: baseUrl,
                    customer_code: customerCode,
                    security_token: securityToken,
                    method: discoveryUrl ? 'POST' : 'GET'
                }
            });

            if (error) throw error;

            if (data?.data) {
                const names = Array.from(new Set(data.data.map((c: any) => c.event_name))) as string[];
                setDiscoveredEvents(names);
            }
        } catch (err) {
            console.error('Error discovering events:', err);
        } finally {
            setIsDiscovering(false);
        }
    };

    const toggleMapping = (event: string, type: 'leads' | 'conversions') => {
        setEventMappings(prev => {
            const current = [...prev[type]];
            if (current.includes(event)) {
                return { ...prev, [type]: current.filter(e => e !== event) };
            } else {
                return { ...prev, [type]: [...current, event] };
            }
        });
    };

    const webhookUrl = webhookBaseUrl || 'https://n8n.seusistema.com/webhook/tintim-events';

    return (
        <div className="space-y-6">
            {/* Credentials Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-800">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Conexão Tintim</h3>
                    </div>
                    {clientName && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full animate-in fade-in zoom-in duration-500">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-[11px] font-black text-indigo-700 uppercase tracking-tight truncate max-w-[200px]">
                                Cliente: {clientName}
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Código do Cliente</label>
                        <input
                            type="text"
                            value={customerCode}
                            onChange={(e) => setCustomerCode(e.target.value)}
                            placeholder="Ex: 12345"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Token de Segurança</label>
                        <input
                            type="password"
                            value={securityToken}
                            onChange={(e) => setSecurityToken(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleDiscoverEvents}
                    disabled={isDiscovering || !customerCode || !securityToken}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:bg-slate-400"
                >
                    <Activity className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
                    {isDiscovering ? 'Buscando...' : 'Descobrir Eventos de Conversão'}
                </button>
            </div>

            {/* Webhook Section */}
            {showWebhook && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Link className="w-5 h-5 text-orange-500" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Webhook (Real-time)</h3>
                    </div>

                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
                        <p className="text-[11px] text-orange-800 leading-tight">
                            Copie a URL abaixo e cole nas configurações de Webhook do seu painel Tintim (Configurações {'>'} Webhooks).
                        </p>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white border border-orange-200 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-600 truncate">
                                {webhookUrl}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(webhookUrl);
                                    alert('URL copiada!');
                                }}
                                className="p-1.5 bg-white border border-orange-200 rounded-lg hover:bg-orange-100 transition-all text-orange-600"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Mapping Section */}
            {discoveredEvents.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800">
                            <Filter className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-sm uppercase tracking-wider">Mapeamento</h3>
                        </div>
                        <Badge variant="blue" className="text-[10px]">{discoveredEvents.length} Eventos</Badge>
                    </div>

                    <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2 font-bold text-slate-500 uppercase">Evento</th>
                                    <th className="px-4 py-2 font-bold text-slate-500 uppercase text-center">Lead?</th>
                                    <th className="px-4 py-2 font-bold text-slate-500 uppercase text-center">Venda?</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {discoveredEvents.map((eventName) => (
                                    <tr key={eventName} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2.5 font-medium text-slate-700">{eventName}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <input
                                                type="checkbox"
                                                checked={eventMappings.leads.includes(eventName)}
                                                onChange={() => toggleMapping(eventName, 'leads')}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <input
                                                type="checkbox"
                                                checked={eventMappings.conversions.includes(eventName)}
                                                onChange={() => toggleMapping(eventName, 'conversions')}
                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const Badge: React.FC<{ children: React.ReactNode, variant?: 'blue' | 'indigo', className?: string }> = ({ children, variant = 'indigo', className = '' }) => {
    const variants = {
        blue: 'bg-blue-100 text-blue-700 border-blue-200',
        indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};
