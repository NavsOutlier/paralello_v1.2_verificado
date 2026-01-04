import React, { useState } from 'react';
import { ArrowLeft, Building2, Tag, Settings as SettingsIcon, CheckSquare, Users, Bell, Shield, MessageSquare } from 'lucide-react';
import { OrganizationInfo } from '../components/settings/OrganizationInfo';
import { TagManagement } from '../components/settings/TagManagement';
import { WorkflowSettings } from '../components/settings/WorkflowSettings';
import { TemplateSettings } from '../components/settings/TemplateSettings';
import { SpecialtySettings } from '../components/settings/SpecialtySettings';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { SecuritySettings } from '../components/settings/SecuritySettings';
import { WhatsAppManager } from '../components/whatsapp/WhatsAppManager';

type SettingsTab = 'info' | 'tags' | 'workflow' | 'templates' | 'specialties' | 'notifications' | 'security' | 'whatsapp';

interface SettingsPanelProps {
    onBack: () => void;
    organizationId: string;
    initialTab?: SettingsTab;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onBack, organizationId, initialTab = 'info' }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

    const tabs = [
        { id: 'info' as SettingsTab, label: 'Informações Gerais', icon: Building2 },
        { id: 'whatsapp' as SettingsTab, label: 'WhatsApp', icon: MessageSquare },
        { id: 'tags' as SettingsTab, label: 'Tags', icon: Tag },
        { id: 'workflow' as SettingsTab, label: 'Workflow', icon: SettingsIcon },
        { id: 'templates' as SettingsTab, label: 'Templates', icon: CheckSquare },
        { id: 'specialties' as SettingsTab, label: 'Especialidades', icon: Users },
        { id: 'notifications' as SettingsTab, label: 'Notificações', icon: Bell },
        { id: 'security' as SettingsTab, label: 'Segurança', icon: Shield },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
                <button
                    onClick={onBack}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-indigo-600" />
                    <h1 className="text-lg font-bold text-slate-800">Configurações da Organização</h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-60 bg-white border-r border-slate-200 overflow-y-auto">
                    <div className="p-3 space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'info' && <OrganizationInfo organizationId={organizationId} />}
                    {activeTab === 'whatsapp' && <WhatsAppManager organizationId={organizationId} />}
                    {activeTab === 'tags' && <TagManagement organizationId={organizationId} />}
                    {activeTab === 'workflow' && <WorkflowSettings organizationId={organizationId} />}
                    {activeTab === 'templates' && <TemplateSettings organizationId={organizationId} />}
                    {activeTab === 'specialties' && <SpecialtySettings organizationId={organizationId} />}
                    {activeTab === 'notifications' && <NotificationSettings organizationId={organizationId} />}
                    {activeTab === 'security' && <SecuritySettings organizationId={organizationId} />}
                </div>
            </div>
        </div>
    );
};
