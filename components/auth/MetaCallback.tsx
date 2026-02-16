import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { PremiumBackground } from '../ui/PremiumBackground';

export const MetaCallback: React.FC = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Conectando com Meta...');

    useEffect(() => {
        const processCallback = async () => {
            try {
                // 1. Extract code from URL
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const error = params.get('error');

                if (error) {
                    throw new Error('Permissão negada ou erro na autenticação.');
                }

                if (!code) {
                    throw new Error('Código de autorização não encontrado.');
                }

                // 3. Send CODE to opener (Main Dashboard) immediately
                if (window.opener) {
                    window.opener.postMessage(
                        {
                            type: 'META_AUTH_CODE',
                            code: code,
                            timestamp: new Date().toISOString()
                        },
                        window.location.origin
                    );
                }

                // 4. Close window
                window.close();

            } catch (err: any) {
                console.error('Meta Callback Error:', err);
                setStatus('error');
                setMessage(err.message || 'Ocorreu um erro desconhecido.');

                // If error, keep window open briefly to show error then close
                setTimeout(() => window.close(), 3000);
            }
        };

        processCallback();
    }, []);

    return (
        <div className="h-screen w-screen bg-[#0a0f1a] flex flex-col items-center justify-center relative overflow-hidden font-sans text-slate-200">
            <PremiumBackground />

            <div className="relative z-10 flex flex-col items-center p-8 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-md w-full text-center">

                {status === 'loading' && (
                    <>
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Conectando...</h2>
                        <p className="text-slate-400 text-sm">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Sucesso!</h2>
                        <p className="text-slate-400 text-sm">{message}</p>
                        <p className="text-emerald-500/50 text-xs mt-4">Esta janela fechará automaticamente.</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                            <XCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Erro na Conexão</h2>
                        <p className="text-slate-400 text-sm">{message}</p>
                        <button
                            onClick={() => window.close()}
                            className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                        >
                            Fechar Janela
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
