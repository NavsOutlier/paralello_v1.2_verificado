import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Loader2, CheckSquare, Save, LayoutTemplate } from 'lucide-react';

interface ChecklistTemplate {
    id: string;
    organization_id: string;
    name: string;
    items: string[];
    created_at: string;
}

interface TemplateSettingsProps {
    organizationId: string;
}

export const TemplateSettings: React.FC<TemplateSettingsProps> = ({ organizationId }) => {
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newItems, setNewItems] = useState<string[]>(['']);

    useEffect(() => {
        loadTemplates();
    }, [organizationId]);

    const loadTemplates = async () => {
        try {
            const { data, error } = await supabase
                .from('checklist_templates')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItem = () => setNewItems([...newItems, '']);

    const handleRemoveItem = (index: number) => {
        const next = [...newItems];
        next.splice(index, 1);
        setNewItems(next.length ? next : ['']);
    };

    const handleUpdateItem = (index: number, val: string) => {
        const next = [...newItems];
        next[index] = val;
        setNewItems(next);
    };

    const handleCreateTemplate = async () => {
        if (!newName.trim()) return;
        const validItems = newItems.filter(i => i.trim());
        if (validItems.length === 0) return;

        try {
            setIsCreating(true);
            const { error } = await supabase
                .from('checklist_templates')
                .insert([{
                    organization_id: organizationId,
                    name: newName.trim(),
                    items: validItems
                }]);

            if (error) throw error;

            setNewName('');
            setNewItems(['']);
            loadTemplates();
        } catch (error) {
            console.error('Error creating template:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Excluir este modelo permanentemente?')) return;
        try {
            const { error } = await supabase
                .from('checklist_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTemplates(templates.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" /></div>;

    return (
        <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                    <LayoutTemplate className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Modelos de Checklist</h2>
                    <p className="text-sm text-slate-400 mt-1">Gerencie modelos reutilizáveis para tarefas frequentes</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Section */}
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 shadow-xl h-fit">
                    <h3 className="text-xs font-black text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-wider">
                        <Plus className="w-4 h-4" />
                        Novo Modelo
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nome do Modelo</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ex: Onboarding Cliente"
                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white font-bold placeholder:text-slate-600 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                                Itens do Checklist
                                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{newItems.length} itens</span>
                            </label>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {newItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 group">
                                        <div className="flex-1 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono">{idx + 1}.</span>
                                            <input
                                                type="text"
                                                value={item}
                                                onChange={(e) => handleUpdateItem(idx, e.target.value)}
                                                placeholder={`Descrição da etapa...`}
                                                className="w-full pl-8 pr-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg focus:ring-1 focus:ring-cyan-500/50 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-700 focus:bg-slate-900/80"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(idx)}
                                            className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleAddItem}
                                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 mt-2 flex items-center gap-1 py-1 px-2 hover:bg-cyan-500/10 rounded transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Adicionar Item
                            </button>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={handleCreateTemplate}
                                disabled={isCreating || !newName.trim()}
                                className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10 active:scale-95"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salvar Modelo
                            </button>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider pl-2">Modelos Salvos</h3>
                    {templates.length === 0 ? (
                        <div className="bg-slate-900/20 rounded-2xl border border-dashed border-white/5 p-10 text-center text-slate-500 text-sm flex flex-col items-center">
                            <LayoutTemplate className="w-12 h-12 text-slate-800 mb-3" />
                            <p>Nenhum modelo cadastrado.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {templates.map(template => (
                                <div key={template.id} className="bg-slate-900/40 backdrop-blur-xl rounded-xl border border-white/5 p-5 flex items-center justify-between hover:border-cyan-500/30 hover:bg-white/[0.02] transition-colors group shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                                            <CheckSquare className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-lg">{template.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-mono text-cyan-200 bg-cyan-500/10 px-1.5 rounded">{template.items.length} steps</span>
                                                <span className="text-[10px] text-slate-500">Criado em {new Date(template.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-rose-500/20"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
