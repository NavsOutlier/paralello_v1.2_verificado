import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    BarChart3, Clock, X, Save, Calendar, Copy, FileText, Bookmark
} from 'lucide-react';
import { ScheduledReport } from '../../types/automation';
import { ClientSelector } from './ClientSelector';
import { VariableInsert } from './VariableInsert';
import { TemplateLibrary } from './TemplateLibrary';

interface ReportingConfigProps {
    clientId?: string;
    clientName?: string;
    onClose: () => void;
    onSuccess?: () => void;
    editingReport?: ScheduledReport;
    duplicateMode?: boolean;
}

export const ReportingConfig: React.FC<ReportingConfigProps> = ({
    clientId,
    clientName,
    onClose,
    onSuccess,
    editingReport,
    duplicateMode = false
}) => {
    const { organizationId, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Client selection
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
        clientId ? [clientId] : []
    );

    // Form state
    const [name, setName] = useState('Resumo Semanal');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [weekday, setWeekday] = useState(1); // Monday (for weekly)
    const [dayOfMonth, setDayOfMonth] = useState(1); // 1-5 (for monthly)
    const [timeOfDay, setTimeOfDay] = useState('09:00');

    const [template, setTemplate] = useState(
        '📊 *Resumo {{frequency}}*\nPeríodo: {{period}}\n\n📈 Resultados:\n• Leads: {{leads}}\n• Conversões: {{conversions}}\n• CPL: R$ {{cpl}}\n\n✅ Ótimo trabalho!'
    );

    // Weekdays for weekly
    const WEEKDAYS = [
        { value: 0, label: 'Domingo' },
        { value: 1, label: 'Segunda-feira' },
        { value: 2, label: 'Terça-feira' },
        { value: 3, label: 'Quarta-feira' },
        { value: 4, label: 'Quinta-feira' },
        { value: 5, label: 'Sexta-feira' },
        { value: 6, label: 'Sábado' },
    ];

    // Days 1-5 for monthly
    const MONTHLY_DAYS = [1, 2, 3, 4, 5];

    // Initialize from editing report if provided
    useEffect(() => {
        if (editingReport) {
            setName(editingReport.name);
            setFrequency(editingReport.frequency as 'daily' | 'weekly' | 'monthly');
            setWeekday(editingReport.weekday || 1);
            setDayOfMonth(editingReport.day_of_month || 1);
            setTimeOfDay(editingReport.time_of_day);

            setTemplate(editingReport.template || '');

            if (!duplicateMode) {
                setSelectedClientIds([editingReport.client_id]);
            }
        }
    }, [editingReport, duplicateMode]);



    const calculateNextRun = (): string => {
        const now = new Date();
        const [hours, minutes] = timeOfDay.split(':').map(Number);

        if (frequency === 'daily') {
            // Tomorrow at the specified time
            const nextRun = new Date(now);
            nextRun.setDate(now.getDate() + 1);
            nextRun.setHours(hours, minutes, 0, 0);
            return nextRun.toISOString();
        } else if (frequency === 'weekly') {
            // Next occurrence of the selected weekday
            const daysUntilNext = (weekday - now.getDay() + 7) % 7 || 7;
            const nextRun = new Date(now);
            nextRun.setDate(now.getDate() + daysUntilNext);
            nextRun.setHours(hours, minutes, 0, 0);
            if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 7);
            return nextRun.toISOString();
        } else {
            // Monthly: next occurrence of dayOfMonth (1-5)
            const nextRun = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth, hours, minutes);
            // If we're past the selected day this month and it's still in range, use this month
            if (now.getDate() < dayOfMonth && dayOfMonth <= 5) {
                nextRun.setMonth(now.getMonth());
            }
            return nextRun.toISOString();
        }
    };

    const getFrequencyDescription = () => {
        switch (frequency) {
            case 'daily':
                return 'Dados do dia anterior, enviado diariamente';
            case 'weekly':
                return 'Dados dos últimos 7 dias (sem contar o dia de envio)';
            case 'monthly':
                return 'Dados do mês anterior completo';
        }
    };

    const handleTemplateSelect = (selectedTemplate: any) => {
        setTemplate(selectedTemplate.content);
        setName(selectedTemplate.name);
        if (selectedTemplate.category) {
            setFrequency(selectedTemplate.category as 'daily' | 'weekly' | 'monthly');
        }
        setShowTemplates(false);
    };

    const handleSaveAsTemplate = async () => {
        if (!organizationId || !template.trim()) return;

        const templateName = prompt('Nome do template:', name);
        if (!templateName) return;

        const { error } = await supabase
            .from('automation_templates')
            .insert({
                organization_id: organizationId,
                name: templateName,
                type: 'report',
                category: frequency,
                content: template,
                template_data: {},
                created_by: user?.id
            });

        if (error) {
            console.error('Error saving template:', error);
            alert('Erro ao salvar template');
        } else {
            alert('Template salvo com sucesso!');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId || selectedClientIds.length === 0) return;

        setLoading(true);
        try {
            const baseReportData = {
                organization_id: organizationId,
                name,
                frequency,
                weekday: frequency === 'weekly' ? weekday : null,
                day_of_month: frequency === 'monthly' ? dayOfMonth : null,
                time_of_day: timeOfDay,
                metrics: [],
                template,
                is_active: true,
                next_run: calculateNextRun(),
                created_by: user?.id
            };

            if (editingReport && !duplicateMode) {
                const { error } = await supabase
                    .from('scheduled_reports')
                    .update({
                        ...baseReportData,
                        client_id: editingReport.client_id
                    })
                    .eq('id', editingReport.id);
                if (error) throw error;
            } else {
                const inserts = selectedClientIds.map(cId => ({
                    ...baseReportData,
                    client_id: cId
                }));

                const { error } = await supabase
                    .from('scheduled_reports')
                    .insert(inserts);
                if (error) throw error;
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error saving report:', err);
            alert('Erro ao salvar relatório');
        } finally {
            setLoading(false);
        }
    };

    const isEditing = editingReport && !duplicateMode;
    const title = duplicateMode
        ? 'Duplicar Relatório'
        : editingReport
            ? 'Editar Relatório'
            : 'Novo Relatório Automático';

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${duplicateMode ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                                {duplicateMode ? (
                                    <Copy className="w-5 h-5 text-orange-600" />
                                ) : (
                                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                                )}
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">{title}</h2>
                                {isEditing && clientName && (
                                    <p className="text-xs text-slate-500">Cliente: {clientName}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowTemplates(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Usar Template
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Client Selection */}
                        {!isEditing && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    Cliente(s)
                                    {duplicateMode && (
                                        <span className="text-orange-500">(selecione destino)</span>
                                    )}
                                </label>
                                <ClientSelector
                                    selectedClientIds={selectedClientIds}
                                    onChange={setSelectedClientIds}
                                    mode="multiple"
                                    currentClientId={clientId}
                                    excludeClientIds={duplicateMode && editingReport ? [editingReport.client_id] : []}
                                />
                            </div>
                        )}

                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Nome do Relatório
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Resumo Semanal"
                                required
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>

                        {/* Frequency */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Frequência
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFrequency('daily')}
                                    className={`p-3 rounded-xl border-2 transition-all text-center ${frequency === 'daily'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    <Clock className="w-5 h-5 mx-auto mb-1" />
                                    <span className="text-xs font-bold">Diário</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFrequency('weekly')}
                                    className={`p-3 rounded-xl border-2 transition-all text-center ${frequency === 'weekly'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    <Calendar className="w-5 h-5 mx-auto mb-1" />
                                    <span className="text-xs font-bold">Semanal</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFrequency('monthly')}
                                    className={`p-3 rounded-xl border-2 transition-all text-center ${frequency === 'monthly'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    <BarChart3 className="w-5 h-5 mx-auto mb-1" />
                                    <span className="text-xs font-bold">Mensal</span>
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 text-center">
                                {getFrequencyDescription()}
                            </p>
                        </div>

                        {/* Schedule Options based on frequency */}
                        <div className="grid grid-cols-2 gap-4">
                            {frequency === 'weekly' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Dia da Semana
                                    </label>
                                    <select
                                        value={weekday}
                                        onChange={(e) => setWeekday(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        {WEEKDAYS.map(d => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {frequency === 'monthly' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Dia do Mês (1-5)
                                    </label>
                                    <select
                                        value={dayOfMonth}
                                        onChange={(e) => setDayOfMonth(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        {MONTHLY_DAYS.map(d => (
                                            <option key={d} value={d}>Dia {d}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={`space-y-2 ${frequency === 'daily' ? 'col-span-2' : ''}`}>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Horário de Envio
                                </label>
                                <input
                                    type="time"
                                    value={timeOfDay}
                                    onChange={(e) => setTimeOfDay(e.target.value)}
                                    max="23:59"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>



                        {/* Template with Variable Insert */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Template da Mensagem
                                </label>
                                <button
                                    type="button"
                                    onClick={handleSaveAsTemplate}
                                    className="flex items-center gap-1 text-[10px] text-indigo-600 hover:underline"
                                >
                                    <Bookmark className="w-3 h-3" />
                                    Salvar como Template
                                </button>
                            </div>

                            {/* Variable Insert Chips */}
                            <VariableInsert
                                textareaRef={textareaRef}
                                value={template}
                                onChange={setTemplate}
                            />

                            <textarea
                                ref={textareaRef}
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                rows={6}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                            />
                        </div>

                        {/* Info for multiple selection */}
                        {selectedClientIds.length > 1 && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                                <p className="text-xs text-emerald-700">
                                    <strong>Nota:</strong> Será criado um relatório separado para cada um dos {selectedClientIds.length} clientes selecionados.
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || selectedClientIds.length === 0}
                                className={`flex-1 py-3 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${duplicateMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                            >
                                {duplicateMode ? <Copy className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {loading
                                    ? 'Salvando...'
                                    : duplicateMode
                                        ? `Duplicar (${selectedClientIds.length})`
                                        : isEditing
                                            ? 'Atualizar'
                                            : selectedClientIds.length > 1
                                                ? `Criar (${selectedClientIds.length})`
                                                : 'Criar Relatório'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Template Library Modal */}
            {showTemplates && (
                <TemplateLibrary
                    type="report"
                    onSelect={handleTemplateSelect}
                    onClose={() => setShowTemplates(false)}
                />
            )}
        </>
    );
};
