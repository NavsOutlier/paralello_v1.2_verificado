import React, { useState } from 'react';
import { ViewState } from './types';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './views/Workspace';
import { Dashboard } from './components/Dashboard';
import { Kanban } from './components/Kanban';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoginView } from './views/LoginView';
import { UpdatePasswordView } from './views/UpdatePasswordView';
import { MarketingDashboard } from './components/MarketingDashboard';
import { MetaCallback } from './components/auth/MetaCallback';
import { AutomationTab } from './components/automation';
import { WorkersIADashboard } from './components/workers-ia/WorkersIADashboard';
import { PremiumBackground } from './components/ui/PremiumBackground';
import { RestrictedModule } from './components/ui/RestrictedModule';
import { LeadsDashboard } from './components/leads/LeadsDashboard';

const AppContent: React.FC = () => {
  const { user, loading, isSuperAdmin, isManager } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState | null>(() => {
    const saved = localStorage.getItem('app_current_view');
    return saved ? (saved as ViewState) : null;
  });
  const [hasRouted, setHasRouted] = useState(false);
  const [performedRoleRedirection, setPerformedRoleRedirection] = useState(false);

  // Initial Role-Based Redirection
  React.useEffect(() => {
    if (!loading && user) {
      // Check for deep links first
      const params = new URLSearchParams(window.location.search);
      const hasDeepLink = params.has('task') || params.has('chat');

      if (!hasRouted) {
        // If restored from storage, respect it
        if (currentView) {
          setHasRouted(true);
          setPerformedRoleRedirection(true);
          return;
        }

        // Deep Link Override
        if (hasDeepLink) {
          setCurrentView(ViewState.WORKSPACE);
          setHasRouted(true);
          setPerformedRoleRedirection(true); // Treat as redirected so we don't override it below
          return;
        }

        // Standard Role Logic
        if (isSuperAdmin) {
          setCurrentView(ViewState.SUPERADMIN);
          setPerformedRoleRedirection(true);
        } else if (isManager) {
          setCurrentView(ViewState.MANAGER);
          setPerformedRoleRedirection(true);
        } else {
          setCurrentView(ViewState.WORKSPACE);
        }
        setHasRouted(true);
      } else if (!performedRoleRedirection && !hasDeepLink) {
        // Initial placement was WORKSPACE (likely because roles were still loading)
        // Now that we confirmed a role, move to the correct dashboard ONCE
        if (isSuperAdmin) {
          setCurrentView(ViewState.SUPERADMIN);
          setPerformedRoleRedirection(true);
        } else if (isManager) {
          setCurrentView(ViewState.MANAGER);
          setPerformedRoleRedirection(true);
        }
      }
    }
  }, [loading, user, isManager, isSuperAdmin, hasRouted, performedRoleRedirection]);

  // Security: Persistent View Protection (enforce roles if user tries to switch via UI)
  React.useEffect(() => {
    if (!loading && user) {
      if (currentView === ViewState.MANAGER && !isManager && !isSuperAdmin) {
        setCurrentView(ViewState.WORKSPACE);
      }
      if (currentView === ViewState.SUPERADMIN && !isSuperAdmin) {
        setCurrentView(ViewState.WORKSPACE);
      }
    }
  }, [loading, user, isManager, isSuperAdmin, currentView]);

  // Persistence
  React.useEffect(() => {
    if (currentView) {
      localStorage.setItem('app_current_view', currentView);
    }
  }, [currentView]);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Detect invitation or recovery link
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery') || hash.includes('access_token='))) {
      setIsUpdatingPassword(true);
    }
  }, []);
  // Reset routing state on logout
  React.useEffect(() => {
    if (!user && !loading) {
      setHasRouted(false);
      setCurrentView(null);
      localStorage.removeItem('app_current_view');
    }
  }, [user, loading]);

  // Special Route: OAuth Callback (Meta)
  if (window.location.pathname === '/oauth/meta/callback') {
    return <MetaCallback />;
  }

  if (loading || (user && currentView === null)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0f1a] relative overflow-hidden">
        <PremiumBackground />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-2xl flex items-center justify-center text-white font-black text-2xl mb-6 animate-bounce">
            P
          </div>
          <div className="text-cyan-400/50 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#0a0f1a] font-sans relative overflow-hidden text-slate-200">
      <PremiumBackground />

      {/* Reusable Sidebar Component */}
      {currentView && <Sidebar currentView={currentView} onViewChange={setCurrentView} />}

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        {currentView === ViewState.DASHBOARD && (
          <RestrictedModule moduleId={ViewState.DASHBOARD} title="Métricas & Insights">
            <Dashboard />
          </RestrictedModule>
        )}
        {currentView === ViewState.WORKSPACE && (
          <RestrictedModule moduleId={ViewState.WORKSPACE} title="Workspace de Conversas">
            <Workspace />
          </RestrictedModule>
        )}
        {currentView === ViewState.KANBAN && (
          <RestrictedModule moduleId={ViewState.KANBAN} title="Gestão de Projetos">
            <Kanban />
          </RestrictedModule>
        )}
        {currentView === ViewState.MANAGER && (
          <RestrictedModule moduleId={ViewState.MANAGER} title="Gestão de Clientes e Time">
            <ManagerDashboard />
          </RestrictedModule>
        )}
        {currentView === ViewState.SUPERADMIN && <SuperAdminDashboard />}
        {currentView === ViewState.MARKETING && (
          <RestrictedModule moduleId={ViewState.MARKETING} title="Metas & Conversão">
            <MarketingDashboard />
          </RestrictedModule>
        )}
        {currentView === ViewState.AUTOMATION && (
          <RestrictedModule moduleId={ViewState.AUTOMATION} title="Automações de Fluxo">
            <AutomationTab />
          </RestrictedModule>
        )}
        {currentView === ViewState.WORKERS_IA && (
          <RestrictedModule moduleId={ViewState.WORKERS_IA} title="Blackback Workers IA">
            <WorkersIADashboard />
          </RestrictedModule>
        )}
        {currentView === ViewState.LEADS && (
          <RestrictedModule moduleId={ViewState.LEADS} title="Gestão de Leads">
            <LeadsDashboard />
          </RestrictedModule>
        )}
        {isUpdatingPassword && (
          <div className="absolute inset-0 z-[100] bg-[#0a0f1a]">
            <UpdatePasswordView onSuccess={() => {
              setIsUpdatingPassword(false);
              window.location.hash = ''; // Clear hash
            }} />
          </div>
        )}
      </main>
    </div>
  );
};

import { NotificationProvider } from './contexts/NotificationContext';

// ... (existing imports)

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;