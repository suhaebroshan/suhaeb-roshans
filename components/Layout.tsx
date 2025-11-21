import React from 'react';
import { useApp } from '../state/AppContext';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, User as UserIcon, LogOut, Shield, Heart } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, darkMode, toggleDarkMode } = useApp();
  const location = useLocation();

  // Don't show nav on onboarding
  if (location.pathname === '/') {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <nav className="sticky top-0 z-50 bg-[#FFF9F0]/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-orange-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/home" className="flex items-center space-x-2 group">
              <div className="bg-violet-200 dark:bg-violet-900 p-2 rounded-xl text-violet-700 dark:text-violet-300 group-hover:scale-110 transition-transform">
                <Shield size={24} fill="currentColor" className="opacity-20 absolute" />
                <Heart size={24} className="relative z-10" fill="currentColor" />
              </div>
              <span className="font-bold text-3xl tracking-tight text-slate-800 dark:text-white">TRUST</span>
            </Link>

            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleDarkMode}
                className="p-3 rounded-xl bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {user && (
                <div className="flex items-center space-x-4">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{user.nickname}</span>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">{user.role}</span>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-3 rounded-xl bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                    title="Logout"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>

      <footer className="py-8 text-center">
        <p className="text-slate-400 text-sm font-medium">&copy; {new Date().getFullYear()} TRUST. Made with 💜 for you.</p>
      </footer>
    </div>
  );
};

export default Layout;