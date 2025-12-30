import React, { useState } from 'react';
import { ClientManagement } from './ClientManagement';
import { TeamManagement } from './TeamManagement';
import { Users, UserPlus, LayoutDashboard } from 'lucide-react';

type Tab = 'overview' | 'clients' | 'team';

export const ManagerDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    return (
        <div className="flex-1 flex flex-col bg-slate-50">
            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200">
                <div className="flex gap-1 p-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'overview'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Visão Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'clients'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Clientes
                    </button>
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'team'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <UserPlus className="w-4 h-4" />
                        Equipe
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'clients' && <ClientManagement />}
            {activeTab === 'team' && <TeamManagement />}
        </div>
    );
};

const OverviewTab: React.FC = () => {
    return (
        <div className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Painel do Gestor</h1>
                <p className="text-slate-600 mb-8">
                    Gerencie clientes e membros da sua equipe de forma centralizada
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Clients Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Clientes</h2>
                                <p className="text-blue-100">Gerencie sua base de clientes</p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-lg">
                                <Users className="w-8 h-8" />
                            </div>
                        </div>
                        <ul className="space-y-2 text-sm text-blue-100">
                            <li>✓ Adicionar e editar clientes</li>
                            <li>✓ Gerenciar informações de contato</li>
                            <li>✓ Organizar status e notas</li>
                        </ul>
                    </div>

                    {/* Team Card */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Equipe</h2>
                                <p className="text-purple-100">Gerencie membros da equipe</p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-lg">
                                <UserPlus className="w-8 h-8" />
                            </div>
                        </div>
                        <ul className="space-y-2 text-sm text-purple-100">
                            <li>✓ Convidar novos membros</li>
                            <li>✓ Definir funções e permissões</li>
                            <li>✓ Gerenciar acesso ao sistema</li>
                        </ul>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Acesso Rápido</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => { }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Novo Cliente
                        </button>
                        <button
                            onClick={() => { }}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Convidar Membro
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>Dica:</strong> Use as abas acima para navegar entre o gerenciamento de clientes e equipe.
                        Você pode buscar, adicionar, editar e remover registros conforme necessário.
                    </p>
                </div>
            </div>
        </div>
    );
};
