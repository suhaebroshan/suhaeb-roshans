import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { PRICING_PLANS } from '../constants';
import { PricingPlan, PlanType, ChatSession, SessionStatus } from '../types';
import { store } from '../services/store';
import Button from '../components/Button';
import { Clock, Zap, X, Sparkles, Heart, Users } from 'lucide-react';

const Home: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
        // Show actual count + a base number to make the prototype feel alive
        const actual = store.getUsersCount();
        setOnlineCount(Math.max(5, actual)); 
    };
    updateCount();
    const unsub = store.subscribe(updateCount);
    return unsub;
  }, []);

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !user) return;

    setIsProcessing(true);

    // Simulate Payment Processing
    setTimeout(() => {
        const isAI = selectedPlan.type === PlanType.AI;
        const newSession: ChatSession = {
            id: 'sess_' + Math.random().toString(36).substr(2, 9),
            userId: user.id,
            plan: selectedPlan,
            status: isAI ? SessionStatus.ACTIVE : SessionStatus.PENDING,
            counselorId: isAI ? 'AI_AGENT_GEMINI' : undefined,
            messages: [],
            createdAt: Date.now(),
            startTime: isAI ? Date.now() : undefined
        };
        
        if (isAI) {
            newSession.messages.push({
                id: 'msg_init',
                senderId: 'AI_AGENT_GEMINI',
                text: `Hello ${user.nickname}. I am TRUST, your AI companion. I'm here to listen without judgement. What's on your mind?`,
                timestamp: Date.now(),
                isAiGenerated: true
            });
        }

        store.createSession(newSession);
        setIsProcessing(false);
        navigate(`/chat/${newSession.id}`);
    }, 1500);
  };

  // Define a color map for the cards based on plan ID or index
  const getCardStyles = (plan: PricingPlan) => {
    const styles: Record<string, string> = {
        'p_10': 'bg-yellow-100 hover:bg-yellow-200 border-yellow-200 text-yellow-900',
        'p_ai_free': 'bg-teal-100 hover:bg-teal-200 border-teal-200 text-teal-900', // Free AI
        'p_15': 'bg-orange-100 hover:bg-orange-200 border-orange-200 text-orange-900',
        'p_30': 'bg-green-100 hover:bg-green-200 border-green-200 text-green-900',
        'p_ai_30': 'bg-violet-100 hover:bg-violet-200 border-violet-200 text-violet-900', // AI Paid
        'p_60': 'bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-900',
        'p_unlimited': 'bg-pink-100 hover:bg-pink-200 border-pink-200 text-pink-900',
    };
    return styles[plan.id] || 'bg-slate-100 text-slate-900';
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* Header Stats */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border-2 border-orange-100 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Hi, {user?.nickname} <span className="inline-block animate-bounce-slow">👋</span></h1>
          <p className="text-slate-500 font-medium">How are you feeling today?</p>
        </div>
        <div className="flex gap-3 mt-6 md:mt-0">
          <div className="flex items-center gap-2 px-5 py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl text-sm font-bold">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            {onlineCount} Online
          </div>
          <div className="flex items-center gap-2 px-5 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-2xl text-sm font-bold">
            <Clock size={18} />
            &lt; 2 min wait
          </div>
        </div>
      </header>

      {/* Pricing Grid */}
      <div>
        <div className="flex items-center gap-2 mb-6 pl-2">
            <Sparkles className="text-yellow-400 fill-current" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Start a session</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
            <button 
              key={plan.id}
              onClick={() => handlePlanSelect(plan)}
              className={`
                relative p-8 rounded-[2.5rem] transition-all duration-300 group hover:-translate-y-2 hover:shadow-xl text-left border-4 border-transparent
                ${getCardStyles(plan)}
              `}
            >
              {plan.type === PlanType.AI && (
                <div className="absolute top-6 right-6 bg-white/30 p-2 rounded-full backdrop-blur-sm">
                  <Zap size={24} fill="currentColor" className="text-current" />
                </div>
              )}
               {plan.type === PlanType.HUMAN && (
                <div className="absolute top-6 right-6 bg-white/30 p-2 rounded-full backdrop-blur-sm">
                  <Heart size={24} fill="currentColor" className="text-current" />
                </div>
              )}
              {plan.cost === 0 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-slate-900 shadow-sm text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                  Free Gift
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1 opacity-90">{plan.label}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                        {plan.cost === 0 ? 'Free' : `₹${plan.cost}`}
                    </span>
                    {plan.cost > 0 && <span className="opacity-75 text-sm font-medium">/ session</span>}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm font-semibold opacity-75 mb-6 bg-white/20 w-fit px-3 py-1 rounded-lg">
                <Clock size={16} />
                <span>{plan.durationMinutes} minutes</span>
              </div>
              
              <p className="text-sm font-medium opacity-80 min-h-[40px] leading-relaxed">
                {plan.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative">
            <button 
                onClick={() => setShowPayment(false)}
                className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
                <X size={20} />
            </button>

            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${getCardStyles(selectedPlan).split(' ')[0]}`}>
                 {selectedPlan.type === PlanType.AI ? <Zap size={32} className="opacity-50" fill="currentColor"/> : <Heart size={32} className="opacity-50" fill="currentColor" />}
            </div>

            <h3 className="text-2xl font-bold mb-2 dark:text-white">Unlock Session</h3>
            <p className="text-slate-500 mb-8 font-medium">You're booking <strong>{selectedPlan.label}</strong> for {selectedPlan.durationMinutes} minutes.</p>

            <div className="bg-[#FFF9F0] dark:bg-slate-800 p-6 rounded-2xl mb-8 flex justify-between items-center border-2 border-orange-100 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Total amount</span>
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {selectedPlan.cost === 0 ? '₹0' : `₹${selectedPlan.cost}`}
                </span>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
                <Button type="submit" variant="happy" fullWidth size="lg" disabled={isProcessing} className="shadow-none">
                    {isProcessing ? 'Processing...' : (selectedPlan.cost === 0 ? 'Start Free Session' : `Pay ₹${selectedPlan.cost}`)}
                </Button>
                {selectedPlan.cost > 0 && (
                    <p className="text-center text-xs text-slate-400 font-medium">
                        Mock Payment - No card needed
                    </p>
                )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;