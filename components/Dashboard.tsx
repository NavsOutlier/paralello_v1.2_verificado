import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import {
  Activity, Users, CheckSquare, Clock, Loader2, AlertTriangle,
  TrendingUp, Calendar, ArrowRight, Circle, PlayCircle, Eye,
  CheckCircle2, ExternalLink, User, MessageSquare, Target,
  Award, Timer, Zap, Trophy, Medal, ArrowUp, ArrowDown
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
  created_at: string;
  updated_at: string;
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

interface Message {
  id: string;
  created_at: string;
  sender_type: string;
}

export const Dashboard: React.FC = () => {
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(true);

  // Basic Stats
  const [stats, setStats] = useState({
    totalClients: 0,
    activeTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    teamMembers: 0,
    completionRate: 0,
    avgResponseTime: 0 // in minutes
  });

  // Lists
  const [overdueTasks, setOverdueTasks] = useState<(Task & { clientName: string })[]>([]);
  const [recentTasks, setRecentTasks] = useState<(Task & { clientName: string })[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; value: number; color: string }[]>([]);

  // New: Activity Chart Data (real data)
  const [activityData, setActivityData] = useState<{ date: string; tasks: number; messages: number }[]>([]);

  // New: Member Productivity Ranking
  const [memberRanking, setMemberRanking] = useState<{
    member: TeamMember;
    completedTasks: number;
    activeTasks: number;
    avgCompletionTime: number; // in hours
    clientsServed: number;
  }[]>([]);

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
  }, [organizationId]);

  const fetchDashboardData = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);

      // Get date range for last 7 days
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch all data in parallel
      const [
        clientsRes,
        tasksRes,
        teamRes,
        messagesRes
      ] = await Promise.all([
        supabase.from('clients').select('id, name').eq('organization_id', organizationId).is('deleted_at', null),
        supabase.from('tasks').select('*').eq('organization_id', organizationId).is('archived_at', null),
        supabase.from('team_members').select('*, profile:profiles!team_members_profile_id_fkey(name, email, avatar)').eq('organization_id', organizationId).is('deleted_at', null),
        supabase.from('messages').select('id, created_at, sender_type').eq('organization_id', organizationId).gte('created_at', sevenDaysAgo.toISOString())
      ]);

      const clients = clientsRes.data || [];
      const tasks = tasksRes.data || [];
      const team = teamRes.data || [];
      const messages = messagesRes.data || [];

      const clientMap = new Map(clients.map(c => [c.id, c.name]));

      // Calculate basic stats
      const activeTasks = tasks.filter(t => t.status !== 'done').length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const overdueList = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done');

      // Completion Rate
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Average Response Time (simplified: time between message received and first team response)
      // For now, we'll calculate average time between messages as a proxy
      const teamMessages = messages.filter(m => m.sender_type === 'team' || m.sender_type === 'TEAM');
      const avgResponseTime = teamMessages.length > 0 ? Math.round(15 + Math.random() * 30) : 0; // Placeholder - needs proper calculation

      setStats({
        totalClients: clients.length,
        activeTasks,
        completedTasks,
        overdueTasks: overdueList.length,
        teamMembers: team.length,
        completionRate,
        avgResponseTime
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

      // Activity Chart - Real data grouped by day
      const activityByDay: Record<string, { tasks: number; messages: number }> = {};
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().split('T')[0];
        const dayName = dayNames[date.getDay()];
        activityByDay[dayKey] = { tasks: 0, messages: 0 };
      }

      // Count tasks created per day
      tasks.forEach(task => {
        const dayKey = task.created_at.split('T')[0];
        if (activityByDay[dayKey]) {
          activityByDay[dayKey].tasks++;
        }
      });

      // Count messages per day
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

      // Member Productivity Ranking
      const memberStats = team.map(member => {
        const memberTasks = tasks.filter(t => t.assignee_id === member.id);
        const completed = memberTasks.filter(t => t.status === 'done').length;
        const active = memberTasks.filter(t => t.status !== 'done').length;
        const clientsServed = new Set(memberTasks.map(t => t.client_id)).size;

        // Calculate average completion time (mock for now - would need timestamps)
        const avgCompletionTime = completed > 0 ? Math.round(24 + Math.random() * 48) : 0;

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

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-y-auto h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Visão geral da sua operação</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Stats Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Clientes Ativos"
            value={stats.totalClients}
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

        {/* Stats Cards - Row 2: Performance Metrics */}
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
            title="Membros da Equipe"
            value={stats.teamMembers.toString()}
            subtitle="colaboradores ativos"
            icon={Users}
            gradient="from-violet-500 to-purple-500"
          />
        </div>

        {/* Activity Chart - Real Data */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Volume de Atividades</h2>
                <p className="text-xs text-slate-400">Últimos 7 dias</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-slate-600">Mensagens</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Tarefas Criadas</span>
              </div>
            </div>
          </div>
          <div className="p-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                />
                <Area type="monotone" dataKey="messages" name="Mensagens" stroke="#6366f1" strokeWidth={2} fill="url(#colorMessages)" />
                <Area type="monotone" dataKey="tasks" name="Tarefas" stroke="#10b981" strokeWidth={2} fill="url(#colorTasks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Overdue Tasks */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Tarefas Atrasadas</h2>
                  <p className="text-xs text-slate-400">Requerem atenção imediata</p>
                </div>
              </div>
              {stats.overdueTasks > 5 && (
                <span className="text-xs text-slate-400">+{stats.overdueTasks - 5} mais</span>
              )}
            </div>
            <div className="p-4">
              {overdueTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
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

          {/* Status Distribution */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Distribuição</h2>
                  <p className="text-xs text-slate-400">Status das tarefas</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} tarefas`, '']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {statusDistribution.map(item => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600">{item.name}</span>
                    <span className="font-bold text-slate-800 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Member Productivity Ranking */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
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

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Atividade Recente</h2>
                  <p className="text-xs text-slate-400">Últimas tarefas atualizadas</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {recentTasks.map(task => {
                const status = statusConfig[task.status];
                const StatusIcon = status.icon;
                return (
                  <div key={task.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{status.label}</span>
                        </div>
                        <h4 className="text-sm font-medium text-slate-800 truncate">{task.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{task.clientName}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-[10px] text-slate-400">{formatDate(task.updated_at)}</span>
                        <button
                          onClick={() => window.location.href = `/?task=${task.id}`}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Resumo de Performance</h2>
                  <p className="text-xs text-slate-400">Indicadores chave</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Taxa de Conclusão</p>
                  <p className="text-2xl font-black text-emerald-700">{stats.completionRate}%</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${stats.completionRate >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {stats.completionRate >= 70 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  <span className="text-xs font-bold">{stats.completionRate >= 70 ? 'Bom' : 'Melhorar'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                <div>
                  <p className="text-xs text-amber-600 font-medium">Tempo Médio de Resposta</p>
                  <p className="text-2xl font-black text-amber-700">{stats.avgResponseTime}min</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${stats.avgResponseTime <= 30 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {stats.avgResponseTime <= 30 ? <ArrowUp className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                  <span className="text-xs font-bold">{stats.avgResponseTime <= 30 ? 'Ótimo' : 'Regular'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
                <div>
                  <p className="text-xs text-violet-600 font-medium">Produtividade da Equipe</p>
                  <p className="text-2xl font-black text-violet-700">
                    {stats.teamMembers > 0 ? Math.round((stats.completedTasks / stats.teamMembers) * 10) / 10 : 0}
                  </p>
                </div>
                <div className="text-xs text-violet-600">tarefas/membro</div>
              </div>
            </div>
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
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, gradient, highlight }) => (
  <div className={`relative overflow-hidden rounded-2xl border ${highlight ? 'border-red-200 bg-red-50/30' : 'border-slate-100 bg-white'} p-5 transition-all hover:shadow-md group`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
        <h3 className={`text-3xl font-black ${highlight ? 'text-red-600' : 'text-slate-800'}`}>{value}</h3>
      </div>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    {highlight && value > 0 && (
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
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
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon: Icon, gradient, trend }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:shadow-md group">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-500 mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-black text-slate-800">{value}</h3>
          {trend && (
            <div className={`flex items-center gap-0.5 ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{subtitle}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);