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
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isMe,
  senderName,
  senderJobTitle,
  onInitiateDiscussion,
  onNavigateToLinked,
  messageRef,
  colorScheme = 'indigo' // Default to indigo
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
      <div className={`relative max-w-[85%] rounded-lg p-3 shadow-sm text-sm ${msg.isInternal
        ? 'bg-yellow-50 border border-yellow-200 text-slate-800'
        : isMe
          ? scheme.myBubble
          : 'bg-white text-slate-800'
        }`}>
        {/* Sender Name */}
        {!isMe && (
          <div className={`text-[10px] font-bold mb-1 ${msg.isInternal ? 'text-yellow-700' : scheme.senderName} flex items-center gap-1`}>
            <span>{senderName}</span>
            {senderJobTitle && <span className="opacity-60 font-normal">({senderJobTitle})</span>}
            {msg.isInternal && <span className="text-[8px] opacity-75">(INTERNO)</span>}
          </div>
        )}

        <p>{msg.text}</p>

        {/* Linked Message Preview (e.g. "Replying to...") */}
        {msg.linkedMessageId && (
          <div
            onClick={() => onNavigateToLinked?.(msg.linkedMessageId!)}
            className={`mt-2 p-2 rounded text-[10px] cursor-pointer transition-colors flex items-center gap-2 ${msg.isInternal ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' : scheme.linkedBg
              }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Ver mensagem original de contexto</span>
          </div>
        )}

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