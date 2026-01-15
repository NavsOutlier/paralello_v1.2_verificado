import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, Loader2, GripVertical } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Badge, Button, Card, Avatar } from './ui';
import { Task } from '../types';

const columns = [
  { id: 'todo', title: 'A Fazer', color: 'bg-slate-100 border-slate-200', hoverColor: 'bg-blue-50' },
  { id: 'in-progress', title: 'Em Progresso', color: 'bg-blue-50 border-blue-100', hoverColor: 'bg-blue-100' },
  { id: 'review', title: 'Revisão', color: 'bg-amber-50 border-amber-100', hoverColor: 'bg-amber-100' },
  { id: 'done', title: 'Concluído', color: 'bg-green-50 border-green-100', hoverColor: 'bg-green-100' },
];

const priorityVariantMap = {
  high: 'danger' as const,
  medium: 'warning' as const,
  low: 'default' as const,
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

      // Realtime subscription
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

      // Fetch tasks, clients, and assignments in parallel
      const [tasksRes, clientsRes, assignmentsRes, memberRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('organization_id', organizationId).is('archived_at', null),
        supabase.from('clients').select('id, name').eq('organization_id', organizationId),
        supabase.from('client_assignments').select('client_id, team_member_id').eq('organization_id', organizationId),
        supabase.from('team_members').select('id, role').eq('organization_id', organizationId).eq('profile_id', user.id).single()
      ]);

      const clientMap = new Map((clientsRes.data || []).map(c => [c.id, c.name]));

      let filteredTasks = tasksRes.data || [];

      // Filter by client assignments if not a manager/superadmin
      const member = memberRes.data;
      const isManagerOrSuperAdmin = isSuperAdmin || isManager || (member && member.role === 'manager');

      if (!isManagerOrSuperAdmin && member) {
        // Get client IDs this member is assigned to
        const assignedClientIds = new Set(
          (assignmentsRes.data || [])
            .filter(a => a.team_member_id === member.id)
            .map(a => a.client_id)
        );

        // Filter tasks to only those from assigned clients
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

    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTaskId(null);
    setDragOverColumn(null);

    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
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
    // Only clear if we're leaving the column entirely
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

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: targetStatus as Task['status'] } : t
    ));

    // Persist to database
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: targetStatus })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task status:', error);
        // Revert on error
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      fetchTasks();
    }
  };

  return (
    <div className="flex-1 p-6 bg-slate-50 overflow-x-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Quadro de Tarefas</h1>
        {canManage && (
          <Button icon={<Plus className="w-4 h-4" />}>
            Nova Tarefa
          </Button>
        )}
      </div>

      <div className="flex-1 flex gap-6 min-w-[1000px]">
        {columns.map(col => {
          const columnTasks = tasks.filter(t => t.status === col.id);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              className="flex-1 flex flex-col"
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={`p-3 rounded-t-lg border-t border-x ${col.color} flex justify-between items-center`}>
                <span className="font-semibold text-sm text-slate-700">{col.title}</span>
                <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full text-slate-600">
                  {columnTasks.length}
                </span>
              </div>
              <div
                className={`flex-1 p-3 border-x border-b border-slate-200 rounded-b-lg space-y-3 min-h-[100px] overflow-y-auto transition-colors duration-200 ${isOver
                    ? 'bg-indigo-100/80 ring-2 ring-indigo-300 ring-inset'
                    : 'bg-slate-100/50'
                  }`}
              >
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : columnTasks.length === 0 ? (
                  <div className={`h-20 flex items-center justify-center border-2 border-dashed rounded-lg transition-colors ${isOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
                    }`}>
                    <span className="text-xs text-slate-400 font-medium">
                      {isOver ? 'Solte aqui' : 'Nenhuma tarefa'}
                    </span>
                  </div>
                ) : columnTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all duration-200 ${draggedTaskId === task.id
                        ? 'opacity-50 scale-95'
                        : 'opacity-100 hover:scale-[1.02]'
                      }`}
                  >
                    <Card className="p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-slate-300" />
                          <Badge variant="primary" size="sm">
                            {task.clientName}
                          </Badge>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-sm font-medium text-slate-800 mb-3 pl-6">{task.title}</h3>
                      <div className="flex items-center justify-between pl-6">
                        <div className="flex -space-x-2">
                          <Avatar name="User" size="sm" />
                        </div>
                        <Badge variant={priorityVariantMap[task.priority]} size="sm">
                          {task.priority}
                        </Badge>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};