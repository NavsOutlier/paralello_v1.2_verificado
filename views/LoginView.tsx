
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PremiumBackground } from '../components/ui/PremiumBackground';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden bg-[#0a0f1a] p-4 text-slate-200">
            <PremiumBackground />

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
                {/* Logo Section */}
                <div className="flex justify-center mb-10">
                    <img src="/blackback-logo.png" alt="Blackback" className="w-64 h-auto object-contain drop-shadow-[0_0_25px_rgba(139,92,246,0.3)]" />
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/40 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-3xl shadow-black/50">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Bem-vindo</h2>
                        <p className="text-slate-400 font-medium tracking-wide">Faça login para continuar no Blackback</p>
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center gap-3 animate-shake">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:bg-slate-800 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none text-slate-200 placeholder:text-slate-600 font-medium"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:bg-slate-800 focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none text-slate-200 placeholder:text-slate-600 font-medium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 mt-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">
                        Não tem conta? <span className="text-white hover:text-cyan-400 cursor-pointer transition-colors">Peça ao administrador</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
