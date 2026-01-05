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
const AppContent: React.FC = () => {
  const { user, loading, isSuperAdmin, isManager } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState | null>(null);
  const [hasRouted, setHasRouted] = useState(false);

  // Initial Role-Based Redirection
  React.useEffect(() => {
    if (!loading && user) {
      if (!hasRouted) {
        if (isSuperAdmin) {
          setCurrentView(ViewState.SUPERADMIN);
          setHasRouted(true);
        } else if (isManager) {
          setCurrentView(ViewState.MANAGER);
          setHasRouted(true);
        } else {
          setCurrentView(ViewState.WORKSPACE);
          setHasRouted(true);
        }
      } else {
        // Late detection (handling slow network)
        if (currentView === ViewState.WORKSPACE) {
          if (isSuperAdmin) setCurrentView(ViewState.SUPERADMIN);
          else if (isManager) setCurrentView(ViewState.MANAGER);
        }
      }
    }
  }, [loading, user, isManager, isSuperAdmin, hasRouted, currentView]);

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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;