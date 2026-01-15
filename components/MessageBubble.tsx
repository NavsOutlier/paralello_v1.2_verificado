import React from 'react';
import { MessageSquarePlus, Clock, Link as LinkIcon, Check } from 'lucide-react';
import { Message } from '../types';

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  senderName: string;
  senderJobTitle?: string;
  onInitiateDiscussion?: (message: Message) => void;
  messageRef?: (el: HTMLDivElement | null) => void;
  colorScheme?: 'green' | 'indigo' | 'violet'; // 'green' for client chat, 'indigo' for task chat, 'violet' for 'Me'
  onNavigateToLinked?: (id: string) => void;
  linkedTaskId?: string;
  linkedMessage?: Message;
  linkedMessageSenderName?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isMe: isMeProp,
  senderName,
  senderJobTitle,
  onInitiateDiscussion,
  messageRef,
  colorScheme = 'indigo',
  onNavigateToLinked,
  linkedTaskId,
  linkedMessage,
  linkedMessageSenderName
}) => {
  const isMe = msg.contextType === 'WHATSAPP_FEED' && msg.direction
    ? msg.direction === 'outbound'
    : isMeProp;

  const colors = {
    indigo: {
      myBubble: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.2)] border-none',
      senderName: 'text-indigo-600',
      myTime: 'text-indigo-100',
    },
    green: {
      myBubble: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)] border-none',
      senderName: 'text-emerald-600',
      myTime: 'text-emerald-100',
    },
    violet: {
      myBubble: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.2)] border-none',
      senderName: 'text-violet-600',
      myTime: 'text-violet-100',
    }
  };

  const scheme = colors[colorScheme];

  return (
    <div
      ref={messageRef}
      className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all duration-300 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-500`}
    >
      <div
        id={`msg-${msg.id}`}
        onClick={() => {
          if (linkedTaskId) onNavigateToLinked?.(linkedTaskId);
          else if (msg.linkedMessageId) onNavigateToLinked?.(msg.linkedMessageId);
        }}
        className={`relative w-full px-4 py-2.5 shadow-sm text-[14px] leading-relaxed tracking-tight ${msg.isInternal && colorScheme !== 'indigo'
          ? 'bg-amber-50/80 backdrop-blur-sm border border-amber-200 text-slate-800 rounded-2xl rounded-tr-none'
          : isMe
            ? `${scheme.myBubble} rounded-[1.25rem] rounded-tr-none`
            : colorScheme === 'green'
              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 text-emerald-900 rounded-[1.25rem] rounded-tl-none shadow-sm'
              : 'bg-white border border-slate-100/50 text-slate-800 rounded-[1.25rem] rounded-tl-none shadow-sm'
          } ${(linkedTaskId || msg.linkedMessageId) ? 'cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all' : ''}`}>

        {/* Task Created Marking - Premium Status Style */}
        {linkedTaskId && (
          <div className="mb-2 bg-indigo-50/50 border border-indigo-100/50 rounded-lg p-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center shadow-sm">
                <Clock className="w-3 h-3" />
              </div>
              <span className="text-[9px] font-black tracking-widest uppercase">Sistema Paralello</span>
            </div>
            <span className="text-[8px] font-bold text-indigo-400 bg-white px-1.5 py-0.5 rounded border border-indigo-50">#TAREFA</span>
          </div>
        )}

        {/* Linked Message Quote (Reply Block) - Premium Subtle */}
        {linkedMessage && msg.linkedMessageId && (
          <div className={`mb-2 pl-3 pr-2 py-1.5 border-l-2 rounded-r-lg ${isMe && colorScheme === 'indigo'
            ? 'border-indigo-300 bg-indigo-50/30'
            : 'border-slate-300 bg-slate-50/50'
            }`}>
            <div className={`text-[10px] font-black mb-0.5 ${isMe && colorScheme === 'indigo' ? 'text-indigo-600' : 'text-slate-500'
              }`}>
              {linkedMessageSenderName || 'Usuário'}
            </div>
            <p className="text-[10px] line-clamp-1 leading-snug text-slate-500 font-medium">
              {linkedMessage.text}
            </p>
          </div>
        )}

        {/* Sender Info - High End Look */}
        <div className={`text-[10px] font-black mb-1 flex items-center gap-1 uppercase tracking-tighter ${isMe ? 'justify-end' : 'justify-start'} ${msg.isInternal && colorScheme !== 'indigo'
          ? 'text-amber-700 opacity-80'
          : isMe
            ? 'text-white opacity-100'
            : `${scheme.senderName} opacity-80`
          }`}>
          <span>{senderName}</span>
          {senderJobTitle && <span className={isMe ? 'opacity-70' : 'opacity-40'}>({senderJobTitle})</span>}
        </div>

        <p className={`whitespace-pre-line font-medium ${isMe ? 'text-white' : 'text-slate-700'}`}>{msg.text}</p>

        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/60' : 'opacity-40'}`}>
          <span className="text-[9px] font-bold">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && <Check className="w-2.5 h-2.5" />}
        </div>

        {/* Hover Action: Create Discussion */}
        {onInitiateDiscussion && !linkedTaskId && !msg.isInternal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInitiateDiscussion(msg);
            }}
            className="absolute -top-3 -right-3 hidden group-hover:flex items-center justify-center bg-white shadow-md border border-slate-100 rounded-full p-1.5 text-slate-500 hover:text-indigo-600 transition-colors z-10"
            title="Criar Task desta mensagem"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
