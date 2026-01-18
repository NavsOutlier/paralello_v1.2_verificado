import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';
import {
    BarChart3, Plus, Trash2, Edit2, Play, Pause, Clock, Calendar, CheckCircle
} from 'lucide-react';
import { ScheduledReport, AVAILABLE_METRICS, WEEKDAYS } from '../../types/automation';
import { ReportingConfig } from './ReportingConfig';

interface ReportListProps {
    clientId: string;
    clientName: string;
}

export const ReportList: React.FC<ReportListProps> = ({
    clientId,
    clientName
}) => {
    const { organizationId } = useOrganization();
    const [reports, setReports] = useState<ScheduledReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingReport, setEditingReport] = useState<ScheduledReport | undefined>();

    const fetchReports = async () => {
        if (!organizationId || !clientId) return;

        setLoading(true);
        const { data, error } = await supabase
            .from('scheduled_reports')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reports:', error);
        } else {
            setReports(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReports();
    }, [organizationId, clientId]);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este relatório?')) return;

        const { error } = await supabase
            .from('scheduled_reports')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting report:', error);
            alert('Erro ao excluir relatório');
        } else {
            fetchReports();
        }
    };

    const handleToggleActive = async (report: ScheduledReport) => {
        const { error } = await supabase
            .from('scheduled_reports')
            .update({ is_active: !report.is_active })
            .eq('id', report.id);

        if (error) {
            console.error('Error toggling report:', error);
        } else {
            fetchReports();
        }
    };

    const handleEdit = (report: ScheduledReport) => {
        setEditingReport(report);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingReport(undefined);
    };

    const getFrequencyLabel = (report: ScheduledReport) => {
        if (report.frequency === 'weekly') {
            const day = WEEKDAYS.find(d => d.value === report.weekday);
            return `Semanal (${day?.label || 'N/A'})`;
        } else {
            return `Mensal (Dia ${report.day_of_month})`;
        }
    };

    const getMetricLabels = (metrics: string[]) => {
        return metrics
            .map(key => AVAILABLE_METRICS.find(m => m.key === key)?.label)
            .filter(Boolean)
            .join(', ');
    };

    const formatNextRun = (isoString?: string) => {
        if (!isoString) return 'Não agendado';
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-800">Relatórios Automáticos</h3>
                    <span className="text-xs text-slate-400">({reports.length})</span>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Novo Relatório
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                </div>
            ) : reports.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center">
                    <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Nenhum relatório configurado para este cliente.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 text-emerald-600 text-sm font-bold hover:underline"
                    >
                        Configurar primeiro relatório
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className={`bg-white border rounded-xl p-4 transition-all ${!report.is_active ? 'opacity-50' : ''
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Status Icon */}
                                <div className={`p-2 rounded-lg ${report.is_active ? 'bg-emerald-100' : 'bg-slate-100'
                                    }`}>
                                    <BarChart3 className={`w-5 h-5 ${report.is_active ? 'text-emerald-600' : 'text-slate-400'
                                        }`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800">{report.name}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${report.is_active
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {report.is_active ? 'Ativo' : 'Pausado'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {getFrequencyLabel(report)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {report.time_of_day}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            {getMetricLabels(report.metrics)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Próximo envio: {formatNextRun(report.next_run)}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleToggleActive(report)}
                                        className={`p-2 rounded-lg transition-colors ${report.is_active
                                                ? 'hover:bg-orange-50 text-slate-400 hover:text-orange-600'
                                                : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                                            }`}
                                        title={report.is_active ? 'Pausar' : 'Ativar'}
                                    >
                                        {report.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(report)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(report.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
                                        title="Excluir"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <ReportingConfig
                    clientId={clientId}
                    clientName={clientName}
                    onClose={handleFormClose}
                    onSuccess={fetchReports}
                    editingReport={editingReport}
                />
            )}
        </div>
    );
};
