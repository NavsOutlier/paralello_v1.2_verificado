import React from 'react';
import { MessageSquarePlus, Link as LinkIcon } from 'lucide-react';
import { Message } from '../types';

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  senderName?: string;
  senderJobTitle?: string;
  onInitiateDiscussion?: (msg: Message) => void;
  onNavigateToLinked?: (id: string) => void;
  messageRef?: (el: HTMLDivElement | null) => void;
  colorScheme?: 'green' | 'indigo'; // 'green' for client chat, 'indigo' for task chat
  linkedMessage?: Message;
  linkedMessageSenderName?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isMe,
  senderName,
  senderJobTitle,
  onInitiateDiscussion,
  onNavigateToLinked,
  messageRef,
  colorScheme = 'indigo', // Default to indigo
  linkedMessage,
  linkedMessageSenderName
}) => {
  // Color configurations
  const colors = {
    green: {
      myBubble: 'bg-[#dcf8c6] text-slate-800', // WhatsApp green
      myTime: 'text-slate-500',
      senderName: 'text-emerald-700',
      linkedBg: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
    },
    indigo: {
      myBubble: 'bg-indigo-600 text-white',
      myTime: 'text-indigo-200',
      senderName: 'text-indigo-600',
      linkedBg: 'bg-indigo-700 hover:bg-indigo-800 text-indigo-100'
    }
  };

  const scheme = colors[colorScheme];

  return (
    <div
      ref={messageRef}
      className={`group flex ${isMe ? 'justify-end' : 'justify-start'} transition-all duration-300`}
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
        {linkedMessage && (
          <div className={`mb-2 border-l-[3px] pl-2 py-0.5 rounded-r ${isMe && colorScheme === 'indigo'
              ? 'border-indigo-300 bg-indigo-500/20'
              : 'border-blue-500 bg-blue-50/50'
            }`}>
            <div className={`text-[11px] font-bold mb-0.5 ${isMe && colorScheme === 'indigo' ? 'text-indigo-200' : 'text-blue-600'
              }`}>
              {linkedMessageSenderName || 'Usuário'}
            </div>
            <div className={`text-[11px] line-clamp-2 italic ${isMe && colorScheme === 'indigo' ? 'text-indigo-100/90' : 'text-slate-500'
              }`}>
              {linkedMessage.text}
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

        <p className="whitespace-pre-line">{msg.text}</p>

        <div className={`text-[10px] mt-1 text-right ${isMe && !msg.isInternal ? scheme.myTime : 'text-slate-400'}`}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Hover Action: Create Discussion (Only shown in main chat context) */}
        {onInitiateDiscussion && (
          <button
            onClick={() => onInitiateDiscussion(msg)}
            className="absolute -top-3 -right-3 hidden group-hover:flex items-center justify-center bg-white shadow-md border border-slate-100 rounded-full p-1.5 text-slate-500 hover:text-indigo-600 transition-colors tooltip z-10"
            title="Criar Discussão Interna / Task"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};