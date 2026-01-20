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
import { AutomationTab } from './components/automation';
import { AIAgentDashboard } from './components/ai-agents';
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

  if (loading || (user && currentView === null)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-100">
        <div className="text-slate-400 font-medium animate-pulse">Carregando perfil...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 font-sans">
      {/* Reusable Sidebar Component */}
      {currentView && <Sidebar currentView={currentView} onViewChange={setCurrentView} />}

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentView === ViewState.DASHBOARD && <Dashboard />}
        {currentView === ViewState.WORKSPACE && <Workspace />}
        {currentView === ViewState.KANBAN && <Kanban />}
        {currentView === ViewState.MANAGER && <ManagerDashboard />}
        {currentView === ViewState.SUPERADMIN && <SuperAdminDashboard />}
        {currentView === ViewState.MARKETING && <MarketingDashboard />}
        {currentView === ViewState.AUTOMATION && <AutomationTab />}
        {currentView === ViewState.AI_AGENTS && <AIAgentDashboard />}
        {isUpdatingPassword && (
          <div className="absolute inset-0 z-[100] bg-white">
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