import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Link, Activity, Copy, Filter, CheckCircle2, AlertCircle, Loader2
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
        <div className="space-y-8">
            {/* Credentials Section */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <ShieldCheck className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-black text-sm uppercase tracking-widest">Conexão Tintim</h3>
                    </div>
                    {clientName && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full animate-in fade-in zoom-in duration-500">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest truncate max-w-[200px]">
                                Cliente: {clientName}
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Código do Cliente</label>
                        <input
                            type="text"
                            value={customerCode}
                            onChange={(e) => setCustomerCode(e.target.value)}
                            placeholder="Ex: 12345"
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Token de Segurança</label>
                        <input
                            type="password"
                            value={securityToken}
                            onChange={(e) => setSecurityToken(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleDiscoverEvents}
                    disabled={isDiscovering || !customerCode || !securityToken}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest border border-white/5 hover:border-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                    {isDiscovering ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Activity className="w-4 h-4 text-indigo-400" />}
                    {isDiscovering ? 'Buscando Eventos...' : 'Buscar Eventos de Conversão'}
                </button>

                <div className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-xl p-4 space-y-3">
                    <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-400 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Onde encontrar as credenciais:
                    </h4>
                    <ol className="list-decimal list-inside text-[11px] text-slate-500 space-y-1.5 font-medium ml-1">
                        <li>No painel Tintim, acesse <strong className="text-slate-300">Informações do Cliente</strong>.</li>
                        <li>Role para baixo até a sessão <strong className="text-slate-300">Dados para Integração</strong>.</li>
                        <li>Copie o <strong className="text-slate-300">Código do Cliente</strong> e o <strong className="text-slate-300">Token de Segurança</strong>.</li>
                    </ol>
                </div>
            </div>

            {/* Webhook Section */}
            {showWebhook && (
                <div className="space-y-5 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 text-white">
                        <Link className="w-5 h-5 text-orange-400" />
                        <h3 className="font-black text-sm uppercase tracking-widest">Webhook (Real-time)</h3>
                    </div>

                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-5 space-y-5">
                        <div className="flex gap-3">
                            <div className="flex-1 bg-slate-950/50 border border-orange-500/20 rounded-xl px-4 py-3 text-[11px] font-mono text-orange-200/80 truncate flex items-center select-all">
                                {webhookUrl}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(webhookUrl);
                                    alert('URL copiada para a área de transferência!');
                                }}
                                className="px-5 bg-orange-500/10 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-all text-orange-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copiar
                            </button>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-[10px] uppercase tracking-widest font-black text-orange-400/80 flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5" />
                                Configurar no Tintim:
                            </h4>
                            <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-2 marker:font-bold marker:text-orange-500/50">
                                <li>Em <strong>Informações do Cliente</strong>, vá até <strong>Endereço de Webhooks</strong> e clique em <strong className="text-slate-300">Editar</strong>.</li>
                                <li>Cole a URL nos campos: <strong className="text-slate-300">Criação de Conversa</strong> e <strong className="text-slate-300">Alteração de Conversa</strong>.</li>
                                <li>Clique em <strong className="text-slate-300">Salvar</strong>.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Selection Section */}
            {discoveredEvents.length > 0 && (
                <div className="space-y-5 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <Filter className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-black text-sm uppercase tracking-widest">Evento de Conversão</h3>
                        </div>
                        <Badge variant="blue" className="text-[9px] uppercase tracking-wider font-black">{discoveredEvents.length} Eventos</Badge>
                    </div>

                    <p className="text-[11px] text-slate-400 font-medium">
                        Selecione qual evento representa uma <strong className="text-emerald-400">venda/conversão</strong> para este cliente:
                    </p>

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {discoveredEvents.map((event) => (
                            <label
                                key={event.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all group ${conversionEventId === event.id
                                    ? 'border-emerald-500/50 bg-emerald-500/10'
                                    : 'border-white/5 bg-slate-900/40 hover:bg-slate-800 hover:border-white/10'
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
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${conversionEventId === event.id
                                    ? 'border-emerald-500 bg-emerald-500'
                                    : 'border-slate-600 group-hover:border-slate-500'
                                    }`}>
                                    {conversionEventId === event.id && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                    )}
                                </div>
                                <span className={`text-sm font-bold ${conversionEventId === event.id ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'
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
        blue: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    };
    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

// Re-export for backwards compatibility
export type { TintimConfig };
