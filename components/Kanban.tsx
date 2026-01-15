import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, Loader2, GripVertical, Clock, Flag, MessageSquare, Calendar, CheckCircle2, Circle, PlayCircle, Eye, Archive, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Task } from '../types';

const columns = [
  {
    id: 'todo',
    title: 'Pendente',
    icon: Circle,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50/30',
    border: 'border-amber-200/50',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400'
  },
  {
    id: 'in-progress',
    title: 'Em Progresso',
    icon: PlayCircle,
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50/30',
    border: 'border-blue-200/50',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-400'
  },
  {
    id: 'review',
    title: 'Revisão',
    icon: Eye,
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-50/30',
    border: 'border-violet-200/50',
    badge: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-400'
  },
  {
    id: 'done',
    title: 'Concluído',
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50/30',
    border: 'border-emerald-200/50',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-400'
  },
];

const priorityConfig = {
  high: { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Alta' },
  medium: { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Média' },
  low: { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Baixa' },
};

export const Kanban: React.FC = () => {
  const { organizationId, isSuperAdmin, permissions, user, isManager } = useAuth();
  const canManage = isSuperAdmin || permissions?.can_manage_tasks;
  const [tasks, setTasks] = useState<(Task & { clientName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId && user) {
      fetchTasks();

      const channel = supabase
        .channel(`kanban-${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `organization_id=eq.${organizationId}`
          },
          () => {
            fetchTasks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [organizationId, user]);

  const fetchTasks = async () => {
    if (!organizationId || !user) return;
    try {
      setLoading(true);

      const [tasksRes, clientsRes, assignmentsRes, memberRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('organization_id', organizationId).is('archived_at', null),
        supabase.from('clients').select('id, name').eq('organization_id', organizationId),
        supabase.from('client_assignments').select('client_id, team_member_id').eq('organization_id', organizationId),
        supabase.from('team_members').select('id, role').eq('organization_id', organizationId).eq('profile_id', user.id).single()
      ]);

      const clientMap = new Map((clientsRes.data || []).map(c => [c.id, c.name]));

      let filteredTasks = tasksRes.data || [];

      const member = memberRes.data;
      const isManagerOrSuperAdmin = isSuperAdmin || isManager || (member && member.role === 'manager');

      if (!isManagerOrSuperAdmin && member) {
        const assignedClientIds = new Set(
          (assignmentsRes.data || [])
            .filter(a => a.team_member_id === member.id)
            .map(a => a.client_id)
        );
        filteredTasks = filteredTasks.filter(t => assignedClientIds.has(t.client_id));
      }

      setTasks(filteredTasks.map(t => ({
        ...t,
        clientId: t.client_id,
        assigneeId: t.assignee_id,
        clientName: clientMap.get(t.client_id) || 'Sem Cliente'
      })));
    } catch (error) {
      console.error('Error fetching Kanban tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggedTaskId(null);

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: targetStatus as Task['status'] } : t
    ));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: targetStatus })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task status:', error);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      fetchTasks();
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    return `${day} ${month}`;
  };

  const totalTasks = tasks.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quadro de Tarefas</h1>
            <p className="text-sm text-slate-500 mt-1">
              {totalTasks} {totalTasks === 1 ? 'tarefa' : 'tarefas'} no total
            </p>
          </div>
          {canManage && (
            <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95">
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-5 h-full min-w-max">
          {columns.map(col => {
            const columnTasks = tasks.filter(t => t.status === col.id);
            const isOver = dragOverColumn === col.id;
            const Icon = col.icon;

            return (
              <div
                key={col.id}
                className="w-[320px] flex flex-col"
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 rounded-t-2xl ${col.bg} border-t border-x ${col.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${col.gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{col.title}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">{columnTasks.length} itens</p>
                    </div>
                  </div>
                  {col.id === 'todo' && canManage && (
                    <button className="p-2 hover:bg-white/60 rounded-lg transition-colors text-slate-400 hover:text-indigo-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Column Content */}
                <div
                  className={`flex-1 p-3 border-x border-b rounded-b-2xl space-y-3 overflow-y-auto transition-all duration-200 ${isOver
                    ? 'bg-indigo-50/80 border-indigo-200 ring-2 ring-indigo-200 ring-inset'
                    : `${col.bg} ${col.border}`
                    }`}
                  style={{ maxHeight: 'calc(100vh - 280px)' }}
                >
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                      <p className="text-xs text-slate-400 mt-2">Carregando...</p>
                    </div>
                  ) : columnTasks.length === 0 ? (
                    <div className={`h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all ${isOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200/60'
                      }`}>
                      <div className={`w-10 h-10 rounded-full ${col.bg} flex items-center justify-center mb-2`}>
                        <Icon className={`w-5 h-5 ${isOver ? 'text-indigo-500' : 'text-slate-300'}`} />
                      </div>
                      <span className={`text-xs font-medium ${isOver ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isOver ? 'Solte aqui' : 'Nenhuma tarefa'}
                      </span>
                    </div>
                  ) : columnTasks.map(task => {
                    const priority = priorityConfig[task.priority] || priorityConfig.medium;
                    const isDragging = draggedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className={`group transition-all duration-200 ${isDragging
                          ? 'opacity-40 scale-95 rotate-2'
                          : 'opacity-100 hover:scale-[1.02]'
                          }`}
                      >
                        <div className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md border border-slate-100 transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'shadow-xl' : ''
                          }`}>
                          {/* Card Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                {task.clientName}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to task details via deep link
                                  window.location.href = `/?task=${task.id}`;
                                }}
                                className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                                title="Ver detalhes"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // Archive the task
                                  try {
                                    await supabase
                                      .from('tasks')
                                      .update({ archived_at: new Date().toISOString() })
                                      .eq('id', task.id);
                                    // Remove from local state
                                    setTasks(prev => prev.filter(t => t.id !== task.id));
                                  } catch (error) {
                                    console.error('Error archiving task:', error);
                                  }
                                }}
                                className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors text-slate-400 hover:text-rose-600"
                                title="Arquivar tarefa"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm font-semibold text-slate-800 mb-3 leading-snug line-clamp-2 pl-6">
                            {task.title}
                          </h4>

                          {/* Footer */}
                          <div className="flex items-center justify-between pl-6">
                            <div className="flex items-center gap-2">
                              {/* Priority */}
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${priority.bg} border ${priority.border}`}>
                                <Flag className={`w-3 h-3 ${priority.color} fill-current`} />
                                <span className={`text-[10px] font-bold ${priority.color}`}>{priority.label}</span>
                              </div>

                              {/* Deadline */}
                              {task.deadline && (
                                <div className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  <span className="text-[10px] font-medium">{formatDate(task.deadline)}</span>
                                </div>
                              )}
                            </div>

                            {/* Avatar */}
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                              {task.clientName?.charAt(0) || 'U'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};