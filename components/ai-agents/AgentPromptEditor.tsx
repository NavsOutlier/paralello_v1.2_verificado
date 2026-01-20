import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    FileText, Plus, Save, X, History, RefreshCw, CheckCircle,
    AlertCircle, Clock, ChevronRight, ChevronDown, Trash2, Edit2,
    RotateCcw
} from 'lucide-react';
import { AIAgentPromptSection, AIAgentPromptHistory } from '../../types/ai-agents';

interface AgentPromptEditorProps {
    agentId: string;
    onSave?: () => void;
}

export const AgentPromptEditor: React.FC<AgentPromptEditorProps> = ({
    agentId,
    onSave
}) => {
    const { user } = useAuth();
    const [sections, setSections] = useState<AIAgentPromptSection[]>([]);
    const [selectedSection, setSelectedSection] = useState<AIAgentPromptSection | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<AIAgentPromptHistory[]>([]);
    const [showNewSection, setShowNewSection] = useState(false);
    const [newSectionKey, setNewSectionKey] = useState('');
    const [newSectionName, setNewSectionName] = useState('');

    // Fetch sections
    useEffect(() => {
        const fetchSections = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('ai_agent_prompt_sections')
                .select('*')
                .eq('agent_id', agentId)
                .eq('is_active', true)
                .order('section_order');

            if (error) {
                console.error('Error fetching sections:', error);
            } else {
                setSections(data || []);
                if (data && data.length > 0 && !selectedSection) {
                    setSelectedSection(data[0]);
                    setEditedContent(data[0].content);
                }
            }
            setLoading(false);
        };

        fetchSections();
    }, [agentId]);

    // Fetch history when section changes
    useEffect(() => {
        const fetchHistory = async () => {
            if (!selectedSection) return;

            const { data, error } = await supabase
                .from('ai_agent_prompt_history')
                .select('*')
                .eq('section_id', selectedSection.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error) {
                setHistory(data || []);
            }
        };

        if (showHistory) {
            fetchHistory();
        }
    }, [selectedSection, showHistory]);

    const handleSectionSelect = (section: AIAgentPromptSection) => {
        if (editedContent !== selectedSection?.content) {
            if (!confirm('Você tem alterações não salvas. Deseja descartar?')) {
                return;
            }
        }
        setSelectedSection(section);
        setEditedContent(section.content);
        setShowHistory(false);
    };

    const handleSave = async () => {
        if (!selectedSection) return;
        setSaving(true);

        const { error } = await supabase
            .from('ai_agent_prompt_sections')
            .update({
                content: editedContent,
                sync_status: 'pending'
            })
            .eq('id', selectedSection.id);

        if (error) {
            console.error('Error saving section:', error);
            alert('Erro ao salvar seção');
        } else {
            // Update local state
            setSections(sections.map(s =>
                s.id === selectedSection.id
                    ? { ...s, content: editedContent, sync_status: 'pending' as const }
                    : s
            ));
            setSelectedSection({
                ...selectedSection,
                content: editedContent,
                sync_status: 'pending'
            });

            // Trigger sync
            await handleSync();
            onSave?.();
        }
        setSaving(false);
    };

    const handleSync = async () => {
        if (!selectedSection) return;
        setSyncing(true);

        try {
            const response = await supabase.functions.invoke('sync-agent-prompt', {
                body: { section_id: selectedSection.id }
            });

            if (response.error) {
                throw response.error;
            }

            // Refresh section status
            const { data } = await supabase
                .from('ai_agent_prompt_sections')
                .select('*')
                .eq('id', selectedSection.id)
                .single();

            if (data) {
                setSections(sections.map(s => s.id === data.id ? data : s));
                setSelectedSection(data);
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('Erro ao sincronizar com o agente');
        }

        setSyncing(false);
    };

    const handleCreateSection = async () => {
        if (!newSectionKey || !newSectionName) {
            alert('Preencha todos os campos');
            return;
        }

        const { data, error } = await supabase
            .from('ai_agent_prompt_sections')
            .insert({
                agent_id: agentId,
                section_key: newSectionKey.toLowerCase().replace(/\s+/g, '_'),
                section_name: newSectionName,
                section_order: sections.length,
                content: '',
                content_format: 'markdown'
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating section:', error);
            alert('Erro ao criar seção');
        } else {
            setSections([...sections, data]);
            setSelectedSection(data);
            setEditedContent('');
            setShowNewSection(false);
            setNewSectionKey('');
            setNewSectionName('');
        }
    };

    const handleDeleteSection = async (section: AIAgentPromptSection) => {
        if (section.is_required) {
            alert('Esta seção é obrigatória e não pode ser excluída');
            return;
        }

        if (!confirm(`Tem certeza que deseja excluir a seção "${section.section_name}"?`)) {
            return;
        }

        const { error } = await supabase
            .from('ai_agent_prompt_sections')
            .update({ is_active: false })
            .eq('id', section.id);

        if (error) {
            console.error('Error deleting section:', error);
            alert('Erro ao excluir seção');
        } else {
            setSections(sections.filter(s => s.id !== section.id));
            if (selectedSection?.id === section.id) {
                setSelectedSection(sections[0] || null);
                setEditedContent(sections[0]?.content || '');
            }
        }
    };

    const handleRestoreVersion = async (historyItem: AIAgentPromptHistory) => {
        if (!confirm('Deseja restaurar esta versão? O conteúdo atual será substituído.')) {
            return;
        }

        setEditedContent(historyItem.content);
        setShowHistory(false);
    };

    const getSyncStatusBadge = (status: string) => {
        switch (status) {
            case 'synced':
                return (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Sincronizado
                    </span>
                );
            case 'pending':
                return (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Pendente
                    </span>
                );
            case 'error':
                return (
                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Erro
                    </span>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-280px)] bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Sections List */}
            <div className="w-64 border-r border-slate-200 flex flex-col">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-slate-700 text-sm">Seções do Prompt</h4>
                    <button
                        onClick={() => setShowNewSection(true)}
                        className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors"
                        title="Nova Seção"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sections.map(section => (
                        <div
                            key={section.id}
                            className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedSection?.id === section.id
                                    ? 'bg-indigo-50 border border-indigo-200'
                                    : 'hover:bg-slate-50'
                                }`}
                            onClick={() => handleSectionSelect(section)}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText className={`w-4 h-4 flex-shrink-0 ${selectedSection?.id === section.id ? 'text-indigo-600' : 'text-slate-400'
                                    }`} />
                                <span className={`text-sm truncate ${selectedSection?.id === section.id ? 'text-indigo-700 font-medium' : 'text-slate-600'
                                    }`}>
                                    {section.section_name}
                                </span>
                            </div>
                            {!section.is_required && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSection(section);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}

                    {sections.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            Nenhuma seção criada
                        </div>
                    )}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col">
                {selectedSection ? (
                    <>
                        {/* Editor Header */}
                        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h4 className="font-bold text-slate-700">{selectedSection.section_name}</h4>
                                {getSyncStatusBadge(selectedSection.sync_status)}
                                {selectedSection.last_sync_error && (
                                    <span className="text-xs text-red-500" title={selectedSection.last_sync_error}>
                                        Ver erro
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${showHistory
                                            ? 'bg-purple-100 text-purple-600'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <History className="w-4 h-4" />
                                    Histórico
                                </button>
                                <button
                                    onClick={handleSync}
                                    disabled={syncing || selectedSection.sync_status === 'synced'}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                    Sincronizar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || editedContent === selectedSection.content}
                                    className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 flex overflow-hidden">
                            <div className="flex-1 p-4">
                                <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    placeholder="Digite o conteúdo da seção aqui... (Markdown suportado)"
                                    className="w-full h-full p-4 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm"
                                />
                            </div>

                            {/* History Panel */}
                            {showHistory && (
                                <div className="w-80 border-l border-slate-200 overflow-y-auto bg-slate-50">
                                    <div className="p-3 border-b border-slate-200 bg-white sticky top-0">
                                        <h5 className="font-bold text-slate-700 text-sm">Histórico de Versões</h5>
                                    </div>
                                    <div className="p-2 space-y-2">
                                        {history.map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-white p-3 rounded-lg border border-slate-200"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(item.created_at).toLocaleString('pt-BR')}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRestoreVersion(item)}
                                                        className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        Restaurar
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-600 line-clamp-3 font-mono">
                                                    {item.content.substring(0, 150)}...
                                                </p>
                                            </div>
                                        ))}
                                        {history.length === 0 && (
                                            <p className="text-center text-slate-400 text-sm py-8">
                                                Nenhum histórico disponível
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <div className="text-center">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p>Selecione ou crie uma seção para editar</p>
                        </div>
                    </div>
                )}
            </div>

            {/* New Section Modal */}
            {showNewSection && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="font-bold text-lg mb-4">Nova Seção de Prompt</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Chave (identificador)
                                </label>
                                <input
                                    type="text"
                                    value={newSectionKey}
                                    onChange={(e) => setNewSectionKey(e.target.value)}
                                    placeholder="Ex: product_info"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nome de Exibição
                                </label>
                                <input
                                    type="text"
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    placeholder="Ex: Informações de Produtos"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowNewSection(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateSection}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Criar Seção
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentPromptEditor;
