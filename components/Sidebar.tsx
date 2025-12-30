import React from 'react';
import { LayoutDashboard, MessageSquare, KanbanSquare, Users } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => onViewChange(view)}
      className={`flex flex-col items-center justify-center w-full py-4 space-y-1 transition-colors ${
        currentView === view 
          ? 'text-indigo-600 bg-indigo-50 border-r-4 border-indigo-600' 
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
      title={label}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <nav className="w-[80px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-6 z-20 shadow-sm">
      <div className="mb-8 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-xl">
        P
      </div>
      
      <div className="flex-1 w-full space-y-2">
        <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dash" />
        <NavItem view={ViewState.WORKSPACE} icon={MessageSquare} label="Workspace" />
        <NavItem view={ViewState.KANBAN} icon={KanbanSquare} label="Tarefas" />
        <NavItem view={ViewState.MANAGER} icon={Users} label="Manager" />
      </div>

      <div className="mt-auto mb-4">
        <img 
          src="https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff" 
          className="w-10 h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all" 
          alt="Profile" 
        />
      </div>
    </nav>
  );
};