import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Link, Activity, Copy, Filter, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TintimConfig } from '../../types/marketing';

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
        conversion_event: '',
        conversion_event_id: undefined
    },
    onChange,
    showWebhook = true
}) => {
    const [customerCode, setCustomerCode] = useState(config.customer_code || '');
    const [securityToken, setSecurityToken] = useState(config.security_token || '');
    const [conversionEvent, setConversionEvent] = useState(config.conversion_event || '');
    const [conversionEventId, setConversionEventId] = useState<number | undefined>(config.conversion_event_id);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveredEvents, setDiscoveredEvents] = useState<{ id: number; name: string }[]>([]);
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
            conversion_event: conversionEvent,
            conversion_event_id: conversionEventId
        });
    }, [customerCode, securityToken, conversionEvent, conversionEventId]);

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

            console.log('Tintim Discovery Response:', data);

            // Try to extract events with id and name from various possible formats
            let events: { id: number; name: string }[] = [];

            if (data?.data && Array.isArray(data.data)) {
                // Format: { data: [{ id: 123, name: "..." }] }
                events = data.data
                    .filter((c: any) => c.id && (c.name || c.event_name))
                    .map((c: any) => ({ id: c.id, name: c.name || c.event_name }));
            } else if (Array.isArray(data)) {
                // Format: [{ id: 123, name: "..." }]
                events = data
                    .filter((c: any) => c.id && (c.name || c.event_name))
                    .map((c: any) => ({ id: c.id, name: c.name || c.event_name }));
            }

            // Remove duplicates by id
            const uniqueEvents = events.filter((event, index, self) =>
                index === self.findIndex(e => e.id === event.id)
            );

            console.log('Parsed Events:', uniqueEvents);
            setDiscoveredEvents(uniqueEvents);
        } catch (err) {
            console.error('Error discovering events:', err);
        } finally {
            setIsDiscovering(false);
        }
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
                    {isDiscovering ? 'Buscando...' : 'Selecionar evento de conversão (venda)'}
                </button>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                    <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-700 flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3" />
                        Onde encontrar as credenciais:
                    </h4>
                    <ol className="list-decimal list-inside text-[11px] text-slate-500 space-y-1">
                        <li>No painel Tintim, acesse <strong>Informações do Cliente</strong>.</li>
                        <li>Role para baixo até a sessão <strong>Dados para Integração</strong>.</li>
                        <li>Copie o <strong>Código do Cliente</strong> e o <strong>Token de Segurança</strong> exibidos na tela.</li>
                    </ol>
                </div>
            </div>

            {/* Webhook Section */}
            {showWebhook && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Link className="w-5 h-5 text-orange-500" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Webhook (Real-time)</h3>
                    </div>

                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-4">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-white border border-orange-200 rounded-lg px-3 py-2 text-[11px] font-mono text-slate-600 truncate flex items-center">
                                {webhookUrl}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(webhookUrl);
                                    // You can add a toast trigger here if available, or keep alert/logic
                                    alert('URL copiada para a área de transferência!');
                                }}
                                className="px-3 bg-white border border-orange-200 rounded-lg hover:bg-orange-100 transition-all text-orange-600 font-bold text-xs uppercase tracking-wider flex items-center gap-2"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copiar
                            </button>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-[10px] uppercase tracking-widest font-black text-orange-800 flex items-center gap-1.5">
                                <Activity className="w-3 h-3" />
                                Configurar no Tintim:
                            </h4>
                            <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1.5 marker:font-bold marker:text-orange-400">
                                <li>No painel do cliente, acesse <strong>Informações do Cliente</strong>.</li>
                                <li>Em <strong>Endereço de Webhooks</strong>, clique em <strong>Editar</strong>.</li>
                                <li>Cole a URL em dois campos: <strong>Criação de Conversa</strong> e <strong>Alteração de Conversa</strong>.</li>
                                <li>Clique em <strong>Salvar</strong>.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Selection Section - Simplified to single selection */}
            {discoveredEvents.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800">
                            <Filter className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-bold text-sm uppercase tracking-wider">Evento de Conversão</h3>
                        </div>
                        <Badge variant="blue" className="text-[10px]">{discoveredEvents.length} Eventos</Badge>
                    </div>

                    <p className="text-xs text-slate-500">
                        Selecione qual evento representa uma <strong>venda/conversão</strong> para este cliente:
                    </p>

                    <div className="space-y-2">
                        {discoveredEvents.map((event) => (
                            <label
                                key={event.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${conversionEventId === event.id
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="conversionEvent"
                                    value={event.id}
                                    checked={conversionEventId === event.id}
                                    onChange={() => {
                                        setConversionEvent(event.name);
                                        setConversionEventId(event.id);
                                    }}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${conversionEventId === event.id
                                    ? 'border-emerald-500 bg-emerald-500'
                                    : 'border-slate-300'
                                    }`}>
                                    {conversionEventId === event.id && (
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    )}
                                </div>
                                <span className={`text-sm font-medium ${conversionEventId === event.id ? 'text-emerald-700' : 'text-slate-700'
                                    }`}>
                                    {event.name}
                                </span>
                            </label>
                        ))}
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

// Re-export for backwards compatibility
export type { TintimConfig };
