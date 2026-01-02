import React, { useState, useRef, useEffect } from 'react';
import {
    ArrowLeft, Zap, Pencil, Archive, ChevronDown,
    Calendar, CheckSquare, MessageSquare, Plus,
    X, Paperclip, Send, Loader2
} from 'lucide-react';
import { Task, Message, User as UIUser } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { MessageBubble } from '../MessageBubble';

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

            <div className="flex-1 overflow-y-auto bg-[#efeae2]">
                <div className="p-4 pb-10 space-y-3">
                    {/* Title & Tags Row */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
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

                    <div className="h-[1px] bg-white/50 w-full" />

                    {/* Metrics Bar */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap bg-white p-3 rounded-xl shadow-sm border border-slate-100">
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

                    {/* Chat Messages - WhatsApp Style */}
                    <div className="space-y-3">
                        {messages.length === 0 && (
                            <div className="text-center py-8">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-[11px] text-slate-400 italic">Nenhuma mensagem ainda...</p>
                            </div>
                        )}
                        {messages.map((msg) => {
                            const sender = teamMembers.find(t => t.id === msg.senderId);
                            return (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    isMe={msg.senderId === currentUser?.id}
                                    senderName={sender?.name || 'Membro'}
                                    senderJobTitle={sender?.jobTitle}
                                />
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>

            {/* Input Area - ChatArea Style */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex items-center space-x-4">
                    <button className="text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled={isAddingComment}>
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-75"
                        placeholder={isAddingComment ? "Enviando..." : "Digite uma mensagem..."}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { handleSubmit(); } }}
                        disabled={isAddingComment}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!comment.trim() || isAddingComment}
                        className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
                    >
                        {isAddingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

