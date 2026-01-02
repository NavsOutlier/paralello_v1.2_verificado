import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Loader2, CheckSquare, Save } from 'lucide-react';

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

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Modelos de Checklist</h2>
                <p className="text-sm text-slate-500 mt-1">Gerencie modelos reutilizáveis para tarefas frequentes</p>
            </div>

            {/* Create Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-500" />
                    Novo Modelo
                </h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nome do modelo (Ex: Onboarding Cliente)"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                    />

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Itens do Checklist</label>
                        {newItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => handleUpdateItem(idx, e.target.value)}
                                    placeholder={`Item ${idx + 1}`}
                                    className="flex-1 px-3 py-1.5 border border-slate-100 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm"
                                />
                                <button
                                    onClick={() => handleRemoveItem(idx)}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={handleAddItem}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 mt-2 flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Adicionar Item
                        </button>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleCreateTemplate}
                            disabled={isCreating || !newName.trim()}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Modelo
                        </button>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Modelos Salvos</h3>
                {templates.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400 text-sm">
                        Nenhum modelo cadastrado.
                    </div>
                ) : (
                    templates.map(template => (
                        <div key={template.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:border-indigo-200 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <CheckSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{template.name}</h4>
                                    <p className="text-xs text-slate-500">{template.items.length} itens</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
