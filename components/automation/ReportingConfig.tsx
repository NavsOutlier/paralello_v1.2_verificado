import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    BarChart3, Clock, X, Save, Calendar, CheckCircle2
} from 'lucide-react';
import { ScheduledReport, AVAILABLE_METRICS, WEEKDAYS } from '../../types/automation';

interface ReportingConfigProps {
    clientId: string;
    clientName: string;
    onClose: () => void;
    onSuccess?: () => void;
    editingReport?: ScheduledReport;
}

export const ReportingConfig: React.FC<ReportingConfigProps> = ({
    clientId,
    clientName,
    onClose,
    onSuccess,
    editingReport
}) => {
    const { organizationId, user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState('Resumo Semanal');
    const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
    const [weekday, setWeekday] = useState(1); // Monday
    const [dayOfMonth, setDayOfMonth] = useState(1);
    const [timeOfDay, setTimeOfDay] = useState('09:00');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['leads', 'conversions', 'cpl']);
    const [template, setTemplate] = useState(
        '📊 *Resumo {{frequency}}*\n\n' +
        '{{metrics_list}}\n\n' +
        '✅ Período: {{period}}'
    );

    // Initialize from editing report if provided
    useEffect(() => {
        if (editingReport) {
            setName(editingReport.name);
            setFrequency(editingReport.frequency as 'weekly' | 'monthly');
            setWeekday(editingReport.weekday || 1);
            setDayOfMonth(editingReport.day_of_month || 1);
            setTimeOfDay(editingReport.time_of_day);
            setSelectedMetrics(editingReport.metrics || []);
            setTemplate(editingReport.template || '');
        }
    }, [editingReport]);

    const toggleMetric = (key: string) => {
        setSelectedMetrics(prev =>
            prev.includes(key)
                ? prev.filter(m => m !== key)
                : [...prev, key]
        );
    };

    const calculateNextRun = (): string => {
        const now = new Date();
        const [hours, minutes] = timeOfDay.split(':').map(Number);

        if (frequency === 'weekly') {
            const daysUntilNext = (weekday - now.getDay() + 7) % 7 || 7;
            const nextRun = new Date(now);
            nextRun.setDate(now.getDate() + daysUntilNext);
            nextRun.setHours(hours, minutes, 0, 0);
            if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 7);
            return nextRun.toISOString();
        } else {
            const nextRun = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes);
            if (nextRun <= now) nextRun.setMonth(nextRun.getMonth() + 1);
            return nextRun.toISOString();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId || selectedMetrics.length === 0) return;

        setLoading(true);
        try {
            const reportData = {
                organization_id: organizationId,
                client_id: clientId,
                name,
                frequency,
                weekday: frequency === 'weekly' ? weekday : null,
                day_of_month: frequency === 'monthly' ? dayOfMonth : null,
                time_of_day: timeOfDay,
                metrics: selectedMetrics,
                template,
                is_active: true,
                next_run: calculateNextRun(),
                created_by: user?.id
            };

            if (editingReport) {
                const { error } = await supabase
                    .from('scheduled_reports')
                    .update(reportData)
                    .eq('id', editingReport.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('scheduled_reports')
                    .insert(reportData);
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl">
                            <BarChart3 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">
                                {editingReport ? 'Editar Relatório' : 'Novo Relatório Automático'}
                            </h2>
                            <p className="text-xs text-slate-500">Cliente: {clientName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFrequency('weekly')}
                                className={`p-4 rounded-xl border-2 transition-all ${frequency === 'weekly'
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                <Calendar className="w-5 h-5 mx-auto mb-2" />
                                <span className="text-sm font-bold">Semanal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFrequency('monthly')}
                                className={`p-4 rounded-xl border-2 transition-all ${frequency === 'monthly'
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                <BarChart3 className="w-5 h-5 mx-auto mb-2" />
                                <span className="text-sm font-bold">Mensal</span>
                            </button>
                        </div>
                    </div>

                    {/* Day Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        {frequency === 'weekly' ? (
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
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Dia do Mês
                                </label>
                                <select
                                    value={dayOfMonth}
                                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                >
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                                        <option key={d} value={d}>Dia {d}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Horário
                            </label>
                            <input
                                type="time"
                                value={timeOfDay}
                                onChange={(e) => setTimeOfDay(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Metrics Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Métricas do Relatório
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {AVAILABLE_METRICS.map(metric => (
                                <button
                                    key={metric.key}
                                    type="button"
                                    onClick={() => toggleMetric(metric.key)}
                                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${selectedMetrics.includes(metric.key)
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {selectedMetrics.includes(metric.key) && (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    <span className="text-xs font-bold">{metric.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Template Preview */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Template da Mensagem
                        </label>
                        <textarea
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                        />
                        <p className="text-[10px] text-slate-400">
                            Placeholders: {'{{frequency}}'}, {'{{metrics_list}}'}, {'{{period}}'}
                        </p>
                    </div>

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
                            disabled={loading || selectedMetrics.length === 0}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Salvando...' : editingReport ? 'Atualizar' : 'Criar Relatório'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
