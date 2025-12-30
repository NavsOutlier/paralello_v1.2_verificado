import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Organization, PlanType } from '../../types';
import { Card } from '../ui';
import { OrganizationRow } from './OrganizationRow';

interface OrganizationTableProps {
    organizations: Organization[];
    onEdit: (org: Organization) => void;
    onToggleStatus: (org: Organization) => void;
    onChangePlan: (org: Organization) => void;
}

export const OrganizationTable: React.FC<OrganizationTableProps> = ({
    organizations,
    onEdit,
    onToggleStatus,
    onChangePlan
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [planFilter, setPlanFilter] = useState<'all' | PlanType>('all');

    const filteredOrganizations = organizations.filter(org => {
        const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
        const matchesPlan = planFilter === 'all' || org.plan === planFilter;

        return matchesSearch && matchesStatus && matchesPlan;
    });

    return (
        <Card className="overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex gap-4 items-center">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou slug..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Inativos</option>
                    </select>

                    {/* Plan Filter */}
                    <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value as any)}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white"
                    >
                        <option value="all">Todos os Planos</option>
                        <option value={PlanType.BASIC}>Basic</option>
                        <option value={PlanType.PRO}>Pro</option>
                        <option value={PlanType.ENTERPRISE}>Enterprise</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Organização
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Plano
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Usuários
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Clientes
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Criado em
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {filteredOrganizations.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                    Nenhuma organização encontrada
                                </td>
                            </tr>
                        ) : (
                            filteredOrganizations.map((org) => (
                                <OrganizationRow
                                    key={org.id}
                                    organization={org}
                                    onEdit={onEdit}
                                    onToggleStatus={onToggleStatus}
                                    onChangePlan={onChangePlan}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Results Count */}
            {filteredOrganizations.length > 0 && (
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-600">
                    Mostrando {filteredOrganizations.length} de {organizations.length} organizações
                </div>
            )}
        </Card>
    );
};
