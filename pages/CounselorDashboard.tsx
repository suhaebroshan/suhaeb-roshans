import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { store } from '../services/store';
import { ChatSession, SessionStatus } from '../types';
import Button from '../components/Button';
import { Clock, DollarSign, MessageCircle, User } from 'lucide-react';

const CounselorDashboard: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'incoming' | 'active'>('incoming');
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    const refresh = () => {
        if (activeTab === 'incoming') {
            setSessions(store.getSessionsByStatus(SessionStatus.PENDING));
        } else {
            const mySessions = store.getSessionsByStatus(SessionStatus.ACTIVE)
                                  .filter(s => s.counselorId === user?.id);
            setSessions(mySessions);
        }
    };
    refresh();
    const unsub = store.subscribe(refresh);
    return unsub;
  }, [activeTab, user?.id]);

  const handleAcceptSession = (session: ChatSession) => {
      if (!user) return;
      store.updateSession(session.id, {
          status: SessionStatus.ACTIVE,
          counselorId: user.id,
          startTime: Date.now()
      });
      navigate(`/chat/${session.id}`);
  };

  return (
    <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
            <h1 className="text-3xl font-bold dark:text-white">Counselor Dashboard</h1>
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex shadow-sm border border-slate-100 dark:border-slate-700">
                <button 
                    onClick={() => setActiveTab('incoming')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'incoming' ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Incoming
                </button>
                <button 
                    onClick={() => setActiveTab('active')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    My Active
                </button>
            </div>
        </div>

        {sessions.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="inline-block p-6 rounded-full bg-slate-50 dark:bg-slate-800 mb-6">
                    <MessageCircle size={40} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">It's quiet right now</h3>
                <p className="text-slate-400 font-medium">Take a breath. Sessions will appear here.</p>
            </div>
        ) : (
            <div className="grid gap-6">
                {sessions.map(session => (
                    <div key={session.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border-2 border-orange-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-orange-100 transition-colors">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                    {session.plan.label}
                                </span>
                                <span className="text-slate-400 text-xs font-mono bg-slate-50 px-2 py-1 rounded-md">#{session.id.substr(2, 6)}</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                <User size={20} className="text-slate-400" />
                                Anonymous User
                            </h3>
                            <div className="flex gap-6 text-sm font-medium text-slate-500">
                                <span className="flex items-center gap-1.5"><Clock size={16} className="text-blue-400"/> {session.plan.durationMinutes} min</span>
                                <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-md"><DollarSign size={16}/> Earn ₹{(session.plan.cost * 0.8).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="w-full md:w-auto">
                            {activeTab === 'incoming' ? (
                                <Button onClick={() => handleAcceptSession(session)} fullWidth>Accept Request</Button>
                            ) : (
                                <Button variant="secondary" onClick={() => navigate(`/chat/${session.id}`)} fullWidth>Enter Chat</Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default CounselorDashboard;