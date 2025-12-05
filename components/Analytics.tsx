import React, { useMemo } from 'react';
import { Book, ReadingStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface AnalyticsProps {
  books: Book[];
}

const COLORS = ['#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#10b981'];

export const Analytics: React.FC<AnalyticsProps> = ({ books }) => {
  const stats = useMemo(() => {
    const total = books.length;
    const completed = books.filter(b => b.status === ReadingStatus.COMPLETED).length;
    const inProgress = books.filter(b => b.status === ReadingStatus.IN_PROGRESS).length;
    const toRead = books.filter(b => b.status === ReadingStatus.TO_READ).length;

    // Genre Distribution
    const genres: Record<string, number> = {};
    books.forEach(b => {
      const g = b.genre || 'Uncategorized';
      genres[g] = (genres[g] || 0) + 1;
    });
    const genreData = Object.keys(genres).map(g => ({ name: g, value: genres[g] }));

    // Monthly Progress (Simple based on dateFinished)
    const monthly: Record<string, number> = {};
    books.forEach(b => {
      if (b.dateFinished && b.status === ReadingStatus.COMPLETED) {
        const date = new Date(b.dateFinished);
        const month = date.toLocaleString('default', { month: 'short' });
        monthly[month] = (monthly[month] || 0) + 1;
      }
    });
    
    // Sort months roughly (simple approach)
    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthsOrder.map(m => ({ name: m, count: monthly[m] || 0 }));

    return { total, completed, inProgress, toRead, genreData, monthlyData };
  }, [books]);

  return (
    <div className="space-y-8 p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Books</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Completed</p>
          <p className="text-3xl font-bold text-brand-600 dark:text-brand-400 mt-2">{stats.completed}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">In Progress</p>
          <p className="text-3xl font-bold text-amber-500 dark:text-amber-400 mt-2">{stats.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">To Read</p>
          <p className="text-3xl font-bold text-indigo-500 dark:text-indigo-400 mt-2">{stats.toRead}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-[400px]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Books Finished per Month</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={stats.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-invert-bg)' }}
              />
              <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-[400px]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Genre Distribution</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={stats.genreData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {stats.genreData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};