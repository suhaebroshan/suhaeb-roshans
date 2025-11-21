import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { store } from '../services/store';

interface AppContextType {
  user: User | null;
  login: (nickname: string, role: UserRole) => Promise<void>;
  logout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('trust_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('trust_theme');
    // Default to dark mode if null (not saved yet)
    return saved ? saved === 'dark' : true;
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('trust_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('trust_user');
    }
  }, [user]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('trust_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('trust_theme', 'light');
    }
  }, [darkMode]);

  const login = async (nickname: string, role: UserRole) => {
    setIsLoading(true);
    return new Promise<void>((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        const newUser = store.createUser(nickname, role);
        setUser(newUser);
        setIsLoading(false);
        resolve();
      }, 1500);
    });
  };

  const logout = () => {
    setUser(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <AppContext.Provider value={{ user, login, logout, darkMode, toggleDarkMode, isLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};