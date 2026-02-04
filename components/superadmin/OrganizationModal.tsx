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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/[0.02]">
                    <h2 className="text-xl font-black text-white tracking-tight">
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
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                            Nome da Organização *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                            placeholder="Ex: Acme Corporation"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                            Slug {organization && '(não editável)'}
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="acme-corporation"
                            disabled={!!organization}
                            required
                        />
                        {!organization && (
                            <p className="text-xs text-slate-500 mt-1">Gerado automaticamente do nome</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                            Plano *
                        </label>
                        <select
                            value={plan}
                            onChange={(e) => setPlan(e.target.value as PlanType)}
                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium appearance-none"
                            required
                        >
                            <option value={PlanType.BASIC}>Basic - $49/mês</option>
                            <option value={PlanType.PRO}>Pro - $149/mês</option>
                            <option value={PlanType.ENTERPRISE}>Enterprise - $499/mês</option>
                        </select>
                    </div>

                    <div className="border-t border-white/5 pt-6 mt-6">
                        <h3 className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.3em] mb-4">Informações do Owner</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                                    placeholder="João Silva"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={ownerEmail}
                                    onChange={(e) => setOwnerEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                                    placeholder="joao@acme.com"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-6">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1 bg-white/5 border-white/10 text-slate-300"
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
