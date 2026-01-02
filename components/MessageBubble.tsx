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
  linkedMessage?: Message; // Restored
  linkedMessageSenderName?: string; // Restored
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isMe: isMeProp,
  senderName,
  senderJobTitle,
  onInitiateDiscussion,
  messageRef,
  colorScheme = 'indigo', // Default to indigo
  onNavigateToLinked,
  linkedTaskId,
  linkedMessage, // Restored
  linkedMessageSenderName // Restored
}) => {
  // Logic for positioning: 
  // 1. If it's a WhatsApp message with direction, use that
  // 2. Otherwise use the isMe prop
  const isMe = msg.contextType === 'WHATSAPP_FEED' && msg.direction
    ? msg.direction === 'outbound'
    : isMeProp;
  // Color configurations
  const colors = {
    indigo: {
      myBubble: 'bg-white border border-indigo-100 text-slate-800 shadow-sm', // Cleaner, light look
      senderName: 'text-indigo-600',
      myTime: 'text-slate-400',
    },
    green: {
      myBubble: 'bg-[#e7ffdb] text-slate-800', // Lighter WhatsApp green
      senderName: 'text-emerald-700',
      myTime: 'text-slate-500',
    }
  };

  const scheme = colors[colorScheme];

  // If this message created a task, we render a special card design
  const isTaskCreation = linkedTaskId || msg.text.startsWith('Tarefa Criada:');

  if (isTaskCreation) {
    return (
      <div
        ref={messageRef}
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all duration-300 mb-1`}
      >
        <div
          onClick={() => onNavigateToLinked?.(linkedTaskId)}
          className={`
            relative max-w-[85%] rounded-r-lg rounded-bl-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-white
            border-l-[4px] border-emerald-600
          `}
        >
          {/* Header */}
          <div className="mb-1.5">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-md">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-emerald-600 font-bold" strokeWidth={3} />
              </div>
              <span className="text-[9px] font-bold text-emerald-700 tracking-wider uppercase">TAREFA CRIADA</span>
            </div>
          </div>

          {/* Sender Name */}
          {!isMe && (
            <div className="text-[10px] font-bold mb-1 text-slate-600 flex items-center gap-1">
              <span>{senderName}</span>
              {senderJobTitle && <span className="opacity-60 font-normal">({senderJobTitle})</span>}
            </div>
          )}

          {/* Linked Message Context (if any) */}
          {linkedMessage && msg.linkedMessageId && (
            <div className="mb-1.5 border-l-[2px] border-slate-200 pl-2 py-0.5">
              <div className="text-[9px] text-slate-500 italic">Mensagem Vinculada</div>
            </div>
          )}

          {/* Main Content */}
          <p className="whitespace-pre-line leading-snug text-slate-700 text-xs">{msg.text.replace('Tarefa Criada: ', '')}</p>

          {/* Timestamp */}
          <div className="text-[9px] mt-0.5 text-right text-slate-400">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messageRef}
      className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all duration-300 mb-1`}
    >
      <div
        onClick={() => msg.linkedMessageId && onNavigateToLinked?.(msg.linkedMessageId)}
        className={`relative max-w-[85%] rounded-lg px-3 py-1.5 shadow-sm text-sm ${
          // Internal message handling
          msg.isInternal && colorScheme !== 'indigo'
            ? 'bg-yellow-50 border border-yellow-200 text-slate-800'
            : isMe
              ? scheme.myBubble
              : 'bg-white text-slate-800'
          } ${msg.linkedMessageId ? 'cursor-pointer hover:opacity-90 active:scale-[0.98] transition-transform' : ''}`}>

        {/* Linked Message Quote (Reply Block) */}
        {linkedMessage && msg.linkedMessageId && (
          <div className={`mb-1 pl-3 pr-2 py-2 border-l-[3px] rounded-bl-md ${isMe && colorScheme === 'indigo'
            ? 'border-indigo-400 bg-indigo-50/50' // Distinct but light for internal
            : 'border-cyan-500 bg-slate-50' // Standard
            }`}>
            <div className={`text-[10px] font-bold mb-1 ${isMe && colorScheme === 'indigo' ? 'text-indigo-600' : 'text-cyan-600'
              }`}>
              {linkedMessageSenderName || 'Usuário'}
            </div>
            <p className={`text-[10px] line-clamp-2 leading-snug ${isMe && colorScheme === 'indigo' ? 'text-slate-600' : 'text-slate-600'
              }`}>
              {linkedMessage.text}
            </p>
          </div>
        )}

        {/* Sender Name */}
        {!isMe && (
          <div className={`text-[10px] font-bold mb-0.5 ${msg.isInternal && colorScheme !== 'indigo' ? 'text-yellow-700' : scheme.senderName} flex items-center gap-1`}>
            <span>{senderName}</span>
            {senderJobTitle && <span className="opacity-60 font-normal">({senderJobTitle})</span>}
            {msg.isInternal && colorScheme !== 'indigo' && <span className="text-[8px] opacity-75">(INTERNO)</span>}
          </div>
        )}

        <p className="whitespace-pre-line leading-snug">{msg.text}</p>

        <div className={`text-[9px] mt-0.5 text-right ${isMe && !msg.isInternal ? scheme.myTime : 'text-slate-400'}`}>
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