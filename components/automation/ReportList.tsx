import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    BarChart3, Clock, Plus, Trash2, Edit2, CheckCircle, XCircle,
    Calendar, Copy, Power, FileText, Loader2
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
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-black text-white tracking-tight">Relatórios Agendados</h3>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">({reports.length})</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowConfig(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Novo Relatório
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
            ) : reports.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-10 text-center border border-white/5 shadow-2xl">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                        <FileText className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400 text-sm font-bold">Nenhum relatório agendado para este cliente.</p>
                    <button
                        onClick={() => setShowConfig(true)}
                        className="mt-4 text-emerald-400 text-xs font-black uppercase tracking-widest hover:underline"
                    >
                        Criar primeiro relatório
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className={`bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex items-start gap-4 transition-all hover:border-white/10 ${!report.is_active ? 'opacity-60' : ''
                                }`}
                        >
                            {/* Icon */}
                            <div className={`p-2.5 rounded-xl border ${report.is_active ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800 border-white/5'}`}>
                                <BarChart3 className={`w-4 h-4 ${report.is_active ? 'text-emerald-400' : 'text-slate-500'}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className={`font-black text-sm ${report.is_active ? 'text-white' : 'text-slate-500'}`}>
                                        {report.name}
                                    </h4>
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${report.is_active
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-slate-700 text-slate-400 border-white/5'
                                        }`}>
                                        {report.is_active ? (
                                            <><CheckCircle className="w-3 h-3" /> Ativo</>
                                        ) : (
                                            <><XCircle className="w-3 h-3" /> Inativo</>
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{getFrequencyLabel(report.frequency)}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-[10px] font-bold text-slate-400">Horário: <strong className="text-emerald-400">{report.time_of_day}</strong></span>
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                {/* Duplicate */}
                                <button
                                    onClick={() => handleDuplicate(report)}
                                    className="p-2.5 hover:bg-emerald-500/10 rounded-xl transition-colors text-slate-500 hover:text-emerald-400 border border-white/5"
                                    title="Duplicar"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>

                                {/* Toggle Active */}
                                <button
                                    onClick={() => handleToggleActive(report)}
                                    className={`p-2.5 rounded-xl transition-colors border border-white/5 ${report.is_active
                                        ? 'hover:bg-rose-500/10 text-slate-500 hover:text-rose-400'
                                        : 'hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400'
                                        }`}
                                    title={report.is_active ? 'Desativar' : 'Ativar'}
                                >
                                    <Power className="w-4 h-4" />
                                </button>

                                {/* Edit */}
                                <button
                                    onClick={() => handleEdit(report)}
                                    className="p-2.5 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-slate-300 border border-white/5"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => handleDelete(report.id)}
                                    className="p-2.5 hover:bg-rose-500/10 rounded-xl transition-colors text-slate-500 hover:text-rose-400 border border-white/5"
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
