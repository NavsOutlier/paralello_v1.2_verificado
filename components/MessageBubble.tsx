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
  colorScheme?: 'green' | 'indigo'; // 'green' for client chat, 'indigo' for task chat
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
      myBubble: 'bg-white border border-indigo-100 text-slate-800 shadow-sm',
      senderName: 'text-indigo-600',
      myTime: 'text-slate-400',
    },
    green: {
      myBubble: 'bg-[#e7ffdb] text-slate-800',
      senderName: 'text-emerald-700',
      myTime: 'text-slate-500',
    }
  };

  const scheme = colors[colorScheme];

  return (
    <div
      ref={messageRef}
      className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all duration-300 mb-1`}
    >
      <div
        id={`msg-${msg.id}`}
        onClick={() => {
          if (linkedTaskId) onNavigateToLinked?.(linkedTaskId);
          else if (msg.linkedMessageId) onNavigateToLinked?.(msg.linkedMessageId);
        }}
        className={`relative max-w-[85%] rounded-lg px-3 py-1.5 shadow-sm text-sm ${msg.isInternal && colorScheme !== 'indigo'
          ? 'bg-amber-50 border border-amber-200 text-slate-800'
          : isMe
            ? scheme.myBubble
            : 'bg-white border border-slate-100 text-slate-800'
          } ${(linkedTaskId || msg.linkedMessageId) ? 'cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all' : ''}`}>

        {/* Task Created Marking (Title on derived message) */}
        {linkedTaskId && (
          <div className="mb-2 border-b border-indigo-100 pb-1.5">
            <div className="flex items-center gap-2 text-indigo-600">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold tracking-wider uppercase">TAREFA CRIADA</span>
            </div>
          </div>
        )}

        {/* Linked Message Quote (Reply Block) */}
        {linkedMessage && msg.linkedMessageId && (
          <div className={`mb-1 pl-3 pr-2 py-2 border-l-[3px] rounded-bl-md ${isMe && colorScheme === 'indigo'
            ? 'border-indigo-400 bg-indigo-50/50'
            : 'border-cyan-500 bg-slate-50'
            }`}>
            <div className={`text-[10px] font-bold mb-1 ${isMe && colorScheme === 'indigo' ? 'text-indigo-600' : 'text-cyan-600'
              }`}>
              {linkedMessageSenderName || 'Usuário'}
            </div>
            <p className="text-[10px] line-clamp-2 leading-snug text-slate-600">
              {linkedMessage.text}
            </p>
          </div>
        )}

        {/* Sender Info - Always show as requested */}
        <div className={`text-[10px] font-bold mb-1 ${msg.isInternal && colorScheme !== 'indigo' ? 'text-amber-700' : scheme.senderName} flex items-center gap-1`}>
          <span>{senderName}</span>
          {senderJobTitle && <span className="opacity-60 font-normal">({senderJobTitle})</span>}
          {msg.isInternal && colorScheme !== 'indigo' && <span className="text-[8px] opacity-75">(INTERNO)</span>}
        </div>

        <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

        <div className={`text-[9px] mt-1 text-right ${isMe && !msg.isInternal ? scheme.myTime : 'text-slate-400'}`}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
