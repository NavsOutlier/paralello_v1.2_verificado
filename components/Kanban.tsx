import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Badge, Button, Card, Avatar } from './ui';
import { Task } from '../types';

const columns = [
  { id: 'todo', title: 'A Fazer', color: 'bg-slate-100 border-slate-200' },
  { id: 'in-progress', title: 'Em Progresso', color: 'bg-blue-50 border-blue-100' },
  { id: 'review', title: 'Revisão', color: 'bg-amber-50 border-amber-100' },
  { id: 'done', title: 'Concluído', color: 'bg-green-50 border-green-100' },
];

const priorityVariantMap = {
  high: 'danger' as const,
  medium: 'warning' as const,
  low: 'default' as const,
};

export const Kanban: React.FC = () => {
  const { organizationId, isSuperAdmin, permissions } = useAuth();
  const canManage = isSuperAdmin || permissions?.can_manage_tasks;
  const [tasks, setTasks] = useState<(Task & { clientName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
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
  }, [organizationId]);

  const fetchTasks = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const [tasksRes, clientsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('organization_id', organizationId),
        supabase.from('clients').select('id, name').eq('organization_id', organizationId)
      ]);

      const clientMap = new Map((clientsRes.data || []).map(c => [c.id, c.name]));

      setTasks((tasksRes.data || []).map(t => ({
        ...t,
        clientName: clientMap.get(t.client_id) || 'Cliente Desconhecido'
      })));
    } catch (error) {
      console.error('Error fetching Kanban tasks:', error);
    } finally {
      setLoading(false);
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
        {columns.map(col => (
          <div key={col.id} className="flex-1 flex flex-col">
            <div className={`p-3 rounded-t-lg border-t border-x ${col.color} flex justify-between items-center`}>
              <span className="font-semibold text-sm text-slate-700">{col.title}</span>
              <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full text-slate-600">
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            <div className={`flex-1 bg-slate-100/50 p-3 border-x border-b border-slate-200 rounded-b-lg space-y-3 min-h-[100px] overflow-y-auto`}>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : tasks.filter(t => t.status === col.id).map(task => (
                <Card key={task.id} className="p-4 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="primary" size="sm">
                      {task.clientName}
                    </Badge>
                    <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  <h3 className="text-sm font-medium text-slate-800 mb-3">{task.title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      <Avatar name="User" size="sm" />
                    </div>
                    <Badge variant={priorityVariantMap[task.priority]} size="sm">
                      {task.priority}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};