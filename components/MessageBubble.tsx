import React from 'react';
import { MessageSquarePlus, Link as LinkIcon, Check } from 'lucide-react';
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
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isMe,
  senderName,
  senderJobTitle,
  onInitiateDiscussion,
  messageRef,
  colorScheme = 'indigo', // Default to indigo
  onNavigateToLinked,
  linkedTaskId
}) => {
  // Color configurations
  const colors = {
    indigo: {
      myBubble: 'bg-indigo-600 text-white',
      senderName: 'text-indigo-900',
      myTime: 'text-indigo-100',
    },
    green: {
      myBubble: 'bg-emerald-600 text-white',
      senderName: 'text-emerald-900',
      myTime: 'text-emerald-100',
    }
  };

  const scheme = colors[colorScheme];

  // Mock lookup for linked message (visual only)
  const linkedMessage = msg.linkedMessageId ? { text: "Mensagem original..." } : null;

  // If this message created a task, we render a special card design
  if (linkedTaskId) {
    return (
      <div
        ref={messageRef}
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all duration-300 mb-2`}
      >
        <div
          onClick={() => onNavigateToLinked?.(linkedTaskId)}
          className={`
            relative max-w-[85%] rounded-r-lg rounded-bl-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-white
            border-l-[4px] border-cyan-500
          `}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-cyan-50 rounded-full flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-cyan-500 font-bold" strokeWidth={3} />
            </div>
            <span className="text-[10px] font-bold text-cyan-600 tracking-wider uppercase">TAREFA CRIADA</span>
          </div>

          {/* Linked Message Context (if any) */}
          {linkedMessage && msg.linkedMessageId && (
            <div className="mb-2 border-l-[3px] border-slate-200 pl-2 py-0.5">
              <div className="text-[10px] text-slate-500 italic">Mensagem Vinculada</div>
            </div>
          )}

          {/* Main Content */}
          <p className="whitespace-pre-line leading-relaxed text-slate-700 text-sm">{msg.text.replace('Tarefa Criada: ', '')}</p>

          {/* Timestamp */}
          <div className="text-[10px] mt-1 text-right text-slate-400">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messageRef}
      className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all duration-300 mb-2`}
    >
      <div
        onClick={() => msg.linkedMessageId && onNavigateToLinked?.(msg.linkedMessageId)}
        className={`relative max-w-[85%] rounded-lg p-3 shadow-sm text-sm ${
          // Only show yellow background for internal messages if we are NOT in the task chat (indigo scheme)
          msg.isInternal && colorScheme !== 'indigo'
            ? 'bg-yellow-50 border border-yellow-200 text-slate-800'
            : isMe
              ? scheme.myBubble
              : 'bg-white text-slate-800'
          } ${msg.linkedMessageId ? 'cursor-pointer hover:opacity-90 active:scale-[0.98] transition-transform' : ''}`}>

        {/* Linked Message Quote (Reply Block) */}
        {linkedMessage && msg.linkedMessageId && (
          <div className={`mb-2 border-l-[3px] pl-2 py-0.5 rounded-r ${isMe && colorScheme === 'indigo'
            ? 'border-indigo-300 bg-indigo-500/20'
            : 'border-blue-500 bg-blue-50/50'
            }`}>
            <div className={`text-[11px] font-bold mb-0.5 ${isMe && colorScheme === 'indigo' ? 'text-indigo-200' : 'text-blue-600'
              }`}>
              Mensagem Vinculada
            </div>
          </div>
        )}

        {/* Sender Name */}
        {!isMe && (
          <div className={`text-[10px] font-bold mb-1 ${msg.isInternal && colorScheme !== 'indigo' ? 'text-yellow-700' : scheme.senderName} flex items-center gap-1`}>
            <span>{senderName}</span>
            {senderJobTitle && <span className="opacity-60 font-normal">({senderJobTitle})</span>}
            {msg.isInternal && colorScheme !== 'indigo' && <span className="text-[8px] opacity-75">(INTERNO)</span>}
          </div>
        )}

        <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

        <div className={`text-[10px] mt-1 text-right ${isMe && !msg.isInternal ? scheme.myTime : 'text-slate-400'}`}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Hover Action: Create Discussion (Only shown in main chat context AND if not already a task) */}
        {onInitiateDiscussion && !linkedTaskId && !msg.isInternal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInitiateDiscussion(msg);
            }}
            className="absolute -top-3 -right-3 hidden group-hover:flex items-center justify-center bg-white shadow-md border border-slate-100 rounded-full p-1.5 text-slate-500 hover:text-indigo-600 transition-colors tooltip z-10"
            title="Criar Task desta mensagem"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};