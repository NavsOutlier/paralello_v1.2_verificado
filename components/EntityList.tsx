import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { User } from '../types';

interface EntityListProps {
  clients: User[];
  team: User[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const EntityList: React.FC<EntityListProps> = ({ clients, team, selectedId, onSelect }) => {
  const [filter, setFilter] = useState('');

  const renderItem = (user: User) => (
    <div
      key={user.id}
      onClick={() => onSelect(user.id)}
      className={`group flex items-center p-3 cursor-pointer border-l-4 transition-all hover:bg-white/5 relative overflow-hidden ${selectedId === user.id
        ? 'border-cyan-500 bg-cyan-500/10'
        : (user.unreadCount || 0) > 0
          ? 'border-emerald-500 bg-emerald-500/5'
          : 'border-transparent'
        }`}
    >
      {(user.unreadCount || 0) > 0 && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent skew-x-12 animate-slide pointer-events-none" />
      )}
      <div className="relative">
        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
      </div>
      <div className="ml-3 flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline">
          <h4 className={`text-sm font-medium truncate ${selectedId === user.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{user.name}</h4>
          {(user.unreadCount || 0) > 0 && (
            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {user.unreadCount}
            </span>
          )}
        </div>
        {user.jobTitle && (
          <p className="text-[10px] text-cyan-400 font-medium -mt-0.5 mb-0.5 truncate uppercase tracking-tight">
            {user.jobTitle}
          </p>
        )}
        <p className="text-xs text-slate-500 truncate group-hover:text-slate-400">{user.lastMessage}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-xl border-r border-cyan-500/10">
      <div className="p-4 border-b border-cyan-500/10">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-cyan-500/10 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes</div>
        {clients.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())).map(renderItem)}

        <div className="px-4 py-2 mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Equipe</div>
        {team.filter(t => t.name.toLowerCase().includes(filter.toLowerCase())).map(renderItem)}
      </div>
    </div>
  );
};