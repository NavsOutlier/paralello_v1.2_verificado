import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import {
  Activity, Users, CheckSquare, Clock, Loader2, AlertTriangle,
  TrendingUp, Calendar, ArrowRight, Circle, PlayCircle, Eye,
  CheckCircle2, ExternalLink, User, MessageSquare, Target,
  Award, Timer, Zap, Trophy, Medal, ArrowUp, ArrowDown,
  Filter, ChevronDown, X, AlertCircle, MessageCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  client_id: string;
  assignee_id?: string;
  assignee_ids?: string[];
  created_at: string;
  updated_at?: string;
}

interface TeamMember {
  id: string;
  profile: {
    name: string;
    email: string;
    avatar?: string;
  };
  role: string;
}

interface Client {
  id: string;
  name: string;
  lastMessageAt?: string;
  daysSinceLastMessage?: number;
}

type PeriodFilter = '7d' | '15d' | '30d' | '90d';

export const Dashboard: React.FC = () => {
  const { organizationId, isManager, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7d');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(true);

  // Data lists for filters
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);

  // Basic Stats
  const [stats, setStats] = useState({
    totalClients: 0,
    activeTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    activeClients: 0,
    completionRate: 0,
    avgResponseTime: 0,
    teamMembers: 0
  });

  // Lists
  const [overdueTasks, setOverdueTasks] = useState<(Task & { clientName: string })[]>([]);
  const [recentTasks, setRecentTasks] = useState<(Task & { clientName: string })[]>([]);
  const [reviewTasks, setReviewTasks] = useState<(Task & { clientName: string; memberName?: string })[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [activityData, setActivityData] = useState<{ date: string; tasks: number; messages: number }[]>([]);
  const [memberRanking, setMemberRanking] = useState<{
    member: TeamMember;
    completedTasks: number;
    activeTasks: number;
    avgCompletionTime: number;
    clientsServed: number;
  }[]>([]);

  // New: Inactive Clients (no message in 2+ days)
  const [inactiveClients, setInactiveClients] = useState<Client[]>([]);

  const periodDays = useMemo(() => {
    switch (periodFilter) {
      case '7d': return 7;
      case '15d': return 15;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  }, [periodFilter]);

  useEffect(() => {
    if (organizationId) {
      fetchDashboardData();

      const channel = supabase
        .channel(`dashboard-${organizationId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `organization_id=eq.${organizationId}` }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `organization_id=eq.${organizationId}` }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `organization_id=eq.${organizationId}` }, () => fetchDashboardData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [organizationId, periodFilter, memberFilter, clientFilter, roleFilter]);

  const fetchDashboardData = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - periodDays);

      // Fetch all data in parallel
      const [
        clientsRes,
        tasksRes,
        teamRes,
        messagesRes,
        clientMessagesRes,
        allMessagesForResponseTime
      ] = await Promise.all([
        supabase.from('clients').select('id, name').eq('organization_id', organizationId).is('deleted_at', null),
        supabase.from('tasks').select('*').eq('organization_id', organizationId).is('archived_at', null),
        supabase.from('team_members').select('*, profile:profiles!team_members_profile_id_fkey(name, email, avatar)').eq('organization_id', organizationId).is('deleted_at', null),
        supabase.from('messages').select('id, created_at, sender_type, client_id').eq('organization_id', organizationId).gte('created_at', startDate.toISOString()),
        // Get last message per client for engagement tracking
        supabase.from('messages').select('client_id, created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }),
        // Get messages for response time calculation (last 7 days, ordered by time)
        supabase.from('messages')
          .select('id, client_id, sender_type, created_at')
          .eq('organization_id', organizationId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true })
      ]);

      const clients = clientsRes.data || [];
      let tasks = tasksRes.data || [];
      const team = teamRes.data || [];
      const messages = messagesRes.data || [];
      const clientMessages = clientMessagesRes.data || [];
      const responseTimeMessages = allMessagesForResponseTime.data || [];

      // Store for filters
      setAllMembers(team);
      setAllClients(clients.map(c => ({ id: c.id, name: c.name })));

      const clientMap = new Map(clients.map(c => [c.id, c.name]));

      // Apply filters
      if (memberFilter !== 'all') {
        tasks = tasks.filter(t => t.assignee_id === memberFilter);
      }
      if (clientFilter !== 'all') {
        tasks = tasks.filter(t => t.client_id === clientFilter);
      }

      // Calculate last message date per client
      const lastMessageByClient = new Map<string, Date>();
      clientMessages.forEach(msg => {
        if (msg.client_id && !lastMessageByClient.has(msg.client_id)) {
          lastMessageByClient.set(msg.client_id, new Date(msg.created_at));
        }
      });

      // Calculate inactive clients (no message in 2+ days)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const inactiveClientsList = clients.map(client => {
        const lastMsg = lastMessageByClient.get(client.id);
        const daysSince = lastMsg
          ? Math.floor((today.getTime() - lastMsg.getTime()) / (1000 * 60 * 60 * 24))
          : 999; // Never messaged
        return {
          id: client.id,
          name: client.name,
          lastMessageAt: lastMsg?.toISOString(),
          daysSinceLastMessage: daysSince
        };
      }).filter(c => c.daysSinceLastMessage >= 2).sort((a, b) => b.daysSinceLastMessage - a.daysSinceLastMessage);

      setInactiveClients(inactiveClientsList.slice(0, 10));

      // Calculate stats
      const activeTasks = tasks.filter(t => t.status !== 'done').length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const overdueList = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done');

      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Active clients = clients with at least 1 message in period
      const activeClientIds = new Set(messages.map(m => m.client_id).filter(Boolean));
      const activeClients = activeClientIds.size;

      // Calculate REAL average response time
      // Group messages by client_id, find pairs of client message -> team response
      const responseTimes: number[] = [];

      // Group messages by client
      const messagesByClient = new Map<string, { sender_type: string; created_at: string }[]>();
      responseTimeMessages.forEach(msg => {
        if (msg.client_id) {
          if (!messagesByClient.has(msg.client_id)) {
            messagesByClient.set(msg.client_id, []);
          }
          messagesByClient.get(msg.client_id)!.push(msg);
        }
      });

      // For each client, find response times
      messagesByClient.forEach((msgs) => {
        for (let i = 0; i < msgs.length - 1; i++) {
          const current = msgs[i];
          const next = msgs[i + 1];

          // If client sent message and team responded next
          const isClientMessage = current.sender_type === 'client' || current.sender_type === 'CLIENT';
          const isTeamResponse = next.sender_type === 'team' || next.sender_type === 'TEAM';

          if (isClientMessage && isTeamResponse) {
            const clientTime = new Date(current.created_at).getTime();
            const teamTime = new Date(next.created_at).getTime();
            const diffMinutes = Math.round((teamTime - clientTime) / (1000 * 60));

            // Only count reasonable response times (between 1 min and 24 hours)
            if (diffMinutes > 0 && diffMinutes < 1440) {
              responseTimes.push(diffMinutes);
            }
          }
        }
      });

      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

      setStats({
        totalClients: clients.length,
        activeTasks,
        completedTasks,
        overdueTasks: overdueList.length,
        activeClients,
        completionRate,
        avgResponseTime,
        teamMembers: team.length
      });

      // Overdue tasks
      setOverdueTasks(
        overdueList
          .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
          .slice(0, 5)
          .map(t => ({ ...t, clientName: clientMap.get(t.client_id) || 'Sem Cliente' }))
      );

      // Recent tasks
      setRecentTasks(
        [...tasks]
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5)
          .map(t => ({ ...t, clientName: clientMap.get(t.client_id) || 'Sem Cliente' }))
      );

      // Review tasks (awaiting approval)
      const memberMap = new Map(team.map(m => [m.id, m.profile?.name || 'Sem nome']));
      const reviewList = tasks.filter(t => t.status === 'review');
      setReviewTasks(
        reviewList
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .map(t => ({
            ...t,
            clientName: clientMap.get(t.client_id) || 'Sem Cliente',
            memberName: t.assignee_id ? memberMap.get(t.assignee_id) : undefined
          }))
      );

      // Status distribution
      const statusCounts = {
        todo: tasks.filter(t => t.status === 'todo').length,
        'in-progress': tasks.filter(t => t.status === 'in-progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length
      };

      setStatusDistribution([
        { name: 'Pendente', value: statusCounts.todo, color: '#f59e0b' },
        { name: 'Em Progresso', value: statusCounts['in-progress'], color: '#3b82f6' },
        { name: 'Revisão', value: statusCounts.review, color: '#8b5cf6' },
        { name: 'Concluído', value: statusCounts.done, color: '#10b981' }
      ]);

      // Activity Chart - grouped by day
      const activityByDay: Record<string, { tasks: number; messages: number }> = {};
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      for (let i = Math.min(periodDays - 1, 6); i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().split('T')[0];
        activityByDay[dayKey] = { tasks: 0, messages: 0 };
      }

      tasks.forEach(task => {
        const dayKey = task.created_at.split('T')[0];
        if (activityByDay[dayKey]) {
          activityByDay[dayKey].tasks++;
        }
      });

      messages.forEach(msg => {
        const dayKey = msg.created_at.split('T')[0];
        if (activityByDay[dayKey]) {
          activityByDay[dayKey].messages++;
        }
      });

      const activityArray = Object.entries(activityByDay).map(([date, data]) => {
        const d = new Date(date);
        return {
          date: dayNames[d.getDay()],
          ...data
        };
      });

      setActivityData(activityArray);

      // Member Ranking (with role filter)
      const filteredTeam = roleFilter !== 'all' ? team.filter(m => m.role === roleFilter) : team;
      const memberStats = filteredTeam.map(member => {
        // Use profile_id for matching as tasks table stores profile IDs
        const targetId = member.profile_id || member.id;

        const memberTasks = tasks.filter(t =>
          t.assignee_id === targetId ||
          (t.assignee_ids && Array.isArray(t.assignee_ids) && t.assignee_ids.includes(targetId))
        );

        const completedMemberTasks = memberTasks.filter(t => t.status === 'done');
        const completed = completedMemberTasks.length;
        const active = memberTasks.filter(t => t.status !== 'done').length;
        const clientsServed = new Set(memberTasks.map(t => t.client_id)).size;

        // Calculate REAL average completion time (hours from created_at to updated_at for done tasks)
        let avgCompletionTime = 0;
        if (completed > 0) {
          const completionTimes = completedMemberTasks.map(t => {
            const created = new Date(t.created_at).getTime();
            // Fallback to now if updated_at is missing (new tasks)
            const updated = t.updated_at ? new Date(t.updated_at).getTime() : Date.now();
            const diff = Math.round((updated - created) / (1000 * 60 * 60)); // hours
            return diff;
          }).filter(h => h >= 0 && h < 720); // Filter reasonable times (< 30 days)

          avgCompletionTime = completionTimes.length > 0
            ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
            : 0;
        }

        return {
          member,
          completedTasks: completed,
          activeTasks: active,
          avgCompletionTime,
          clientsServed
        };
      }).sort((a, b) => b.completedTasks - a.completedTasks);

      setMemberRanking(memberStats);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getDaysOverdue = (deadline: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(deadline).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const priorityColors = {
    high: 'text-red-500 bg-red-50',
    medium: 'text-amber-500 bg-amber-50',
    low: 'text-emerald-500 bg-emerald-50'
  };

  const statusConfig = {
    todo: { label: 'Pendente', icon: Circle, color: 'text-amber-500' },
    'in-progress': { label: 'Em Progresso', icon: PlayCircle, color: 'text-blue-500' },
    review: { label: 'Revisão', icon: Eye, color: 'text-violet-500' },
    done: { label: 'Concluído', icon: CheckCircle2, color: 'text-emerald-500' }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' };
    if (index === 1) return { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-50' };
    if (index === 2) return { icon: Medal, color: 'text-amber-700', bg: 'bg-amber-50/50' };
    return null;
  };

  const clearFilters = () => {
    setPeriodFilter('7d');
    setMemberFilter('all');
    setClientFilter('all');
    setRoleFilter('all');
  };

  const hasActiveFilters = periodFilter !== '7d' || memberFilter !== 'all' || clientFilter !== 'all' || roleFilter !== 'all';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Access control: Only managers and super admins can see the dashboard
  if (!isManager && !isSuperAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
          <p className="text-sm text-slate-500 max-w-sm">
            O Dashboard é uma ferramenta exclusiva para gestores.
            Entre em contato com seu administrador se precisar de acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 overflow-y-auto h-full">
      {/* Header - Premium Design */}
      <div className="relative px-4 md:px-8 py-6 md:py-8 border-b border-slate-100/50 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-32 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-bl-full" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
            </div>
            <p className="text-sm text-slate-500 ml-[52px]">Visão geral da sua operação • <span className="font-medium text-indigo-600">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${showFilters
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}
            >
              {showFilters ? (
                <>
                  <X className="w-4 h-4" />
                  Ocultar filtros
                </>
              ) : (
                <>
                  <Filter className="w-4 h-4" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Period Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Período</label>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="7d">Últimos 7 dias</option>
                  <option value="15d">Últimos 15 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="90d">Últimos 90 dias</option>
                </select>
              </div>

              {/* Member Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Membro</label>
                <select
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todos os membros</option>
                  {allMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.profile?.name || 'Sem nome'}</option>
                  ))}
                </select>
              </div>

              {/* Client Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Cliente</label>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todos os clientes</option>
                  {allClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Role/Specialty Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Especialidade</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todas as especialidades</option>
                  <option value="manager">Gestor</option>
                  <option value="member">Membro</option>
                  <option value="designer">Designer</option>
                  <option value="copywriter">Copywriter</option>
                  <option value="social_media">Social Media</option>
                  <option value="developer">Desenvolvedor</option>
                  <option value="analyst">Analista</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 space-y-8">
        {/* Review Tasks - Top Priority Section */}
        {reviewTasks.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                    <Eye className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Aguardando sua Aprovação! 👀</h2>
                    <p className="text-sm text-slate-500">Estas tarefas estão prontas para revisão</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-bold">
                    {reviewTasks.length} {reviewTasks.length === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviewTasks.slice(0, 6).map(task => (
                  <div
                    key={task.id}
                    className="group relative bg-gradient-to-br from-violet-200 to-purple-200 rounded-2xl p-4 border border-violet-300/50 shadow-sm hover:shadow-lg hover:shadow-violet-200 transition-all hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-lg uppercase tracking-wide">
                        {task.clientName}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => {
                            try {
                              await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id);
                              setReviewTasks(prev => prev.filter(t => t.id !== task.id));
                            } catch (e) { console.error(e); }
                          }}
                          className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                          title="Aprovar ✓"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await supabase.from('tasks').update({ status: 'in-progress' }).eq('id', task.id);
                              setReviewTasks(prev => prev.filter(t => t.id !== task.id));
                            } catch (e) { console.error(e); }
                          }}
                          className="p-1.5 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                          title="Devolver para ajustes"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.location.href = `/?task=${task.id}`}
                          className="p-1.5 rounded-lg bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors"
                          title="Ver detalhes"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2 line-clamp-2">
                      {task.title}
                    </h4>
                    {task.memberName && (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold">
                          {task.memberName.charAt(0)}
                        </div>
                        <span className="text-[10px] text-slate-500">{task.memberName}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {reviewTasks.length > 6 && (
                <p className="text-center text-sm text-violet-600 mt-4 font-medium">
                  +{reviewTasks.length - 6} outras tarefas aguardando revisão
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Clientes Ativos"
            value={stats.activeClients}
            subtitle={`de ${stats.totalClients} total`}
            icon={Users}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Tarefas Ativas"
            value={stats.activeTasks}
            icon={Activity}
            gradient="from-indigo-500 to-violet-500"
          />
          <StatCard
            title="Concluídas"
            value={stats.completedTasks}
            icon={CheckSquare}
            gradient="from-emerald-500 to-green-500"
          />
          <StatCard
            title="Atrasadas"
            value={stats.overdueTasks}
            icon={AlertTriangle}
            gradient="from-red-500 to-rose-500"
            highlight={stats.overdueTasks > 0}
          />
        </div>

        {/* Stats Cards - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Taxa de Conclusão"
            value={`${stats.completionRate}%`}
            subtitle="de todas as tarefas"
            icon={Target}
            gradient="from-emerald-500 to-teal-500"
            trend={stats.completionRate >= 70 ? 'up' : 'down'}
          />
          <MetricCard
            title="Tempo Médio de Resposta"
            value={`${stats.avgResponseTime}min`}
            subtitle="para mensagens de clientes"
            icon={Timer}
            gradient="from-amber-500 to-orange-500"
            trend={stats.avgResponseTime <= 30 ? 'up' : 'down'}
          />
          <MetricCard
            title="Membros Ativos"
            value={stats.teamMembers.toString()}
            subtitle="na equipe"
            icon={Users}
            gradient="from-violet-500 to-purple-500"
          />
        </div>

        {/* Inactive Clients Alert */}
        {inactiveClients.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-200/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-amber-800">Clientes sem Engajamento</h2>
                  <p className="text-xs text-amber-600">Sem mensagens há mais de 2 dias</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-800 text-xs font-bold">
                {inactiveClients.length} clientes
              </span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inactiveClients.slice(0, 6).map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{client.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {client.lastMessageAt ? formatDate(client.lastMessageAt) : 'Nunca interagiu'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{client.daysSinceLastMessage}</p>
                      <p className="text-[10px] text-slate-400">dias</p>
                    </div>
                  </div>
                ))}
              </div>
              {inactiveClients.length > 6 && (
                <p className="text-center text-xs text-amber-600 mt-3">
                  +{inactiveClients.length - 6} outros clientes inativos
                </p>
              )}
            </div>
          </div>
        )}

        {/* Activity Chart - Premium Design */}
        <div className="relative bg-white rounded-3xl border border-slate-100/50 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl" />

          <div className="relative px-8 py-5 border-b border-slate-100/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <TrendingUp className="w-6 h-6 text-white" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Volume de Atividades</h2>
                <p className="text-sm text-slate-400">Últimos {periodDays} dias</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm" />
                <span className="text-sm font-medium text-slate-600">Mensagens</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm" />
                <span className="text-sm font-medium text-slate-600">Tarefas</span>
              </div>
            </div>
          </div>
          <div className="relative p-8 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="strokeMessages" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="strokeTasks" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px 16px'
                  }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}
                  itemStyle={{ padding: '4px 0' }}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  name="Mensagens"
                  stroke="url(#strokeMessages)"
                  strokeWidth={3}
                  fill="url(#colorMessages)"
                  dot={{ fill: '#6366f1', strokeWidth: 0, r: 4 }}
                  activeDot={{ fill: '#6366f1', strokeWidth: 3, stroke: '#fff', r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  name="Tarefas"
                  stroke="url(#strokeTasks)"
                  strokeWidth={3}
                  fill="url(#colorTasks)"
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                  activeDot={{ fill: '#10b981', strokeWidth: 3, stroke: '#fff', r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Overdue Tasks - Premium Design */}
          <div className="lg:col-span-2 relative bg-white rounded-3xl border border-slate-100/50 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-red-500/5 to-rose-500/5 rounded-full blur-3xl" />

            <div className="relative px-6 py-5 border-b border-slate-100/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-200">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Tarefas Atrasadas</h2>
                  <p className="text-sm text-slate-400">Requerem atenção imediata</p>
                </div>
              </div>
              {overdueTasks.length > 0 && (
                <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  {overdueTasks.length} {overdueTasks.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
              )}
            </div>
            <div className="relative p-5">
              {overdueTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-300 mb-2" />
                  <p className="text-sm font-medium">Nenhuma tarefa atrasada!</p>
                  <p className="text-xs">Excelente trabalho 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueTasks.map(task => {
                    const daysOverdue = getDaysOverdue(task.deadline!);
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100 hover:bg-red-50 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                              {task.clientName}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800 truncate">{task.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <p className="text-xs font-bold text-red-600">{daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'}</p>
                            <p className="text-[10px] text-slate-400">de atraso</p>
                          </div>
                          <button
                            onClick={() => window.location.href = `/?task=${task.id}`}
                            className="p-2 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Status Distribution - Premium Design */}
          <div className="relative bg-white rounded-3xl border border-slate-100/50 shadow-xl shadow-slate-200/50 overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-2xl group-hover:opacity-100 opacity-50 transition-opacity" />

            <div className="relative px-6 py-5 border-b border-slate-100/50">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Distribuição</h2>
                  <p className="text-sm text-slate-400">Status das tarefas</p>
                </div>
              </div>
            </div>
            <div className="relative p-6">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                      </filter>
                    </defs>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      style={{ filter: 'url(#shadow)' }}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="white"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} tarefas`, '']}
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)',
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        padding: '10px 14px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {statusDistribution.map(item => (
                  <div key={item.name} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-default">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-slate-600 flex-1">{item.name}</span>
                    <span className="text-sm font-bold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Member Ranking */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Ranking de Produtividade</h2>
                <p className="text-xs text-slate-400">Desempenho da equipe por tarefas concluídas</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">#</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Membro</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Concluídas</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Em Andamento</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Tempo Médio</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Clientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {memberRanking.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                      <p className="text-sm">Nenhum membro encontrado</p>
                    </td>
                  </tr>
                ) : memberRanking.map((item, index) => {
                  const badge = getRankBadge(index);
                  return (
                    <tr key={item.member.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        {badge ? (
                          <div className={`w-8 h-8 rounded-lg ${badge.bg} flex items-center justify-center`}>
                            <badge.icon className={`w-4 h-4 ${badge.color}`} />
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-400">{index + 1}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                            {item.member.profile?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.member.profile?.name}</p>
                            <p className="text-[10px] text-slate-400">{item.member.role === 'manager' ? 'Gestor' : 'Membro'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {item.completedTasks}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                          <PlayCircle className="w-3.5 h-3.5" />
                          {item.activeTasks}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-slate-600">
                          {item.avgCompletionTime > 0 ? `${item.avgCompletionTime}h` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 font-bold text-sm">
                          <Users className="w-3.5 h-3.5" />
                          {item.clientsServed}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, gradient, highlight }) => (
  <div className={`relative overflow-hidden rounded-2xl ${highlight ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200' : 'bg-white border-slate-100/50'} border p-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 group`}>
    {/* Background decoration */}
    <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity blur-2xl`} />

    <div className="relative flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className={`text-4xl font-black tracking-tight ${highlight ? 'text-red-600' : 'text-slate-800'}`}>
          {value}
        </h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
        <Icon className="w-7 h-7 text-white" />
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 blur-xl transition-opacity`} />
      </div>
    </div>

    {highlight && value > 0 && (
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
      </div>
    )}
  </div>
);

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  trend?: 'up' | 'down';
  highlight?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon: Icon, gradient, trend, highlight }) => (
  <div className={`relative overflow-hidden rounded-2xl ${highlight ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200' : 'bg-white border-slate-100/50'} border p-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 group`}>
    {/* Background decoration */}
    <div className={`absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity blur-2xl`} />

    <div className="relative flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="flex items-baseline gap-3">
          <h3 className={`text-4xl font-black tracking-tight ${highlight ? 'text-red-600' : 'text-slate-800'}`}>
            {value}
          </h3>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {trend === 'up' ? 'Bom' : 'Baixo'}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
        <Icon className="w-7 h-7 text-white" />
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 blur-xl transition-opacity`} />
      </div>
    </div>

    {highlight && (
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
      </div>
    )}
  </div>
);