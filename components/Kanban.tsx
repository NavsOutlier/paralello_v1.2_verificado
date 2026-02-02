import React, { useState, useEffect } from 'react';
import {
  MoreHorizontal, Plus, Loader2, GripVertical, Flag,
  MessageSquare, Calendar, CheckCircle2, Circle,
  PlayCircle, Eye, Archive, ExternalLink, Settings2,
  Trash2, Save, X, Palette, Pencil, ArrowLeft, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Task, KanbanStage, User as UIUser, ChecklistItem, ChecklistTemplate, DiscussionDraft } from '../types';
import { TaskCreation } from './workspace/TaskCreation'; // Reusing the existing component for consistency
// Removed Headless UI imports to fix whitespace error

const priorityConfig = {
  high: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Alta' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Média' },
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Baixa' },
};

const STAGE_COLORS = [
  '#cbd5e1', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#818cf8', '#a78bfa', '#f472b6',
  '#22d3ee', '#a3e635', '#fb923c'
];

// Helper Component for Delete Confirmation
const DeleteStageButton = ({ onDelete }: { onDelete: () => void }) => {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (confirming) {
      const timer = setTimeout(() => setConfirming(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirming]);

  if (confirming) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="ml-2 px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-right-2 hover:bg-rose-500/30 transition-colors flex items-center gap-1.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Confirmar?
      </button>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      className="ml-2 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
      title="Excluir Coluna"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
};

export const Kanban: React.FC = () => {
  const { organizationId, isSuperAdmin, permissions, user, isManager } = useAuth();
  const canManage = isSuperAdmin || permissions?.can_manage_tasks;

  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [tasks, setTasks] = useState<(Task & { clientName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<UIUser[]>([]); // New state for team members
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]); // New state for templates
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]); // New state for clients

  // Task Creation Modal State
  const [isTaskCreationOpen, setIsTaskCreationOpen] = useState(false);
  const [selectedStageForCreation, setSelectedStageForCreation] = useState<string | null>(null);

  // Interface/Management State
  const [isEditingStages, setIsEditingStages] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageEditName, setStageEditName] = useState('');
  const [stageEditColor, setStageEditColor] = useState('');

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId && user) {
      fetchData();

      const tasksChannel = supabase
        .channel(`kanban-tasks-${organizationId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `organization_id=eq.${organizationId}` }, () => fetchTasks())
        .subscribe();

      const stagesChannel = supabase
        .channel(`kanban-stages-${organizationId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_stages', filter: `organization_id=eq.${organizationId}` }, () => fetchStages())
        .subscribe();

      return () => {
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(stagesChannel);
      };
    }
  }, [organizationId, user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStages(), fetchTasks(), fetchTeamMembers(), fetchChecklistTemplates(), fetchClients()]);
    setLoading(false);
  };

  const fetchClients = async () => {
    if (!organizationId) return;
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('name');

    if (data) setClients(data);
  };

  const fetchTeamMembers = async () => {
    if (!organizationId) return;
    const { data } = await supabase
      .from('team_members')
      .select('id, name, avatar, role, job_title')
      .eq('organization_id', organizationId);

    if (data) {
      setTeamMembers(data.map(m => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar || '', // Handle potentially null avatar
        role: 'team',
        jobTitle: m.job_title
      })));
    }
  };

  const fetchChecklistTemplates = async () => {
    if (!organizationId) return;
    // Mock or fetch real templates if table exists. Using empty mainly to satisfy prop.
    // In a real scenario, you'd fetch from checklist_templates table
    setChecklistTemplates([]);
  };

  const fetchStages = async () => {
    if (!organizationId) return;
    const { data } = await supabase
      .from('kanban_stages')
      .select('*')
      .eq('organization_id', organizationId)
      .order('order_index', { ascending: true });

    if (data) setStages(data);
  };

  const fetchTasks = async () => {
    if (!organizationId || !user) return;
    try {
      const [tasksRes, clientsRes, assignmentsRes, memberRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('organization_id', organizationId).is('archived_at', null),
        supabase.from('clients').select('id, name').eq('organization_id', organizationId),
        supabase.from('client_assignments').select('client_id, team_member_id').eq('organization_id', organizationId),
        supabase.from('team_members').select('id, role, profile_id').eq('organization_id', organizationId).eq('profile_id', user.id).single()
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
    }
  };

  // Stage Management Handlers
  const handleAddStage = async () => {
    if (!organizationId) return;
    const newStage = {
      organization_id: organizationId,
      name: 'Nova Etapa',
      order_index: stages.length,
      color: STAGE_COLORS[0]
    };
    const { data, error } = await supabase.from('kanban_stages').insert(newStage).select().single();
    if (error) console.error('Error adding stage:', error);
    else if (data) {
      setStages([...stages, data]);
      setEditingStageId(data.id);
      setStageEditName(data.name);
      setStageEditColor(data.color);
    }
  };

  const handleUpdateStage = async (id: string) => {
    const { error } = await supabase
      .from('kanban_stages')
      .update({ name: stageEditName, color: stageEditColor })
      .eq('id', id);

    if (error) console.error('Error updating stage:', error);
    else {
      setStages(stages.map(s => s.id === id ? { ...s, name: stageEditName, color: stageEditColor } : s));
      setEditingStageId(null);
    }
  };

  const handleDeleteStage = async (id: string) => {
    // Confirmation already handled by UI
    const { error } = await supabase.from('kanban_stages').delete().eq('id', id);
    if (error) console.error('Error deleting stage:', error);
    else setStages(stages.filter(s => s.id !== id));
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverColumnId(stageId);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setDragOverColumnId(null);
    setDraggedTaskId(null);

    if (!taskId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.stage_id === targetStageId) return;

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, stage_id: targetStageId } : t));

    const { error } = await supabase.from('tasks').update({ stage_id: targetStageId }).eq('id', taskId);
    if (error) {
      console.error('Error updating task stage:', error);
      fetchTasks();
    }
  };



  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    return `${day} ${month}`;
  };

  // Column Reordering with Arrows
  const moveStage = async (stageId: string, direction: 'left' | 'right') => {
    const currentIndex = stages.findIndex(s => s.id === stageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    // Boundary checks
    if (newIndex < 0 || newIndex >= stages.length) return;

    const currentStages = [...stages];
    const stageToMove = currentStages[currentIndex];

    // Swap elements
    currentStages[currentIndex] = currentStages[newIndex];
    currentStages[newIndex] = stageToMove;

    // Update Order Indexes
    const updatedStages = currentStages.map((s, idx) => ({ ...s, order_index: idx }));
    setStages(updatedStages);

    // Persist to database
    try {
      const updates = updatedStages.map(s => ({
        id: s.id,
        order_index: s.order_index,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('kanban_stages').upsert(updates);
      if (error) console.error('Error updating stage order:', error);
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  // Drag to Scroll Logic
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;

    // Disable drag to scroll when editing stages (to allow drag and drop of columns)
    if (isEditingStages) return;

    // Don't trigger if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[draggable="true"]')) return;

    setIsDraggingBoard(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDraggingBoard(false);
  };

  const handleMouseUp = () => {
    setIsDraggingBoard(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBoard || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Carregando quadro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent min-h-0 min-w-0">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 md:py-6 border-b border-cyan-500/10 bg-slate-900/40 backdrop-blur-md relative z-20 flex-none">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              Quadro de Tarefas
              <span className="text-xs font-bold px-2.5 py-1 bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20">
                {tasks.length} total
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 italic">Personalize as etapas do seu fluxo de trabalho</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsEditingStages(!isEditingStages)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${isEditingStages ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700'
                }`}
            >
              <Settings2 className="w-4 h-4" />
              {isEditingStages ? 'Pronto' : 'Editar Etapas'}
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden bg-transparent ${isEditingStages ? 'cursor-default' : (isDraggingBoard ? 'cursor-grabbing' : 'cursor-grab')}
          [&::-webkit-scrollbar]:h-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-cyan-500/20
          [&::-webkit-scrollbar-thumb]:rounded-full
          hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40`}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div className="flex gap-6 h-full w-max p-8 pr-32 pb-8">
          {stages.map(stage => {
            const stageTasks = tasks.filter(t => t.stage_id === stage.id);
            const isOver = dragOverColumnId === stage.id;
            const isEditing = editingStageId === stage.id;

            return (
              <div
                key={stage.id}
                className={`w-[85vw] sm:w-80 flex-shrink-0 flex flex-col group/stage rounded-2xl transition-all duration-300 ${isOver ? 'bg-indigo-500/5 ring-2 ring-indigo-500/20 ring-inset' : 'bg-slate-900/40 backdrop-blur-xl border border-white/5'}`}
                style={{
                  borderTop: `4px solid ${stage.color}`
                }}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Stage Header */}
                <div className="mb-3 mt-3 flex items-center justify-between px-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">

                    {isEditingStages ? (
                      <div className="flex items-center gap-1 w-full">
                        {/* Arrows for Reordering */}
                        <div className="flex mr-2 bg-slate-800 rounded-lg p-0.5 border border-white/5">
                          <button
                            onClick={() => moveStage(stage.id, 'left')}
                            disabled={stages.findIndex(s => s.id === stage.id) === 0}
                            className="p-1 hover:bg-slate-700 hover:shadow-sm rounded disabled:opacity-20 transition-all text-slate-400"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveStage(stage.id, 'right')}
                            disabled={stages.findIndex(s => s.id === stage.id) === stages.length - 1}
                            className="p-1 hover:bg-slate-700 hover:shadow-sm rounded disabled:opacity-20 transition-all text-slate-400"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isEditing ? (
                          <input
                            type="text"
                            value={stageEditName}
                            onChange={(e) => setStageEditName(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm bg-slate-800 border border-indigo-500/30 rounded text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                            placeholder="Nome da etapa"
                            autoFocus
                            onBlur={() => handleUpdateStage(stage.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateStage(stage.id)}
                          />
                        ) : (
                          <h3
                            className="font-black text-slate-300 text-sm truncate uppercase tracking-widest cursor-pointer hover:text-white flex-1 border border-transparent hover:border-white/10 px-2 py-1 rounded transition-all"
                            onClick={() => {
                              setEditingStageId(stage.id);
                              setStageEditName(stage.name);
                              setStageEditColor(stage.color);
                            }}
                          >
                            {stage.name}
                          </h3>
                        )}

                        {/* Delete Button */}
                        <DeleteStageButton onDelete={() => handleDeleteStage(stage.id)} />
                      </div>
                    ) : (
                      <div className="min-w-0 flex items-center gap-2">
                        <h3 className="font-extrabold text-sm uppercase tracking-tighter truncate" style={{ color: stage.color }}>
                          {stage.name}
                        </h3>
                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 border border-white/5"
                          style={{ color: stage.color }}
                        >
                          {stageTasks.length}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add Task Button per Column */}
                    {canManage && !isEditingStages && (
                      <button
                        onClick={() => {
                          setSelectedStageForCreation(stage.id);
                          setIsTaskCreationOpen(true);
                        }}
                        className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-cyan-400 rounded-lg transition-all"
                        title="Adicionar tarefa nesta etapa"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}

                    {isEditingStages && !isEditing && (
                      <button
                        onClick={() => {
                          setEditingStageId(stage.id);
                          setStageEditName(stage.name);
                          setStageEditColor(stage.color);
                        }}
                        className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-indigo-400 rounded-lg transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {isEditingStages && isEditing && (
                  <div className="flex items-center gap-1 justify-center mt-2 pb-2">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800/80 backdrop-blur-md rounded-full border border-white/10">
                      {STAGE_COLORS.map(c => (
                        <button
                          key={c}
                          onMouseDown={(e) => e.preventDefault()} // Prevent blur of input
                          onClick={async () => {
                            setStageEditColor(c); // Sync edit state

                            // Optimistic update
                            setStages(stages.map(s => s.id === stage.id ? { ...s, color: c } : s));

                            const { error } = await supabase.from('kanban_stages').update({ color: c }).eq('id', stage.id);
                            if (error) {
                              console.error('Error updating color:', error);
                            }
                          }}
                          className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-125 ${stage.color === c ? 'border-cyan-400 scale-110' : 'border-white/20'}`}
                          style={{ backgroundColor: c }}
                          title="Mudar cor"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Column Body */}
                <div
                  className={`flex-1 flex flex-col gap-3 p-3 transition-all duration-300 overflow-y-auto overflow-x-hidden custom-scrollbar ${isOver ? 'bg-indigo-500/5 ring-1 ring-indigo-500/20 ring-inset' : 'bg-transparent'
                    }`}
                  style={{ minHeight: '150px', maxHeight: 'calc(100vh - 280px)' }}
                >
                  {stageTasks.map(task => {
                    const priority = priorityConfig[task.priority] || priorityConfig.medium;
                    const isDragging = draggedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={() => setDraggedTaskId(null)}
                        className={`group bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40 scale-95 shadow-none' : ''
                          }`}
                      >
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2.5 py-1.5 rounded-lg uppercase tracking-wider truncate max-w-[150px] border border-cyan-500/20">
                            {task.clientName}
                          </span>
                          <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/5 rounded-lg transition-all" onClick={() => window.location.href = `/?task=${task.id}`}>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400" />
                          </button>
                        </div>

                        <h4 className="text-[13px] font-bold text-slate-200 mb-4 leading-relaxed line-clamp-3 group-hover:text-white transition-colors">
                          {task.title}
                        </h4>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                          <div className={`flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase ${priority.color}`}>
                            <Flag className="w-3 h-3 fill-current" />
                            {priority.label}
                          </div>

                          <div className="flex items-center -space-x-1.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black border-2 border-slate-900 shadow-lg">
                              {task.clientName?.charAt(0) || 'U'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stageTasks.length === 0 && !isOver && (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl py-12 opacity-40">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                        <Plus className="w-5 h-5 text-slate-600" />
                      </div>
                      <p className="text-[10px] font-black text-slate-600 tracking-widest">VAZIO</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isEditingStages && (
            <button
              onClick={handleAddStage}
              className="w-[85vw] sm:w-80 flex-shrink-0 flex flex-col items-center justify-center border-4 border-dashed border-white/5 rounded-[2rem] group hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all min-h-[300px] mb-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-900/60 shadow-xl border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
                <Plus className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-sm font-black text-slate-500 group-hover:text-cyan-400 transition-colors uppercase tracking-widest">Adicionar Coluna</p>
            </button>
          )}
        </div>
      </div>
      {/* Task Creation Modal */}
      {
        isTaskCreationOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
              onClick={() => setIsTaskCreationOpen(false)}
            />

            {/* Modal Panel */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[#0a0f1a] shadow-2xl border border-white/10 transition-all h-[80vh] z-50">
                <TaskCreation
                  draft={{ sourceMessage: { id: 'manual', content: '', senderId: user?.id || '', timestamp: new Date(), type: 'text' }, type: 'task' }}
                  existingTasks={tasks}
                  teamMembers={teamMembers}
                  checklistTemplates={checklistTemplates}
                  clients={clients}
                  onCancel={() => setIsTaskCreationOpen(false)}
                  onAttach={() => { }} // Not needed for pure creation functionality here
                  onCreate={async (data, comment) => {
                    try {
                      // Validate if client is selected if necessary, or allow null for internal tasks

                      const { data: newTask, error } = await supabase.from('tasks').insert({
                        title: data.title,
                        priority: data.priority,
                        status: data.status, // We might override this with stage logic below if needed, but keeping for compatibility
                        assignee_ids: data.assigneeIds,
                        description: data.description,
                        tags: data.tags,
                        deadline: data.deadline,
                        checklist: data.checklist,
                        organization_id: organizationId,
                        client_id: data.clientId, // Use the selected client ID
                        stage_id: selectedStageForCreation // KEY: Assign to the correct Kanban stage
                      }).select().single();

                      if (error) throw error;

                      if (comment) {
                        await supabase.from('messages').insert({
                          task_id: newTask.id,
                          content: comment,
                          sender_id: user?.id,
                          type: 'text',
                          organization_id: organizationId,
                          context_type: 'TASK_INTERNAL'
                        });
                      }

                      setIsTaskCreationOpen(false);
                      fetchTasks(); // Refresh board
                    } catch (err) {
                      console.error("Error creating task:", err);
                      const errorMessage = (err as any)?.message || "Erro desconhecido";
                      alert(`Falha ao criar tarefa: ${errorMessage}`);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};