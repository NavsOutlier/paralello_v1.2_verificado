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
      className={`flex items-center p-3 cursor-pointer border-l-4 transition-all hover:bg-slate-50 ${
        selectedId === user.id
          ? 'border-indigo-600 bg-indigo-50/50'
          : 'border-transparent'
      }`}
    >
      <div className="relative">
        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
          user.status === 'online' ? 'bg-green-500' : user.status === 'busy' ? 'bg-red-500' : 'bg-slate-400'
        }`}></span>
      </div>
      <div className="ml-3 flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline">
          <h4 className="text-sm font-medium text-slate-800 truncate">{user.name}</h4>
          {user.unreadCount && user.unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {user.unreadCount}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{user.lastMessage || '...'}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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