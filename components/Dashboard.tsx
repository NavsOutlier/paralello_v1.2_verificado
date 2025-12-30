import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Users, CheckSquare, Clock } from 'lucide-react';
import { Card } from './ui';

const data = [
  { name: 'Seg', tasks: 4, messages: 24 },
  { name: 'Ter', tasks: 7, messages: 35 },
  { name: 'Qua', tasks: 3, messages: 12 },
  { name: 'Qui', tasks: 8, messages: 45 },
  { name: 'Sex', tasks: 12, messages: 20 },
];

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
  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-y-auto h-full">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Dashboard Operacional</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Clientes" value="24" icon={Users} color="bg-blue-500" />
        <StatCard title="Tasks Ativas" value="13" icon={Activity} color="bg-indigo-500" />
        <StatCard title="Concluídas (Semana)" value="45" icon={CheckSquare} color="bg-green-500" />
        <StatCard title="Tempo Médio Resp." value="12m" icon={Clock} color="bg-amber-500" />
      </div>


      <Card className="p-6 h-96">
        <h2 className="text-lg font-semibold mb-4">Volume de Atividades</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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