import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    BarChart3, Clock, Plus, Trash2, Edit2, CheckCircle, XCircle,
    Calendar, Copy, Power, FileText
} from 'lucide-react';
import { ScheduledReport } from '../../types/automation';
import { ReportingConfig } from './ReportingConfig';

interface ReportListProps {
    clientId: string;
    clientName: string;
}

export const ReportList: React.FC<ReportListProps> = ({
    clientId,
    clientName
}) => {
    const { organizationId } = useAuth();
    const [reports, setReports] = useState<ScheduledReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConfig, setShowConfig] = useState(false);
    const [editingReport, setEditingReport] = useState<ScheduledReport | undefined>();
    const [duplicatingReport, setDuplicatingReport] = useState<ScheduledReport | undefined>();

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
        if (!confirm('Tem certeza que deseja excluir este relatório agendado?')) return;

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
            console.error('Error updating report status:', error);
            alert('Erro ao atualizar status');
        } else {
            fetchReports();
        }
    };

    const handleEdit = (report: ScheduledReport) => {
        setEditingReport(report);
        setDuplicatingReport(undefined);
        setShowConfig(true);
    };

    const handleDuplicate = (report: ScheduledReport) => {
        setDuplicatingReport(report);
        setEditingReport(report);
        setShowConfig(true);
    };

    const handleConfigClose = () => {
        setShowConfig(false);
        setEditingReport(undefined);
        setDuplicatingReport(undefined);
    };

    const getFrequencyLabel = (freq: string) => {
        switch (freq) {
            case 'daily': return 'Diário';
            case 'weekly': return 'Semanal';
            case 'monthly': return 'Mensal';
            default: return freq;
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-800">Relatórios Agendados</h3>
                    <span className="text-xs text-slate-400">({reports.length})</span>
                </div>
                <button
                    onClick={() => setShowConfig(true)}
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
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Nenhum relatório agendado para este cliente.</p>
                    <button
                        onClick={() => setShowConfig(true)}
                        className="mt-4 text-emerald-600 text-sm font-bold hover:underline"
                    >
                        Criar primeiro relatório
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-all ${!report.is_active ? 'opacity-75 bg-slate-50' : ''
                                }`}
                        >
                            {/* Icon */}
                            <div className={`p-2 rounded-lg ${report.is_active ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                                <BarChart3 className={`w-4 h-4 ${report.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-bold text-sm ${report.is_active ? 'text-slate-800' : 'text-slate-500'}`}>
                                        {report.name}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${report.is_active
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-slate-200 text-slate-500'
                                        }`}>
                                        {report.is_active ? (
                                            <><CheckCircle className="w-3 h-3" /> Ativo</>
                                        ) : (
                                            <><XCircle className="w-3 h-3" /> Inativo</>
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {getFrequencyLabel(report.frequency)}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span>
                                        Horário: {report.time_of_day}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                {/* Duplicate */}
                                <button
                                    onClick={() => handleDuplicate(report)}
                                    className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-slate-400 hover:text-emerald-600"
                                    title="Duplicar"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>

                                {/* Toggle Active */}
                                <button
                                    onClick={() => handleToggleActive(report)}
                                    className={`p-2 rounded-lg transition-colors ${report.is_active
                                        ? 'hover:bg-red-50 text-slate-400 hover:text-red-600'
                                        : 'hover:bg-green-50 text-slate-400 hover:text-green-600'
                                        }`}
                                    title={report.is_active ? 'Desativar' : 'Ativar'}
                                >
                                    <Power className="w-4 h-4" />
                                </button>

                                {/* Edit */}
                                <button
                                    onClick={() => handleEdit(report)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => handleDelete(report.id)}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Config Modal */}
            {showConfig && (
                <ReportingConfig
                    clientId={clientId}
                    clientName={clientName}
                    onClose={handleConfigClose}
                    onSuccess={() => {
                        handleConfigClose();
                        fetchReports();
                    }}
                    editingReport={editingReport}
                    duplicateMode={!!duplicatingReport}
                />
            )}
        </div>
    );
};
