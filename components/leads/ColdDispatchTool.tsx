import React, { useState } from 'react';
import { Send, Plus, Trash2, Code, Phone, Globe, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TemplateVariable {
    key: string;
    value: string;
}

export const ColdDispatchTool: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [language, setLanguage] = useState('pt_BR');
    const [category, setCategory] = useState<'marketing' | 'utility' | 'authentication'>('marketing');
    const [targets, setTargets] = useState('');
    const [variables, setVariables] = useState<TemplateVariable[]>([]);
    const [responseLog, setResponseLog] = useState<any>(null);

    const handleAddVariable = () => {
        setVariables([...variables, { key: '', value: '' }]);
    };

    const handleRemoveVariable = (index: number) => {
        setVariables(variables.filter((_, i) => i !== index));
    };

    const handleVariableChange = (index: number, field: 'key' | 'value', value: string) => {
        const newVars = [...variables];
        newVars[index][field] = value;
        setVariables(newVars);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResponseLog(null);

        try {
            // Process targets
            const targetList = targets
                .split(/[\n,]+/)
                .map(t => t.trim().replace(/\D/g, '')) // Remove non-digits
                .filter(t => t.length >= 10); // Simple validation

            if (targetList.length === 0) {
                alert('Nenhum número válido encontrado.');
                setLoading(false);
                return;
            }

            // Prepare payload
            const payload = {
                template_name: templateName,
                language,
                category,
                targets: targetList,
                variables: variables.reduce((acc, curr) => {
                    if (curr.key) acc[curr.key] = curr.value;
                    return acc;
                }, {} as Record<string, string>)
            };

            const { data, error } = await supabase.functions.invoke('dispatch-cold-leads', {
                body: payload
            });

            if (error) throw error;
            setResponseLog(data);

        } catch (err: any) {
            console.error('Dispatch error:', err);
            alert(`Erro ao enviar: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0f172a]/40 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Send className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Disparo Frio (Cold Dispatch)</h2>
                        <p className="text-slate-400 text-sm">Envie templates da API Oficial para uma lista de contatos.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Template Config */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Code className="w-3.5 h-3.5" />
                                Nome do Template
                            </label>
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="ex: hello_world"
                                required
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none placeholder:text-slate-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5" />
                                Idioma
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none appearance-none"
                            >
                                <option value="pt_BR">Português (BR)</option>
                                <option value="en_US">Inglês (US)</option>
                                <option value="es_ES">Espanhol</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Categoria
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none appearance-none"
                            >
                                <option value="marketing">Marketing</option>
                                <option value="utility">Utilidade</option>
                                <option value="authentication">Autenticação</option>
                            </select>
                        </div>
                    </div>

                    {/* Targets */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            Lista de Contatos (um por linha ou separado por vírgula)
                        </label>
                        <textarea
                            value={targets}
                            onChange={(e) => setTargets(e.target.value)}
                            placeholder="5511999999999&#10;5521988888888"
                            rows={5}
                            required
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/5 rounded-xl text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none resize-none placeholder:text-slate-600 font-mono"
                        />
                        <p className="text-xs text-slate-500">
                            * Apenas números (DDD + Número). O código do país (55) é recomendado.
                        </p>
                    </div>

                    {/* Dynamic Variables */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Variáveis Dinâmicas (Opcional)
                            </label>
                            <button
                                type="button"
                                onClick={handleAddVariable}
                                className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Adicionar Variável
                            </button>
                        </div>

                        {variables.length > 0 ? (
                            <div className="space-y-2">
                                {variables.map((variable, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={variable.key}
                                            onChange={(e) => handleVariableChange(index, 'key', e.target.value)}
                                            placeholder="Chave (ex: nome)"
                                            className="flex-1 px-3 py-2 bg-slate-950/50 border border-white/5 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={variable.value}
                                            onChange={(e) => handleVariableChange(index, 'value', e.target.value)}
                                            placeholder="Valor"
                                            className="flex-1 px-3 py-2 bg-slate-950/50 border border-white/5 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveVariable(index)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-slate-900/30 border border-white/5 text-center">
                                <p className="text-sm text-slate-500">Nenhuma variável configurada.</p>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !templateName || !targets}
                            className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl font-bold uppercase tracking-wide text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Enviar Disparos
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Response Log */}
                {responseLog && (
                    <div className="mt-8 pt-6 border-t border-white/5 animate-in slide-in-from-top-4">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-emerald-400" />
                            Relatório de Envio
                        </h3>
                        <div className="bg-black/50 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto border border-white/5 space-y-2">
                            <div className="grid grid-cols-2 gap-4 mb-2">
                                <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400 text-center">
                                    <span className="block text-lg font-black">{responseLog.dispatched}</span>
                                    <span className="text-[10px] uppercase">Sucessos</span>
                                </div>
                                <div className="p-2 bg-red-500/10 rounded border border-red-500/20 text-red-400 text-center">
                                    <span className="block text-lg font-black">{responseLog.failed_count}</span>
                                    <span className="text-[10px] uppercase">Falhas</span>
                                </div>
                            </div>

                            {responseLog.errors && responseLog.errors.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-red-400 font-bold mb-1">Erros:</p>
                                    <ul className="list-disc list-inside space-y-1 text-red-300/80">
                                        {responseLog.errors.map((err: string, i: number) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
