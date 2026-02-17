import React, { useState, useEffect } from 'react';
import {
    Settings,
    User,
    Building,
    Crown,
    Save,
    Check,
    AlertTriangle,
    Plus,
    Trash2,
    LayoutDashboard,
    MessageSquare,
    KanbanSquare,
    BarChart3,
    Zap,
    Briefcase,
    Users,
    X,
    Target
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { ViewState } from '../../types';

interface PlanConfig {
    id: string;
    name: string;
    price_base: number;
    price_per_client: number;
    max_users: number;
    trial_days: number;
    features: string[];
    modules: string[];
    is_active: boolean;
}

const AVAILABLE_MODULES = [
    { id: ViewState.DASHBOARD, label: 'Dash', icon: LayoutDashboard },
    { id: ViewState.WORKSPACE, label: 'Chats', icon: MessageSquare },
    { id: ViewState.KANBAN, label: 'Tarefas', icon: KanbanSquare },
    { id: ViewState.MARKETING, label: 'Metas', icon: BarChart3 },
    { id: ViewState.AUTOMATION, label: 'Automação', icon: Zap },
    { id: ViewState.WORKERS_IA, label: 'Workers', icon: Briefcase },
    { id: ViewState.MANAGER, label: 'Gestão', icon: Users },
    { id: ViewState.LEADS, label: 'Leads', icon: Target },
];

export const PlanSettings: React.FC = () => {
    const [plans, setPlans] = useState<PlanConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editedPlans, setEditedPlans] = useState<Set<string>>(new Set());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newPlan, setNewPlan] = useState<Partial<PlanConfig>>({
        id: '',
        name: '',
        price_base: 0,
        price_per_client: 0,
        max_users: 1,
        trial_days: 7,
        features: [],
        modules: AVAILABLE_MODULES.map(m => m.id),
        is_active: true
    });

    const { showToast } = useToast();

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('plan_configurations')
                .select('*')
                .order('price_base');

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Error loading plans:', error);
            showToast('Erro ao carregar planos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePlanChange = (planId: string, field: keyof PlanConfig, value: any) => {
        setPlans(prev => prev.map(p =>
            p.id === planId ? { ...p, [field]: value } : p
        ));
        setEditedPlans(prev => new Set(prev).add(planId));
    };

    const toggleModule = (planId: string, moduleId: string) => {
        setPlans(prev => prev.map(p => {
            if (p.id !== planId) return p;
            const modules = p.modules || [];
            const newModules = modules.includes(moduleId)
                ? modules.filter(m => m !== moduleId)
                : [...modules, moduleId];
            return { ...p, modules: newModules };
        }));
        setEditedPlans(prev => new Set(prev).add(planId));
    };

    const handleSave = async (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        try {
            setSaving(planId);
            const { error } = await supabase
                .from('plan_configurations')
                .upsert({
                    ...plan,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (error) throw error;

            showToast('Plano atualizado com sucesso!', 'success');
            setEditedPlans(prev => {
                const next = new Set(prev);
                next.delete(planId);
                return next;
            });
        } catch (error) {
            console.error('Error saving plan:', error);
            showToast('Erro ao salvar plano', 'error');
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (planId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.')) return;

        try {
            setSaving(planId);
            const { error } = await supabase
                .from('plan_configurations')
                .delete()
                .eq('id', planId);

            if (error) throw error;

            setPlans(prev => prev.filter(p => p.id !== planId));
            showToast('Plano excluído com sucesso', 'success');
        } catch (error) {
            console.error('Error deleting plan:', error);
            showToast('Erro ao excluir plano', 'error');
        } finally {
            setSaving(null);
        }
    };

    const handleAddPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlan.id || !newPlan.name) {
            showToast('ID e Nome são obrigatórios', 'error');
            return;
        }

        try {
            setSaving('new');
            const { error } = await supabase
                .from('plan_configurations')
                .insert([newPlan]);

            if (error) throw error;

            showToast('Plano criado com sucesso!', 'success');
            setIsAddModalOpen(false);
            setNewPlan({
                id: '',
                name: '',
                price_base: 0,
                price_per_client: 0,
                max_users: 1,
                trial_days: 7,
                features: [],
                modules: AVAILABLE_MODULES.map(m => m.id),
                is_active: true
            });
            loadPlans();
        } catch (error: any) {
            console.error('Error creating plan:', error);
            showToast(error.message || 'Erro ao criar plano', 'error');
        } finally {
            setSaving(null);
        }
    };

    const getPlanIcon = (planId: string) => {
        if (planId.includes('enterprise')) return Crown;
        if (planId.includes('agencia')) return Building;
        return User;
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-10 w-48 bg-slate-800/50 rounded-xl animate-pulse" />
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-800/50 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Gestão de Planos</h2>
                        <p className="text-sm text-slate-400">Configure valores, módulos e limites</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Novo Plano
                </button>
            </div>

            {/* Plans List */}
            <div className="space-y-6">
                {plans.map((plan) => {
                    const Icon = getPlanIcon(plan.id);
                    const isEdited = editedPlans.has(plan.id);
                    const isSaving = saving === plan.id;

                    return (
                        <div
                            key={plan.id}
                            className={`bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border overflow-hidden transition-all duration-300 ${isEdited ? 'border-indigo-500/40 shadow-2xl shadow-indigo-500/5' : 'border-white/5'
                                }`}
                        >
                            {/* Header Section */}
                            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl shadow-inner ${plan.id.includes('enterprise') ? 'bg-amber-500/20' :
                                        plan.id.includes('agencia') ? 'bg-blue-500/20' : 'bg-slate-500/20'
                                        }`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={plan.name}
                                                onChange={(e) => handlePlanChange(plan.id, 'name', e.target.value)}
                                                className="bg-transparent border-none p-0 text-lg font-black text-white focus:ring-0 placeholder-slate-600 w-auto min-w-[150px]"
                                            />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                                ID: {plan.id}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 font-medium">
                                            {formatCurrency(plan.price_base)}/mês
                                            {plan.price_per_client > 0 && ` + ${formatCurrency(plan.price_per_client)}/cliente`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {isEdited && (
                                        <button
                                            onClick={() => handleSave(plan.id)}
                                            disabled={!!saving}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-sm font-black text-emerald-400 transition-all uppercase tracking-wider"
                                        >
                                            {isSaving ? (
                                                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            Salvar Alterações
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(plan.id)}
                                        disabled={!!saving}
                                        className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                        title="Excluir Plano"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Configuration Grid */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Parâmetros Financeiros & Limites</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Preço Base (R$)</label>
                                            <input
                                                type="number"
                                                value={plan.price_base}
                                                onChange={(e) => handlePlanChange(plan.id, 'price_base', Number(e.target.value))}
                                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Por Cliente (R$)</label>
                                            <input
                                                type="number"
                                                value={plan.price_per_client}
                                                onChange={(e) => handlePlanChange(plan.id, 'price_per_client', Number(e.target.value))}
                                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Limite Usuários</label>
                                            <input
                                                type="number"
                                                value={plan.max_users === 999999 ? '' : plan.max_users}
                                                placeholder="Ilimitado"
                                                onChange={(e) => handlePlanChange(plan.id, 'max_users', e.target.value ? Number(e.target.value) : 999999)}
                                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Modules Selection */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Acesso a Módulos</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {AVAILABLE_MODULES.map((module) => {
                                            const ModuleIcon = module.icon;
                                            const isActive = (plan.modules || []).includes(module.id);
                                            return (
                                                <button
                                                    key={module.id}
                                                    onClick={() => toggleModule(plan.id, module.id)}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-2 group ${isActive
                                                        ? 'bg-indigo-500/20 border-indigo-500/30 text-white'
                                                        : 'bg-slate-950/30 border-white/5 text-slate-500 hover:border-white/10'
                                                        }`}
                                                >
                                                    <ModuleIcon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'group-hover:text-slate-400'}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{module.label}</span>
                                                    {isActive && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Plan Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 text-white">
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-4xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <h3 className="text-xl font-black tracking-tight">Criar Novo Plano</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddPlan} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID do Plano (Slug)</label>
                                    <input
                                        type="text"
                                        placeholder="ex: ppe_basico"
                                        value={newPlan.id}
                                        onChange={e => setNewPlan({ ...newPlan, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome do Plano</label>
                                    <input
                                        type="text"
                                        placeholder="ex: PPE Básico"
                                        value={newPlan.name}
                                        onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preço Base (R$)</label>
                                    <input
                                        type="number"
                                        value={newPlan.price_base}
                                        onChange={e => setNewPlan({ ...newPlan, price_base: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Máx. Usuários</label>
                                    <input
                                        type="number"
                                        value={newPlan.max_users}
                                        onChange={e => setNewPlan({ ...newPlan, max_users: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!!saving}
                                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:grayscale"
                            >
                                {saving === 'new' ? 'Criando...' : 'Criar Plano Premium'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
