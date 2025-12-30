import React, { useState } from 'react';
import { ViewState } from './types';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './views/Workspace';
import { Dashboard } from './components/Dashboard';
import { Kanban } from './components/Kanban';

// Simple placeholder for Manager view
const ManagerView = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-4">Gerenciamento</h1>
    <p className="text-slate-500">Tela de cadastro de clientes e membros da equipe (mockup).</p>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.WORKSPACE);

  return (
    <div className="flex h-screen w-screen bg-slate-100 font-sans">
      {/* Reusable Sidebar Component */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentView === ViewState.DASHBOARD && <Dashboard />}
        {currentView === ViewState.WORKSPACE && <Workspace />}
        {currentView === ViewState.KANBAN && <Kanban />}
        {currentView === ViewState.MANAGER && <ManagerView />}
      </main>
    </div>
  );
};

export default App;