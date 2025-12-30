import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Users, CheckSquare, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from './ui';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => (
  <Card className="flex items-center space-x-4 p-6">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </Card>
);

export const Dashboard: React.FC = () => {
  const { organizationId } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    activeTasks: 0,
    completedWeekly: 0,
    avgResponseTime: '0m'
  });
  const [chartData, setChartData] = useState<{ name: string; tasks: number; messages: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchDashboardStats();
    }
  }, [organizationId]);

  const fetchDashboardStats = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);

      // 1. Fetch Counts
      const [clientsCount, tasksCount, completedCount] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).is('deleted_at', null),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'done'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'done')
        // Note: Filter by weekly updated_at if needed
      ]);

      // 2. Mock Chart Data (Replacing with slightly more dynamic but simplified for now)
      // Ideally we'd query messages/tasks grouped by day
      const weeklyData = [
        { name: 'Seg', tasks: 2, messages: 15 },
        { name: 'Ter', tasks: 5, messages: 28 },
        { name: 'Qua', tasks: 3, messages: 10 },
        { name: 'Qui', tasks: 7, messages: 34 },
        { name: 'Sex', tasks: 9, messages: 18 },
      ];

      setStats({
        totalClients: clientsCount.count || 0,
        activeTasks: tasksCount.count || 0,
        completedWeekly: completedCount.count || 0,
        avgResponseTime: '15m' // Placeholder for complex calculation
      });
      setChartData(weeklyData);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-y-auto h-full">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Dashboard Operacional</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Clientes" value={stats.totalClients.toString()} icon={Users} color="bg-blue-500" />
        <StatCard title="Tasks Ativas" value={stats.activeTasks.toString()} icon={Activity} color="bg-indigo-500" />
        <StatCard title="Concluídas (Total)" value={stats.completedWeekly.toString()} icon={CheckSquare} color="bg-green-500" />
        <StatCard title="Tempo Médio Resp." value={stats.avgResponseTime} icon={Clock} color="bg-amber-500" />
      </div>

      <Card className="p-6 h-96">
        <h2 className="text-lg font-semibold mb-4">Volume de Atividades</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend />
            <Bar dataKey="messages" name="Mensagens" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tasks" name="Tarefas Criadas" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};