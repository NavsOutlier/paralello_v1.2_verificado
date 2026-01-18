import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    FileText, X, Search, Star, Trash2, CalendarDays, Video, CreditCard, Bell,
    MessageSquare, BarChart3, Clock, Calendar, Sparkles
} from 'lucide-react';

interface Template {
    id: string;
    name: string;
    type: 'dispatch' | 'report';
    category: string;
    content: string;
    template_data: any;
    is_default: boolean;
    created_at: string;
}

interface TemplateLibraryProps {
    type: 'dispatch' | 'report';
    onSelect: (template: Template) => void;
    onClose: () => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
    type,
    onSelect,
    onClose
}) => {
    const { organizationId } = useAuth();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const dispatchCategories = [
        { value: 'all', label: 'Todos' },
        { value: 'holiday', label: 'Feriados', icon: CalendarDays },
        { value: 'meeting', label: 'Reuniões', icon: Video },
        { value: 'payment', label: 'Pagamentos', icon: CreditCard },
        { value: 'reminder', label: 'Lembretes', icon: Bell },
        { value: 'other', label: 'Outros', icon: MessageSquare },
    ];

    const reportCategories = [
        { value: 'all', label: 'Todos' },
        { value: 'daily', label: 'Diário', icon: Clock },
        { value: 'weekly', label: 'Semanal', icon: Calendar },
        { value: 'monthly', label: 'Mensal', icon: BarChart3 },
    ];

    const categories = type === 'dispatch' ? dispatchCategories : reportCategories;

    const fetchTemplates = async () => {
        setLoading(true);

        let query = supabase
            .from('automation_templates')
            .select('*')
            .eq('type', type)
            .order('is_default', { ascending: false })
            .order('name');

        // Get default templates + org templates
        const { data, error } = await query.or(
            `is_default.eq.true,organization_id.eq.${organizationId}`
        );

        if (error) {
            console.error('Error fetching templates:', error);
        } else {
            setTemplates(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTemplates();
    }, [type, organizationId]);

    const handleDelete = async (id: string, isDefault: boolean) => {
        if (isDefault) {
            alert('Templates padrão não podem ser excluídos');
            return;
        }
        if (!confirm('Tem certeza que deseja excluir este template?')) return;

        const { error } = await supabase
            .from('automation_templates')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting template:', error);
        } else {
            fetchTemplates();
        }
    };

    const getCategoryIcon = (category: string) => {
        const cat = categories.find(c => c.value === category);
        if (cat && 'icon' in cat) {
            const Icon = cat.icon;
            return <Icon className="w-4 h-4" />;
        }
        return <FileText className="w-4 h-4" />;
    };

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">
                                Templates de {type === 'dispatch' ? 'Disparos' : 'Relatórios'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                Selecione um template para usar
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="p-4 border-b border-slate-100 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar templates..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {categories.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCategory(cat.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.value
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Template List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">Nenhum template encontrado</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredTemplates.map(template => (
                                <div
                                    key={template.id}
                                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 cursor-pointer transition-all group"
                                    onClick={() => onSelect(template)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                                            {getCategoryIcon(template.category)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-800 text-sm">
                                                    {template.name}
                                                </h4>
                                                {template.is_default && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold">
                                                        <Star className="w-2.5 h-2.5" />
                                                        Padrão
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-wrap">
                                                {template.content.substring(0, 120)}...
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!template.is_default && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(template.id, template.is_default);
                                                    }}
                                                    className="p-1.5 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                    <p className="text-[10px] text-slate-400 text-center">
                        Clique em um template para usar • Templates personalizados podem ser salvos após criar
                    </p>
                </div>
            </div>
        </div>
    );
};
