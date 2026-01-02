import React, { useState, useRef, useEffect } from 'react';
import {
    ArrowLeft, Zap, Pencil, Archive, ChevronDown,
    Calendar, CheckSquare, MessageSquare, Plus,
    X, Smile, Paperclip, Send, Loader2
} from 'lucide-react';
import { Task, Message, User as UIUser } from '../../types';
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

const statusConfig = {
    'done': { label: 'APROVADO', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    'in-progress': { label: 'EM PROGRESSO', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    'todo': { label: 'PENDENTE', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
    'review': { label: 'REVISÃO', color: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50' },
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

    const config = statusConfig[task.status] || statusConfig.todo;

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

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        const day = d.getDate();
        const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        return `${day} de ${month.toLowerCase()}.`;
    };

    const assignee = teamMembers.find(m => m.id === task.assigneeId);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Ultra Compact Premium Header */}
            <div className="h-[46px] flex items-center justify-between px-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1 hover:bg-slate-50 rounded-lg transition-colors">
                        <ArrowLeft className="w-4 h-4 text-slate-500" />
                    </button>
                    <div className="flex items-center gap-4 border-l border-slate-100 pl-4">
                        <button className="text-[#fab005] hover:scale-110 transition-transform">
                            <Zap className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button className="text-[#4c6ef5] hover:scale-110 transition-transform">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button className="text-slate-400 hover:scale-110 transition-transform">
                            <Archive className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="h-4 w-[1px] bg-slate-100 mr-1" />
                    <div className={`flex items-center gap-2 px-2.5 py-1 ${config.bg} rounded-xl border border-black/[0.03] cursor-pointer`}>
                        <span className={`text-[9px] font-black tracking-tight ${config.text}`}>{config.label}</span>
                        <ChevronDown className={`w-3 h-3 ${config.text} opacity-50`} />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 pb-10">
                    {/* Title & Tags Row */}
                    <div className="mb-4">
                        <h2 className="text-[17px] font-black text-slate-800 leading-tight mb-2.5">
                            {task.title}
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                            {(task.tags || []).map(tag => {
                                const color = getTagColor(tag);
                                return (
                                    <span
                                        key={tag}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 ${color.bg} ${color.text} text-[8px] font-bold rounded-md border border-black/5`}
                                    >
                                        <X className="w-2 h-2 cursor-pointer hover:opacity-50" onClick={() => toggleTag(tag)} />
                                        {tag}
                                    </span>
                                );
                            })}
                            <button
                                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-400 text-[9px] font-bold rounded-full border border-dashed border-slate-200 hover:border-slate-300 transition-all uppercase"
                            >
                                <Plus className="w-2 h-2" />
                                Tag
                            </button>
                        </div>
                    </div>

                    <div className="h-[1px] bg-slate-50 w-full mb-5" />

                    {/* Metrics Bar - Combined and tighter */}
                    <div className="flex items-center gap-2 mb-6 flex-wrap">
                        {/* Deadline card */}
                        <div className="bg-[#fff5f5] h-7.5 px-2 rounded-lg border border-[#ffc9c9]/30 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-[#e03131]" />
                            <span className="text-[#e03131] text-[10px] font-bold">{task.deadline ? formatDate(task.deadline) : 'Sem prazo'}</span>
                        </div>

                        {/* Assignee card */}
                        <div className="bg-slate-50 h-7.5 px-2 rounded-lg border border-slate-100 flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-200">
                                {assignee?.avatar ? (
                                    <img src={assignee.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[7px] text-slate-400 font-bold">?</div>
                                )}
                            </div>
                            <span className="text-slate-600 text-[10px] font-bold">{assignee?.name || 'Vago'}</span>
                        </div>

                        {/* Checklist card */}
                        <div className="bg-white h-7.5 px-2 rounded-lg border border-slate-100 flex items-center gap-1.5 shadow-sm shadow-black/[0.02]">
                            <CheckSquare className="w-3 h-3 text-indigo-500" />
                            <span className="text-slate-400 text-[10px] font-bold">Checklist <span className="text-indigo-500">(1/3)</span></span>
                        </div>
                    </div>

                    {/* Internal Discussion */}
                    <div className="border-t border-slate-50 pt-4">
                        <div className="flex items-center gap-2 mb-4 text-slate-400">
                            <MessageSquare className="w-3 h-3" />
                            <h3 className="text-[9px] font-black tracking-widest uppercase opacity-70">Discussão Interna</h3>
                        </div>

                        <div className="space-y-2.5">
                            {messages.length === 0 && (
                                <p className="text-[10px] text-slate-300 italic">Nenhum comentário...</p>
                            )}
                            {messages.map((msg) => {
                                const sender = teamMembers.find(t => t.id === msg.senderId);
                                return (
                                    <div key={msg.id} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.01)] max-w-[95%]">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <span className="text-[10px] font-black text-slate-700">
                                                {sender?.name || 'Membro'} <span className="text-slate-400 font-bold opacity-60 ml-0.5">({sender?.jobTitle || 'Equipe'})</span>
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-300">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-normal font-medium">
                                            {msg.text}
                                        </p>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Input Area - even more compact */}
            <div className="p-3 border-t border-slate-100/60 bg-white">
                <div className="relative bg-[#f1f3f5]/40 rounded-xl border border-slate-100">
                    <textarea
                        className="w-full bg-transparent p-3 pb-10 text-[11.5px] text-slate-600 placeholder:text-slate-300 focus:outline-none resize-none min-h-[40px] font-medium"
                        placeholder="Comentário interno..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                        disabled={isAddingComment}
                    />
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                        <Smile className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
                        <Paperclip className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
                    </div>
                    <div className="absolute bottom-2 right-2">
                        <button
                            onClick={handleSubmit}
                            disabled={!comment.trim() || isAddingComment}
                            className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all ${comment.trim() && !isAddingComment
                                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                : 'bg-slate-100 text-slate-300'
                                }`}
                        >
                            {isAddingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

