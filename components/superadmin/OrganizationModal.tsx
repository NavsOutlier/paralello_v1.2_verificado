import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Organization, PlanType } from '../../types';
import { Button } from '../ui';

interface OrganizationModalProps {
    organization?: Organization | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Organization>) => Promise<void>;
}

export const OrganizationModal: React.FC<OrganizationModalProps> = ({
    organization,
    isOpen,
    onClose,
    onSave
}) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [plan, setPlan] = useState<PlanType>(PlanType.BASIC);
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (organization) {
            setName(organization.name);
            setSlug(organization.slug);
            setPlan(organization.plan);
            setOwnerName(organization.owner.name);
            setOwnerEmail(organization.owner.email);
        } else {
            setName('');
            setSlug('');
            setPlan(PlanType.BASIC);
            setOwnerName('');
            setOwnerEmail('');
        }
    }, [organization, isOpen]);

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    };

    const handleNameChange = (value: string) => {
        setName(value);
        if (!organization) {
            setSlug(generateSlug(value));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data: Partial<Organization> = {
                name,
                slug,
                plan,
                owner: {
                    name: ownerName,
                    email: ownerEmail
                }
            };

            if (organization) {
                data.id = organization.id;
            }

            await onSave(data);
            onClose();
        } catch (error) {
            console.error('Error in OrganizationModal handleSubmit:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">
                        {organization ? 'Editar Organização' : 'Nova Organização'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nome da Organização *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="Ex: Acme Corporation"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Slug {organization && '(não editável)'}
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                            placeholder="acme-corporation"
                            disabled={!!organization}
                            required
                        />
                        {!organization && (
                            <p className="text-xs text-slate-500 mt-1">Gerado automaticamente do nome</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Plano *
                        </label>
                        <select
                            value={plan}
                            onChange={(e) => setPlan(e.target.value as PlanType)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            required
                        >
                            <option value={PlanType.BASIC}>Basic - $49/mês</option>
                            <option value={PlanType.PRO}>Pro - $149/mês</option>
                            <option value={PlanType.ENTERPRISE}>Enterprise - $499/mês</option>
                        </select>
                    </div>

                    <div className="border-t border-slate-200 pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Informações do Owner</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="João Silva"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={ownerEmail}
                                    onChange={(e) => setOwnerEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="joao@acme.com"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={loading}
                        >
                            {loading ? (organization ? 'Salvando...' : 'Criando...') : (organization ? 'Salvar' : 'Criar')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
