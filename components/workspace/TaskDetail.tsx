import React, { useState, useRef, useEffect } from 'react';
import { CornerDownRight, CheckCircle2, Circle, Clock, AlertCircle, User as UserIcon, Loader2, X, Plus } from 'lucide-react';
import { Task, Message, User as UIUser } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { Badge, Button } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

const TAG_COLORS = [
    { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-400' },
    { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
    { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
];

const getTagColor = (tag: string) => {
    const hash = tag.toLowerCase().split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return TAG_COLORS[hash % TAG_COLORS.length];
};

interface TaskDetailProps {
    task: Task;
    messages: Message[];
    onBack: () => void;
    onNavigateToMessage: (msgId: string) => void;
    onAddComment: (text: string) => Promise<void>;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    teamMembers: UIUser[];
    allTasks?: Task[];
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
    task,
    messages,
    onBack,
    onNavigateToMessage,
    onAddComment,
    onUpdateTask,
    teamMembers,
    allTasks = []
}) => {
    const { user: currentUser } = useAuth();
    const [comment, setComment] = useState('');
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const availableTags = Array.from(new Set((allTasks).flatMap(t => t.tags || [])))
        .filter(t => !(task.tags || []).includes(t as string));

    const toggleTag = (tag: string) => {
        const currentTags = task.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        onUpdateTask(task.id, { tags: newTags });
    };

    const handleAddTag = () => {
        const newTag = tagInput.trim();
        if (newTag && !(task.tags || []).includes(newTag)) {
            onUpdateTask(task.id, { tags: [...(task.tags || []), newTag] });
            setTagInput('');
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async () => {
        if (comment && !isAddingComment) {
            try {
                setIsAddingComment(true);
                await onAddComment(comment);
                setComment('');
            } catch (error) {
                console.error('Failed to add comment:', error);
            } finally {
                setIsAddingComment(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="h-14 flex items-center px-4 bg-white border-b border-slate-200">
                <button onClick={onBack} className="mr-3 text-slate-500 hover:text-indigo-600">
                    <CornerDownRight className="w-5 h-5 rotate-180" />
                </button>
                <span className="text-sm font-bold text-slate-800 truncate">Detalhes da Tarefa</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-slate-800 mb-1">{task.title}</h2>
                            <span className="text-xs text-slate-400">ID: {task.id}</span>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <select
                                value={task.status}
                                onChange={(e) => onUpdateTask(task.id, { status: e.target.value as any })}
                                className="text-xs font-bold border rounded px-2 py-1 bg-white focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="todo">A FAZER</option>
                                <option value="in-progress">EM PROGRESSO</option>
                                <option value="review">REVISÃO</option>
                                <option value="done">CONCLUÍDO</option>
                            </select>
                            <Badge
                                variant={task.status === 'done' ? 'success' : task.status === 'todo' ? 'default' : 'warning'}
                                size="sm"
                            >
                                {task.status.toUpperCase()}
                            </Badge>
                        </div>
                    </div>

                    {/* Etiquetas */}
                    <div className="mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Etiquetas</span>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {(task.tags || []).map(tag => {
                                const color = getTagColor(tag);
                                return (
                                    <span
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${color.bg} ${color.text} text-[10px] font-bold rounded-lg cursor-pointer hover:brightness-95 transition-all border border-black/5`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                                        {tag.toUpperCase()}
                                        <X className="w-3 h-3 opacity-40 hover:opacity-100" />
                                    </span>
                                );
                            })}

                            <div className="relative">
                                <button
                                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors border border-dashed border-slate-300"
                                >
                                    <Plus className="w-3 h-3" />
                                    ADICIONAR
                                </button>

                                {isTagDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsTagDropdownOpen(false)} />
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                            <div className="p-2 border-b border-slate-100">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={tagInput}
                                                    onChange={e => setTagInput(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') { handleAddTag(); }
                                                        if (e.key === 'Escape') { setIsTagDropdownOpen(false); }
                                                    }}
                                                    placeholder="Nova tag..."
                                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto p-1 py-1.5">
                                                {availableTags
                                                    .filter(t => (t as string).toLowerCase().includes(tagInput.toLowerCase()))
                                                    .map(tag => {
                                                        const color = getTagColor(tag as string);
                                                        return (
                                                            <button
                                                                key={tag as string}
                                                                onClick={() => {
                                                                    toggleTag(tag as string);
                                                                    setTagInput('');
                                                                    setIsTagDropdownOpen(false);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs text-slate-700 font-bold text-left group"
                                                            >
                                                                <div className={`w-1.5 h-1.5 rounded-full ${color.dot} opacity-40 group-hover:opacity-100`} />
                                                                {tag as string}
                                                            </button>
                                                        );
                                                    })}
                                                {availableTags.length === 0 && !tagInput && (
                                                    <p className="p-2 text-[10px] text-slate-400 text-center italic">Sem sugestões</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Responsável</span>
                            <select
                                value={task.assigneeId || ''}
                                onChange={(e) => onUpdateTask(task.id, { assigneeId: e.target.value || undefined })}
                                className="w-full text-xs border rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="">Sem responsável</option>
                                {teamMembers.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}{m.jobTitle && ` - ${m.jobTitle}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Prazo</span>
                            <input
                                type="date"
                                value={task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''}
                                onChange={(e) => onUpdateTask(task.id, { deadline: e.target.value })}
                                className="w-full text-xs border rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Prioridade</span>
                            <div className="flex items-center h-[31px]">
                                <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'default'} size="sm">
                                    {task.priority.toUpperCase()}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Descrição</span>
                        <textarea
                            value={task.description || ''}
                            onChange={(e) => onUpdateTask(task.id, { description: e.target.value })}
                            placeholder="Adicione uma descrição..."
                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 resize-none h-24"
                        />
                    </div>
                </div>

                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Chat da Tarefa</h3>
                <div className="space-y-3 mb-6">
                    {messages.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma mensagem nesta tarefa.</p>}
                    {messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isMe={msg.senderId === currentUser?.id}
                            senderName={teamMembers.find(t => t.id === msg.senderId)?.name || 'Membro'}
                            onNavigateToLinked={onNavigateToMessage}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex flex-col space-y-2">
                    <textarea
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-20 disabled:opacity-75"
                        placeholder={isAddingComment ? "Enviando..." : "Escreva uma atualização..."}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                        disabled={isAddingComment}
                    />
                    <Button
                        onClick={handleSubmit}
                        disabled={!comment.trim() || isAddingComment}
                        size="md"
                        className="self-end"
                    >
                        {isAddingComment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Enviar
                    </Button>
                </div>
            </div>
        </div >
    );
};
