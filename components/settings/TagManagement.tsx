import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Edit2, Trash2, Loader2, Check } from 'lucide-react';

interface GlobalTag {
    id: string;
    organization_id: string;
    name: string;
    color_hex: string;
    created_at: string;
    archived_at: string | null;
}

interface TagManagementProps {
    organizationId: string;
}

const TAG_COLORS = [
    '#6366f1', // indigo
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // rose
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
];

export const TagManagement: React.FC<TagManagementProps> = ({ organizationId }) => {
    const [tags, setTags] = useState<GlobalTag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    useEffect(() => {
        loadTags();

        // Subscribe to changes
        const channel = supabase
            .channel('global_tags_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'global_tags',
                    filter: `organization_id=eq.${organizationId}`,
                },
                () => {
                    loadTags();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [organizationId]);

    const loadTags = async () => {
        try {
            const { data, error } = await supabase
                .from('global_tags')
                .select('*')
                .eq('organization_id', organizationId)
                .is('archived_at', null)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setTags(data || []);
        } catch (error) {
            console.error('Error loading tags:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;

        try {
            const { error } = await supabase
                .from('global_tags')
                .insert([{
                    organization_id: organizationId,
                    name: newTagName.trim(),
                    color_hex: newTagColor,
                }]);

            if (error) throw error;

            setNewTagName('');
            setNewTagColor(TAG_COLORS[0]);
        } catch (error) {
            console.error('Error creating tag:', error);
            alert('Erro ao criar tag. Verifique se o nome já existe.');
        }
    };

    const handleUpdateTag = async (tagId: string) => {
        try {
            const { error } = await supabase
                .from('global_tags')
                .update({
                    name: editName.trim(),
                    color_hex: editColor,
                })
                .eq('id', tagId);

            if (error) throw error;

            setEditingTag(null);
        } catch (error) {
            console.error('Error updating tag:', error);
            alert('Erro ao atualizar tag.');
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta tag? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('global_tags')
                .delete()
                .eq('id', tagId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting tag:', error);
            alert('Erro ao excluir tag.');
        }
    };

    const startEdit = (tag: GlobalTag) => {
        setEditingTag(tag.id);
        setEditName(tag.name);
        setEditColor(tag.color_hex);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Gerenciamento de Tags</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Crie e gerencie tags globais para organizar suas tarefas
                </p>
            </div>

            {/* Create New Tag */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                            placeholder="Nome da nova tag..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Color Picker */}
                    <div className="flex gap-1">
                        {TAG_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => setNewTagColor(color)}
                                className={`w-8 h-8 rounded-lg transition-all ${newTagColor === color
                                        ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                                        : 'hover:scale-105'
                                    }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Criar
                    </button>
                </div>
            </div>

            {/* Tags List */}
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {tags.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        Nenhuma tag criada ainda. Crie sua primeira tag acima!
                    </div>
                ) : (
                    tags.map((tag) => (
                        <div key={tag.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                            {editingTag === tag.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />

                                    <div className="flex gap-1">
                                        {TAG_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setEditColor(color)}
                                                className={`w-6 h-6 rounded transition-all ${editColor === color
                                                        ? 'ring-2 ring-offset-1 ring-indigo-500'
                                                        : ''
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handleUpdateTag(tag.id)}
                                        className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setEditingTag(null)}
                                        className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div
                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: tag.color_hex }}
                                    />
                                    <span className="flex-1 font-medium text-slate-700">{tag.name}</span>

                                    <button
                                        onClick={() => startEdit(tag)}
                                        className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTag(tag.id)}
                                        className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
