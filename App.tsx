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
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.WORKSPACE);

  // Protection: Ensure user can only see views they have access to
  React.useEffect(() => {
    if (currentView === ViewState.MANAGER && !isManager && !isSuperAdmin) {
      setCurrentView(ViewState.WORKSPACE);
    }
    if (currentView === ViewState.SUPERADMIN && !isSuperAdmin) {
      setCurrentView(ViewState.WORKSPACE);
    }
  }, [currentView, isManager, isSuperAdmin]);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Detect invitation or recovery link
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery') || hash.includes('access_token='))) {
      setIsUpdatingPassword(true);
    }
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-100 text-slate-400">Carregando...</div>;
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 font-sans">
      {/* Reusable Sidebar Component */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

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