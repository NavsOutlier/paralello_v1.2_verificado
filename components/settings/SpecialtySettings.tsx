import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Loader2, Users, Save } from 'lucide-react';

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

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Especialidades da Equipe</h2>
                <p className="text-sm text-slate-500 mt-1">Defina as áreas de expertise dos membros</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex gap-3">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Nova especialidade (Ex: Design, Backend...)"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <button
                    onClick={handleCreate}
                    disabled={isSaving || !newName.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Adicionar
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {specialties.length === 0 ? (
                    <div className="col-span-2 py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        Nenhuma especialidade definida.
                    </div>
                ) : (
                    specialties.map(s => (
                        <div key={s.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between hover:border-indigo-200 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-slate-50 rounded text-slate-400 group-hover:text-indigo-500">
                                    <Users className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-slate-700">{s.name}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(s.id)}
                                className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
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
