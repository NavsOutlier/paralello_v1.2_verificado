import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User as UIUser } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    teamMembers: UIUser[];
    onSubmit?: () => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    multiline?: boolean;
    autoFocus?: boolean;
}

export interface MentionInputRef {
    focus: () => void;
}

export const MentionInput = React.forwardRef<MentionInputRef, MentionInputProps>(({
    value,
    onChange,
    teamMembers,
    onSubmit,
    placeholder = "Digite uma mensagem...",
    disabled = false,
    className = "",
    multiline = false,
    autoFocus = false
}, ref) => {
    const { user } = useAuth();
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => ({
        focus: () => {
            inputRef.current?.focus();
        }
    }));

    const filteredMembers = useMemo(() => {
        if (mentionQuery === null) return [];
        return teamMembers
            .filter(m => m.id !== user?.id) // Filter out current user
            .filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
            .slice(0, 5);
    }, [mentionQuery, teamMembers, user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        onChange(val);

        const selectionEnd = e.target.selectionEnd || 0;
        const textBeforeCursor = val.slice(0, selectionEnd);
        const lastWord = textBeforeCursor.split(/\s+/).pop();

        if (lastWord && lastWord.startsWith('@')) {
            setMentionQuery(lastWord.slice(1));
            setMentionIndex(0);
        } else {
            setMentionQuery(null);
        }
    };

    const selectMember = (member: UIUser) => {
        const selectionEnd = (document.activeElement as any)?.selectionEnd || value.length;
        const textBeforeCursor = value.slice(0, selectionEnd);
        const textAfterCursor = value.slice(selectionEnd);

        const lastWordRegex = /@\w*$/;
        const newTextBefore = textBeforeCursor.replace(lastWordRegex, `@${member.name} `);

        onChange(newTextBefore + textAfterCursor);
        setMentionQuery(null);
        // Ideally we would set cursor position here but React state async makes it tricky without refs
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (mentionQuery !== null && filteredMembers.length > 0) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => Math.min(filteredMembers.length - 1, prev + 1));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectMember(filteredMembers[mentionIndex]);
            } else if (e.key === 'Escape') {
                setMentionQuery(null);
            }
        } else if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {mentionQuery !== null && filteredMembers.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-[10px] uppercase text-slate-400 font-bold">
                        <span>Sugestões</span>
                        <span>TAB para selecionar</span>
                    </div>
                    {filteredMembers.map((member, idx) => (
                        <button
                            key={member.id}
                            onClick={() => selectMember(member)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 ${idx === mentionIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                        >
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                                {member.avatar ? (
                                    <img src={member.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">
                                        {member.name.slice(0, 1)}
                                    </div>
                                )}
                            </div>
                            {member.name}
                        </button>
                    ))}
                </div>
            )}

            {multiline ? (
                <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={className}
                    disabled={disabled}
                    autoFocus={autoFocus}
                />
            ) : (
                <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={className}
                    disabled={disabled}
                    autoFocus={autoFocus}
                />
            )}
        </div>
    );
});
