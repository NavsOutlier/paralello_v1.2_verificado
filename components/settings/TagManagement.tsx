import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Edit2, Trash2, Loader2, Check, Tag as TagIcon, Palette } from 'lucide-react';

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
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-pink-500/10 rounded-2xl border border-pink-500/20">
                    <TagIcon className="w-8 h-8 text-pink-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Gerenciamento de Tags</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Crie e gerencie tags globais para organizar suas tarefas
                    </p>
                </div>
            </div>

            {/* Create New Tag */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 mb-6 shadow-xl">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nova Tag
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                        <div className="relative">
                            <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                                placeholder="Nome da nova tag..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
                            />
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="flex gap-2 p-2 bg-slate-950/30 rounded-xl border border-white/5 overflow-x-auto max-w-full">
                        {TAG_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => setNewTagColor(color)}
                                className={`w-8 h-8 rounded-lg transition-all relative ${newTagColor === color
                                    ? 'scale-110 shadow-lg'
                                    : 'hover:scale-105 opacity-60 hover:opacity-100'
                                    }`}
                                style={{ backgroundColor: color }}
                            >
                                {newTagColor === color && (
                                    <div className="absolute inset-0 ring-2 ring-white/50 rounded-lg" />
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim()}
                        className="w-full md:w-auto px-6 py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-500 hover:shadow-lg hover:shadow-pink-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/10"
                    >
                        Criar
                    </button>
                </div>
            </div>

            {/* Tags List */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                {tags.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-800/50">
                            <TagIcon className="w-8 h-8 text-slate-600" />
                        </div>
                        <p>Nenhuma tag criada ainda. Crie sua primeira tag acima!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {tags.map((tag) => (
                            <div key={tag.id} className="p-4 flex flex-col md:flex-row items-center gap-4 hover:bg-white/[0.02] transition-colors group">
                                {editingTag === tag.id ? (
                                    <>
                                        <div className="flex-1 w-full pl-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                                                autoFocus
                                            />
                                        </div>

                                        <div className="flex gap-1 overflow-x-auto max-w-full py-1">
                                            {TAG_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => setEditColor(color)}
                                                    className={`w-6 h-6 rounded transition-all ${editColor === color
                                                        ? 'ring-2 ring-white scale-110'
                                                        : 'opacity-50 hover:opacity-100'
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdateTag(tag.id)}
                                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setEditingTag(null)}
                                                className="p-2 bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 rounded-lg transition-colors border border-white/5"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4 flex-1 w-full">
                                            <div
                                                className="w-8 h-8 rounded-lg shadow-sm flex items-center justify-center font-bold text-xs text-white/90 border border-white/10 shrink-0"
                                                style={{ backgroundColor: tag.color_hex }}
                                            >
                                                <TagIcon className="w-4 h-4 opacity-80" />
                                            </div>
                                            <span className="font-bold text-slate-200 text-lg">{tag.name}</span>
                                        </div>

                                        <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => startEdit(tag)}
                                                className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTag(tag.id)}
                                                className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
