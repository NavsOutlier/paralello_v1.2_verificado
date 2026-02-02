import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Loader2, Users, Save, Sparkles } from 'lucide-react';

interface Specialty {
    id: string;
    organization_id: string;
    name: string;
    created_at: string;
}

interface SpecialtySettingsProps {
    organizationId: string;
}

export const SpecialtySettings: React.FC<SpecialtySettingsProps> = ({ organizationId }) => {
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSpecialties();
    }, [organizationId]);

    const loadSpecialties = async () => {
        try {
            const { data, error } = await supabase
                .from('team_specialties')
                .select('*')
                .eq('organization_id', organizationId)
                .order('name', { ascending: true });

            if (error) throw error;
            setSpecialties(data || []);
        } catch (error) {
            console.error('Error loading specialties:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            setIsSaving(true);
            const { error } = await supabase
                .from('team_specialties')
                .insert([{ organization_id: organizationId, name: newName.trim() }]);

            if (error) throw error;
            setNewName('');
            loadSpecialties();
        } catch (error) {
            console.error('Error creating specialty:', error);
            alert('Especialidade já existe ou erro no servidor.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remover esta especialidade?')) return;
        try {
            const { error } = await supabase
                .from('team_specialties')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSpecialties(specialties.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting specialty:', error);
        }
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" /></div>;

    return (
        <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <Sparkles className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Especialidades da Equipe</h2>
                    <p className="text-sm text-slate-400 mt-1">Defina as áreas de expertise dos membros</p>
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-6 mb-8 shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-amber-400">
                    <Plus className="w-4 h-4" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Adicionar Nova</h3>
                </div>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        placeholder="Nova especialidade (Ex: Design, Backend, Copywriting...)"
                        className="flex-1 px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 text-white placeholder:text-slate-600 transition-all font-medium"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={isSaving || !newName.trim()}
                        className="px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-white/10"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Adicionar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {specialties.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-3xl bg-slate-900/20">
                        <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="font-medium">Nenhuma especialidade definida.</p>
                        <p className="text-sm mt-1">Adicione tags para organizar seu time.</p>
                    </div>
                ) : (
                    specialties.map(s => (
                        <div key={s.id} className="bg-white/[0.03] p-4 rounded-xl border border-white/5 flex items-center justify-between hover:bg-white/[0.05] hover:border-amber-500/30 transition-all group shadow-sm hover:shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-500/10 transition-colors">
                                    <Users className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{s.name}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(s.id)}
                                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
