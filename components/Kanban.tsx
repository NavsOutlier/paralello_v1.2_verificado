import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { INITIAL_TASKS, CLIENTS } from '../constants';

const columns = [
  { id: 'todo', title: 'A Fazer', color: 'bg-slate-100 border-slate-200' },
  { id: 'in-progress', title: 'Em Progresso', color: 'bg-blue-50 border-blue-100' },
  { id: 'review', title: 'Revisão', color: 'bg-amber-50 border-amber-100' },
  { id: 'done', title: 'Concluído', color: 'bg-green-50 border-green-100' },
];

export const Kanban: React.FC = () => {
  // Use INITIAL_TASKS directly as it is now a flat array
  const allTasks = INITIAL_TASKS.map(t => ({
    ...t, 
    clientName: CLIENTS.find(c => c.id === t.clientId)?.name 
  }));

  return (
    <div className="flex-1 p-6 bg-slate-50 overflow-x-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Quadro de Tarefas</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
        </button>
      </div>

      <div className="flex-1 flex gap-6 min-w-[1000px]">
        {columns.map(col => (
          <div key={col.id} className="flex-1 flex flex-col">
            <div className={`p-3 rounded-t-lg border-t border-x ${col.color} flex justify-between items-center`}>
              <span className="font-semibold text-sm text-slate-700">{col.title}</span>
              <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full text-slate-600">
                {allTasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            <div className={`flex-1 bg-slate-100/50 p-3 border-x border-b border-slate-200 rounded-b-lg space-y-3`}>
              {allTasks.filter(t => t.status === col.id).map(task => (
                <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{task.clientName}</span>
                    <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  <h3 className="text-sm font-medium text-slate-800 mb-3">{task.title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                       {/* Mock avatars */}
                       <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white"></div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};