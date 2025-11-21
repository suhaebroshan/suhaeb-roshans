import React, { useEffect, useState } from 'react';
import { store } from '../services/store';
import { ChatSession } from '../types';
import { DollarSign, Users, MessageSquare } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({ revenue: 0, sessions: 0, users: 0 });

  useEffect(() => {
    const updateStats = () => {
        const allSessions = store.getAllSessions();
        const revenue = allSessions.reduce((acc, curr) => acc + curr.plan.cost, 0);
        const usersCount = store.getUsersCount();
        
        setStats({
            revenue,
            sessions: allSessions.length,
            users: Math.max(120, usersCount) // Mock base + real
        });
    };
    updateStats();
    // Also subscribe to updates
    const unsub = store.subscribe(updateStats);
    return unsub;
  }, []);

  return (
    <div className="animate-fade-in">
        <h1 className="text-3xl font-bold dark:text-white mb-8">Admin Overview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Total Revenue</p>
                        <h3 className="text-2xl font-bold dark:text-white">₹{stats.revenue.toFixed(2)}</h3>
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-lavender-100 dark:bg-lavender-900/30 text-lavender-600 rounded-xl">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Total Sessions</p>
                        <h3 className="text-2xl font-bold dark:text-white">{stats.sessions}</h3>
                    </div>
                </div>
            </div>

             <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Total Users</p>
                        <h3 className="text-2xl font-bold dark:text-white">{stats.users}</h3>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-slate-400">Advanced analytics and user management would go here.</p>
        </div>
    </div>
  );
};

export default AdminDashboard;