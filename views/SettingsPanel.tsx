import React, { useState } from 'react';
import { ArrowLeft, Building2, Tag, Settings as SettingsIcon, CheckSquare, Users, Bell, Shield, MessageSquare, Menu, CreditCard } from 'lucide-react';
import { OrganizationInfo } from '../components/settings/OrganizationInfo';
import { TagManagement } from '../components/settings/TagManagement';
import { WorkflowSettings } from '../components/settings/WorkflowSettings';
import { TemplateSettings } from '../components/settings/TemplateSettings';
import { SpecialtySettings } from '../components/settings/SpecialtySettings';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { SecuritySettings } from '../components/settings/SecuritySettings';
import { WhatsAppManager } from '../components/whatsapp/WhatsAppManager';
import { BillingSettings } from '../components/settings/BillingSettings';

type SettingsTab = 'info' | 'tags' | 'workflow' | 'templates' | 'specialties' | 'notifications' | 'security' | 'whatsapp' | 'billing';

interface SettingsPanelProps {
    onBack: () => void;
    organizationId: string;
    initialTab?: SettingsTab;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onBack, organizationId, initialTab = 'info' }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const tabs = [
        { id: 'info' as SettingsTab, label: 'Informações Gerais', icon: Building2 },
        { id: 'whatsapp' as SettingsTab, label: 'WhatsApp', icon: MessageSquare },
        { id: 'tags' as SettingsTab, label: 'Tags', icon: Tag },
        { id: 'workflow' as SettingsTab, label: 'Workflow', icon: SettingsIcon },
        { id: 'templates' as SettingsTab, label: 'Templates', icon: CheckSquare },
        { id: 'specialties' as SettingsTab, label: 'Especialidades', icon: Users },
        { id: 'notifications' as SettingsTab, label: 'Notificações', icon: Bell },
        { id: 'security' as SettingsTab, label: 'Segurança', icon: Shield },
        { id: 'billing' as SettingsTab, label: 'Assinatura', icon: CreditCard },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-950/20 backdrop-blur-3xl animate-in fade-in duration-500">
            {/* Header - Premium Dark */}
            <div className="h-16 bg-slate-900/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-20 shadow-lg shadow-black/20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
                        title="Voltar"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg shadow-lg shadow-violet-500/20 border border-white/10">
                            <SettingsIcon className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Núcleo da Organização</h1>
                    </div>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden p-2 text-slate-400 hover:text-white"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar - Premium Dark */}
                <div className={`
                    absolute md:relative inset-y-0 left-0 w-64 bg-[#0f172a]/95 backdrop-blur-2xl border-r border-white/5 
                    transform transition-transform duration-300 ease-in-out z-10
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="p-4 space-y-1 overflow-y-auto h-full custom-scrollbar">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-3 mb-3 mt-2">
                            Configurações
                        </h3>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${isActive
                                        ? 'text-violet-300 bg-violet-500/10 border border-violet-500/20 shadow-lg shadow-violet-500/5'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                    {tab.label}
                                    {isActive && (
                                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)] animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area - Premium Dark */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-transparent">
                    <div className="max-w-4xl mx-auto min-h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'info' && <OrganizationInfo organizationId={organizationId} />}
                        {activeTab === 'whatsapp' && <WhatsAppManager organizationId={organizationId} />}
                        {activeTab === 'tags' && <TagManagement organizationId={organizationId} />}
                        {activeTab === 'workflow' && <WorkflowSettings organizationId={organizationId} />}
                        {activeTab === 'templates' && <TemplateSettings organizationId={organizationId} />}
                        {activeTab === 'specialties' && <SpecialtySettings organizationId={organizationId} />}
                        {activeTab === 'notifications' && <NotificationSettings organizationId={organizationId} />}
                        {activeTab === 'security' && <SecuritySettings organizationId={organizationId} />}
                        {activeTab === 'billing' && <BillingSettings />}
                    </div>
                </div>
            </div>
        </div>
    );
};
