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
  high: { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Alta' },
  medium: { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Média' },
  low: { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Baixa' },
};

const STAGE_COLORS = [
  '#cbd5e1', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#818cf8', '#a78bfa', '#f472b6'
];

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
    if (!confirm('Tem certeza? Tarefas nesta etapa ficarão sem coluna.')) return;
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

  // Column Drag and Drop Handlers
  const handleColumnDragStart = (e: React.DragEvent, stageId: string) => {
    e.stopPropagation(); // Stop board drag
    e.dataTransfer.setData('columnId', stageId);
  };

  const handleColumnDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedStageId = e.dataTransfer.getData('columnId');

    if (!draggedStageId || draggedStageId === targetStageId) return;

    // Reorder local state
    const currentStages = [...stages];
    const draggedIndex = currentStages.findIndex(s => s.id === draggedStageId);
    const targetIndex = currentStages.findIndex(s => s.id === targetStageId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedStage] = currentStages.splice(draggedIndex, 1);
    currentStages.splice(targetIndex, 0, draggedStage);

    // Update indexes locally
    const updatedStages = currentStages.map((s, index) => ({ ...s, order_index: index }));
    setStages(updatedStages);

    // Persist to database
    try {
      const updates = updatedStages.map(s => ({
        id: s.id,
        order_index: s.order_index,
        updated_at: new Date().toISOString()
      }));

      // Upsert all changed stages
      const { error } = await supabase.from('kanban_stages').upsert(updates);
      if (error) console.error('Error updating stage order:', error);
    } catch (err) {
      console.error('Failed to reorder stages:', err);
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
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Carregando quadro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-h-0 min-w-0">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm relative z-20 flex-none">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              Quadro de Tarefas
              <span className="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                {tasks.length} total
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 italic">Personalize as etapas do seu fluxo de trabalho</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsEditingStages(!isEditingStages)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isEditingStages ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              <Settings2 className="w-4 h-4" />
              {isEditingStages ? 'Pronto' : 'Editar Etapas'}
            </button>
            {/* Removed 'Nova Tarefa' button from here */}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden bg-[#f8fafc] ${isEditingStages ? 'cursor-default' : (isDraggingBoard ? 'cursor-grabbing' : 'cursor-grab')}
          [&::-webkit-scrollbar]:h-4
          [&::-webkit-scrollbar-track]:bg-slate-200
          [&::-webkit-scrollbar-thumb]:bg-slate-400
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:border-4
          [&::-webkit-scrollbar-thumb]:border-solid
          [&::-webkit-scrollbar-thumb]:border-transparent
          [&::-webkit-scrollbar-thumb]:bg-clip-content
          hover:[&::-webkit-scrollbar-thumb]:bg-slate-500`}
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
            const isColumnDragging = isEditingStages; // Enable column drag only in edit mode

            return (
              <div
                key={stage.id}
                className={`w-[85vw] sm:w-80 flex-shrink-0 flex flex-col group/stage rounded-b-2xl transition-colors ${isOver ? 'bg-indigo-50/50' : ''}`}
                style={{
                  backgroundColor: isOver ? undefined : `${stage.color}08`, // 5% opacity tint
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
                        <div className="flex mr-2 bg-slate-100 rounded-lg p-0.5">
                          <button
                            onClick={() => moveStage(stage.id, 'left')}
                            disabled={stages.findIndex(s => s.id === stage.id) === 0}
                            className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-slate-500"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveStage(stage.id, 'right')}
                            disabled={stages.findIndex(s => s.id === stage.id) === stages.length - 1}
                            className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-slate-500"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isEditing ? (
                          <input
                            type="text"
                            value={stageEditName}
                            onChange={(e) => setStageEditName(e.target.value)}
                            // Add blur/enter handlers if needed, or keep simple for now
                            className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Nome da etapa"
                            autoFocus
                            onBlur={() => handleUpdateStage(stage.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateStage(stage.id)}
                          />
                        ) : (
                          <h3
                            className="font-bold text-slate-700 text-sm truncate uppercase tracking-wider cursor-pointer hover:text-indigo-600 flex-1 border border-transparent hover:border-slate-200 px-1 py-0.5 rounded"
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
                        <button
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja excluir esta etapa e todas as tarefas nela?')) {
                              handleDeleteStage(stage.id);
                            }
                          }}
                          className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir Coluna"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-tight truncate" style={{ color: stage.color }}>
                          {stage.name}
                        </h3>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/60 border border-black/5"
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
                        className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
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
                        className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {isEditingStages && isEditing && (
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-0.5 px-1 py-1 mr-2">
                      {STAGE_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={async () => {
                            await supabase.from('kanban_stages').update({ color: c }).eq('id', stage.id);
                            setStages(stages.map(s => s.id === stage.id ? { ...s, color: c } : s));
                          }}
                          className="w-2.5 h-2.5 rounded-full border border-white hover:scale-125 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Column Body */}
                <div
                  className={`flex-1 rounded-2xl flex flex-col gap-4 p-2 transition-all duration-300 overflow-y-auto overflow-x-hidden custom-scrollbar ${isOver ? 'bg-indigo-50/50 ring-2 ring-indigo-200 ring-inset' : 'bg-transparent'
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
                        className={`group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40 scale-95 shadow-none' : ''
                          }`}
                      >
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider truncate max-w-[150px]">
                            {task.clientName}
                          </span>
                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-50 rounded transition-all" onClick={() => window.location.href = `/?task=${task.id}`}>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>

                        <h4 className="text-[13px] font-bold text-slate-800 mb-4 leading-relaxed line-clamp-3">
                          {task.title}
                        </h4>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                          <div className={`flex items-center gap-1 text-[10px] font-bold ${priority.color}`}>
                            <Flag className="w-3 h-3 fill-current" />
                            {priority.label}
                          </div>

                          <div className="flex items-center -space-x-1">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[9px] font-bold border-2 border-white">
                              {task.clientName?.charAt(0) || 'U'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stageTasks.length === 0 && !isOver && (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl py-8 opacity-40">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                        <Plus className="w-5 h-5 text-slate-300" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">VAZIO</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isEditingStages && (
            <button
              onClick={handleAddStage}
              className="w-[85vw] sm:w-80 h-[200px] flex-shrink-0 flex flex-col items-center justify-center border-3 border-dashed border-indigo-200 rounded-3xl group hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-indigo-400 group-hover:text-indigo-600">ADICIONAR COLUNA</p>
            </button>
          )}
        </div>
      </div>
      {/* Task Creation Modal */}
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
              <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all h-[80vh] z-50">
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