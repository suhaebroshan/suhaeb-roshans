import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { UserRole } from '../types';
import Button from '../components/Button';
import { Shield, Heart, Ear, ArrowRight, Loader2, Smile } from 'lucide-react';

const Onboarding: React.FC = () => {
  const { login, isLoading } = useApp();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [nickname, setNickname] = useState('');

  // Redirection is now fully handled by App.tsx Protected Routes to prevent flickering

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep(3);
  };

  const handleLogin = async () => {
    if (!nickname) return;
    // Wait for login to complete (simulated delay + state update)
    await login(nickname, role);
    // App.tsx will detect the user change and redirect automatically
  };

  return (
    <div className="min-h-screen bg-[#FFF9F0] dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Decorative Pastel Circles */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-yellow-200 rounded-full opacity-40 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-pink-200 rounded-full opacity-40 blur-3xl"></div>
      <div className="absolute top-[40%] left-[10%] w-40 h-40 bg-blue-200 rounded-full opacity-30 blur-2xl"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-orange-100/50 dark:shadow-none dark:bg-slate-800">
            <Shield size={48} className="text-violet-500" fill="currentColor" fillOpacity={0.2} />
          </div>
        </div>

        {step === 1 && (
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">TRUST</h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed font-medium">
              A happy, safe space to share your thoughts without judgement.
            </p>
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 mb-8 shadow-sm border-2 border-orange-50 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-4 text-left">
                    <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl"><Heart size={24} fill="currentColor" /></div>
                    <span className="font-bold text-slate-700 dark:text-slate-200">100% Anonymous</span>
                </div>
                <div className="flex items-center gap-4 text-left">
                    <div className="p-3 bg-teal-100 text-teal-600 rounded-2xl"><Ear size={24} /></div>
                    <span className="font-bold text-slate-700 dark:text-slate-200">Caring Listeners</span>
                </div>
            </div>

            <Button fullWidth size="lg" onClick={() => setStep(2)} variant="primary">
              Start Your Journey <ArrowRight size={20} className="ml-2" />
            </Button>
            
            <div className="mt-10 flex justify-center gap-6 text-sm font-semibold text-slate-400">
                 <button onClick={() => { setRole(UserRole.COUNSELOR); setStep(3); }} className="hover:text-violet-500">Login as Counselor</button>
                 <button onClick={() => { setRole(UserRole.ADMIN); setStep(3); }} className="hover:text-violet-500">Login as Admin</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-center mb-8 text-slate-900 dark:text-white">What brings you here?</h2>
            <div className="space-y-4">
              <button 
                onClick={() => handleRoleSelect(UserRole.USER)}
                className="w-full p-6 rounded-[2rem] bg-blue-100 hover:bg-blue-200 text-blue-900 transition-all text-left group relative overflow-hidden"
              >
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-1">I want to Vent</h3>
                    <p className="opacity-75 font-medium">I need someone to listen to me.</p>
                </div>
                <Smile className="absolute bottom-4 right-6 text-blue-300 w-24 h-24 opacity-50 -rotate-12" />
              </button>
              
              <button 
                onClick={() => handleRoleSelect(UserRole.COUNSELOR)}
                className="w-full p-6 rounded-[2rem] bg-green-100 hover:bg-green-200 text-green-900 transition-all text-left group relative overflow-hidden"
              >
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-1">I'm a Listener</h3>
                    <p className="opacity-75 font-medium">I want to support others.</p>
                </div>
                <Ear className="absolute bottom-4 right-6 text-green-300 w-24 h-24 opacity-50 -rotate-12" />
              </button>
            </div>
            <button onClick={() => setStep(1)} className="mt-8 text-slate-400 hover:text-slate-600 block mx-auto font-bold">Go Back</button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-orange-100/50 dark:shadow-none border-2 border-orange-50 dark:border-slate-800">
             <h2 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
                {role === UserRole.USER ? 'Pick a Nickname' : 'Counselor ID'}
             </h2>
             <p className="text-center text-slate-500 mb-8 font-medium">
                Choose something fun and anonymous!
             </p>
             
             <div className="space-y-6">
                <div>
                    <input 
                        type="text" 
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="e.g. SunnyCloud"
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-violet-100 outline-none font-bold text-lg text-center placeholder:text-slate-300 placeholder:font-normal"
                    />
                </div>

                <Button 
                    fullWidth 
                    size="lg" 
                    onClick={handleLogin}
                    disabled={!nickname || isLoading}
                >
                    {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Let\'s Go!'}
                </Button>
             </div>
             <button onClick={() => setStep(2)} className="mt-6 text-slate-400 hover:text-slate-600 block mx-auto font-bold text-sm">Back</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;