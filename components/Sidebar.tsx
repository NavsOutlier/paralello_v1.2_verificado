import React from 'react';
import { LayoutDashboard, MessageSquare, KanbanSquare, Users, LogOut, Shield, BarChart3, Zap, ActivitySquare, ChevronDown } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useOrganizationPlan } from '../hooks/useOrganizationPlan';
import { Avatar, NotificationCenterTrigger } from './ui';
import { Lock } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  isNotificationsOpen: boolean;
  onToggleNotifications: () => void;
  unreadNotificationsCount: number;
}

type NavTheme = 'internal' | 'external' | 'management' | 'admin';

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isNotificationsOpen,
  onToggleNotifications,
  unreadNotificationsCount
}) => {
  const { signOut, user, isSuperAdmin, isManager, permissions } = useAuth();
  const { hasModule, plan } = useOrganizationPlan();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = React.useState(false);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 5);
    }
  };

  React.useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [permissions, hasModule, isSuperAdmin, isManager]);

  const NavItem = ({
    view,
    icon: Icon,
    label,
    theme = 'internal'
  }: {
    view: ViewState,
    icon: any,
    label: string,
    theme?: NavTheme
  }) => {
    const isLocked = !isSuperAdmin && !hasModule(view);

    // If on "meta" plan and module is restricted, hide it completely (don't show even with lock)
    if (plan?.id === 'meta' && isLocked) {
      return null;
    }

    const themeColors = {
      internal: {
        activeText: 'text-cyan-400',
        inactiveText: 'text-cyan-300/80',
        activeBar: 'bg-gradient-to-b from-blue-500 to-cyan-300',
        activeIconDrop: 'drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]',
        hoverBg: 'hover:bg-cyan-500/10',
        activeLabel: 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
      },
      external: {
        activeText: 'text-emerald-400',
        inactiveText: 'text-emerald-300/80',
        activeBar: 'bg-gradient-to-b from-green-500 to-emerald-300',
        activeIconDrop: 'drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]',
        hoverBg: 'hover:bg-emerald-500/10',
        activeLabel: 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
      },
      management: {
        activeText: 'text-amber-400',
        inactiveText: 'text-amber-300/80',
        activeBar: 'bg-gradient-to-b from-orange-500 to-amber-300',
        activeIconDrop: 'drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]',
        hoverBg: 'hover:bg-amber-500/10',
        activeLabel: 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
      },
      admin: {
        activeText: 'text-rose-400',
        inactiveText: 'text-rose-300/80',
        activeBar: 'bg-gradient-to-b from-red-500 to-rose-300',
        activeIconDrop: 'drop-shadow-[0_0_12px_rgba(251,113,133,0.8)]',
        hoverBg: 'hover:bg-rose-500/10',
        activeLabel: 'text-rose-300 drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]'
      }
    };

    const currentTheme = themeColors[theme];
    const isActive = currentView === view;

    return (
      <button
        onClick={() => onViewChange(view)}
        className={`flex flex-col items-center justify-center w-full py-2.5 pl-6 pr-2 space-y-1 transition-all relative group rounded-xl ${isActive
          ? `${currentTheme.activeText}`
          : `${currentTheme.inactiveText} ${currentTheme.hoverBg} hover:text-white`
          }`}
        title={label}
      >
        {isActive && (
          <div className={`absolute left-1 top-3 bottom-3 w-1 ${currentTheme.activeBar} rounded-full shadow-[0_0_12px_rgba(34,211,238,0.5)]`} />
        )}
        <div className="relative">
          <Icon className={`w-6 h-6 transition-all duration-300 group-hover:scale-110 ${isActive ? `${currentTheme.activeIconDrop} scale-110` : 'opacity-80 group-hover:opacity-100 animate-pulse-subtle'}`} />
          {isLocked && (
            <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-white/5">
              <Lock className="w-2 h-2 text-slate-400" />
            </div>
          )}
        </div>
        <span className={`text-[10px] font-bold tracking-wider transition-all duration-300 group-hover:opacity-100 ${isActive ? `${currentTheme.activeLabel} opacity-100 scale-105` : 'opacity-100'}`}>
          {label}
        </span>
      </button>
    );
  };

  const isInternalGroup = [ViewState.DASHBOARD, ViewState.WORKSPACE, ViewState.KANBAN, ViewState.AUTOMATION].includes(currentView);
  const isExternalGroup = [ViewState.BLACK_BI, ViewState.MARKETING].includes(currentView);
  const isManagerView = currentView === ViewState.MANAGER;

  return (
    <nav className="w-[130px] flex-shrink-0 bg-slate-900/80 backdrop-blur-3xl border-r border-white/5 flex flex-col items-center py-4 z-50 overflow-visible relative">
      <div className="mb-4 flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-14 h-14 flex items-center justify-center">
          <img src="/blackback-icon-nobg.png" alt="Blackback Icon" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]" />
        </div>
        <img src="/blackback-text-nobg.png" alt="Blackback" className="w-14 h-auto object-contain opacity-90" />
      </div>

      {/* Scrollable Module Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 w-full flex flex-col gap-2 px-2 pb-[5px] overflow-y-auto custom-scrollbar"
      >
        {!isSuperAdmin && (
          <>
            {/* GRUPO INTERNO (Equipe) */}
            <div className={`flex flex-col gap-1 p-1.5 rounded-2xl transition-all duration-300 border ${isInternalGroup
              ? 'bg-cyan-900/20 border-cyan-500/40 ring-2 ring-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
              : 'bg-cyan-900/10 border-cyan-500/10'
              }`}>
              {isManager && (
                <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dash" theme="internal" />
              )}
              <NavItem view={ViewState.WORKSPACE} icon={MessageSquare} label="Chat" theme="internal" />
              <NavItem view={ViewState.KANBAN} icon={KanbanSquare} label="Tarefas" theme="internal" />
              <NavItem view={ViewState.AUTOMATION} icon={Zap} label="Automações" theme="internal" />
            </div>

            {/* GRUPO EXTERNO (Clientes) */}
            <div className={`flex flex-col gap-1 p-1.5 rounded-2xl transition-all duration-300 border ${isExternalGroup
              ? 'bg-emerald-900/20 border-emerald-500/40 ring-2 ring-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
              : 'bg-emerald-900/10 border-emerald-500/10'
              }`}>
              <NavItem view={ViewState.MARKETING} icon={BarChart3} label="Marketing" theme="external" />
              <NavItem view={ViewState.BLACK_BI} icon={ActivitySquare} label="Comercial" theme="external" />
            </div>

            {/* GESTÃO - Diferenciado Neon */}
            {(isManager || permissions?.can_manage_clients || permissions?.can_manage_team) && (
              <div className={`mt-2 p-1.5 rounded-2xl transition-all duration-300 border ${isManagerView
                ? 'bg-amber-900/20 border-amber-500/40 ring-2 ring-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                : 'bg-slate-800/20 hover:bg-slate-800/40 border-slate-700/50'
                }`}>
                <NavItem view={ViewState.MANAGER} icon={Users} label="Gestão" theme="management" />
              </div>
            )}
          </>
        )}

        {/* Super Admin */}
        {isSuperAdmin && (
          <div className="p-1.5 rounded-2xl bg-rose-900/10 border border-rose-500/10">
            <NavItem view={ViewState.SUPERADMIN} icon={Shield} label="Admin" theme="admin" />
          </div>
        )}
      </div>

      {/* Scroll Indicator */}
      <div className={`w-full relative flex items-center justify-center h-4 mt-1 pointer-events-none`}>
        {/* Bouncing Chevron (Fades out at bottom) */}
        <div className={`transition-all duration-300 ${canScrollDown ? 'opacity-100 animate-bounce' : 'opacity-0 scale-75'}`}>
          <ChevronDown className="w-4 h-4 text-slate-500/70" />
        </div>
      </div>

      {/* Fixed Bottom Area (Always visible, allows overflow) */}
      <div className="w-full mt-auto pt-4 pb-2 flex flex-col items-center space-y-4 flex-shrink-0 bg-slate-900/90 border-t border-white/5 relative">
        {/* Subtle top glow to reinforce separation */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-500/20 to-transparent" />

        <NotificationCenterTrigger
          unreadCount={unreadNotificationsCount}
          isOpen={isNotificationsOpen}
          onToggle={onToggleNotifications}
        />

        <button
          onClick={() => signOut()}
          className="text-slate-500 hover:text-red-400 transition-all p-2 hover:bg-red-500/10 rounded-2xl group"
          title="Sair"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        <div className="flex items-center justify-center p-1 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-white/10 shadow-lg relative group">
          <Avatar
            src={`https://ui-avatars.com/api/?name=${user?.email || 'User'}&background=6366f1&color=fff`}
            name={user?.email || 'User'}
            size="sm"
            rounded="rounded-xl"
            className="cursor-pointer hover:scale-105 transition-all shadow-md"
          />
          <div className="absolute inset-0 rounded-2xl bg-cyan-400/0 group-hover:bg-cyan-400/5 transition-colors pointer-events-none" />
        </div>
      </div>
    </nav>
  );
};
