import React from 'react';
import { LayoutDashboard, MessageSquare, KanbanSquare, Users, LogOut, Shield, BarChart3, Zap, Briefcase } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, NotificationCenter } from './ui';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { signOut, user, isSuperAdmin, isManager, permissions } = useAuth();

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => onViewChange(view)}
      className={`flex flex-col items-center justify-center w-full py-4 space-y-1 transition-all relative group ${currentView === view
        ? 'text-violet-400'
        : 'text-slate-500 hover:text-slate-300'
        }`}
      title={label}
    >
      {currentView === view && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-r-lg" />
      )}
      <Icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${currentView === view ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}`} />
      <span className={`text-[10px] font-bold tracking-tight ${currentView === view ? 'text-white' : ''}`}>{label}</span>
    </button>
  );

  return (
    <nav className="w-[80px] flex-shrink-0 bg-slate-900/40 backdrop-blur-xl border-r border-cyan-500/10 flex flex-col items-center py-6 z-20 overflow-y-auto overflow-x-hidden custom-scrollbar">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="w-16 h-16 flex items-center justify-center">
          <img src="/blackback-icon-nobg.png" alt="Blackback Icon" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]" />
        </div>
        <img src="/blackback-text-nobg.png" alt="Blackback" className="w-16 h-auto object-contain opacity-90" />
      </div>

      <div className="flex-1 w-full space-y-3">
        {!isSuperAdmin && (
          <>
            {/* Dashboard - Only for managers */}
            {isManager && (
              <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dash" />
            )}

            <NavItem view={ViewState.WORKSPACE} icon={MessageSquare} label="Chats" />
            <NavItem view={ViewState.KANBAN} icon={KanbanSquare} label="Tarefas" />
            <NavItem view={ViewState.MARKETING} icon={BarChart3} label="Metas" />
            <NavItem view={ViewState.AUTOMATION} icon={Zap} label="Automação" />

            <NavItem view={ViewState.WORKERS_IA} icon={Briefcase} label="Workers" />

            {/* Manager/Team Management - Visible only to authorized members */}
            {(isManager || permissions?.can_manage_clients || permissions?.can_manage_team) && (
              <NavItem view={ViewState.MANAGER} icon={Users} label="Gestão" />
            )}
          </>
        )}

        {/* Super Admin - Visible only to super admins */}
        {isSuperAdmin && (
          <NavItem view={ViewState.SUPERADMIN} icon={Shield} label="Admin" />
        )}
      </div>

      <div className="mt-auto mb-4 flex flex-col items-center space-y-5">
        <NotificationCenter currentView={currentView} onViewChange={onViewChange} />

        <button
          onClick={() => signOut()}
          className="text-slate-500 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-xl"
          title="Sair"
        >
          <LogOut className="w-6 h-6" />
        </button>

        <div className="p-0.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/5 shadow-lg">
          <Avatar
            src={`https://ui-avatars.com/api/?name=${user?.email || 'User'}&background=6366f1&color=fff`}
            name={user?.email || 'User'}
            size="md"
            className="cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all rounded-lg"
          />
        </div>
      </div>
    </nav>
  );
};