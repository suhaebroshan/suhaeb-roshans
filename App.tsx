import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppContext';
import Layout from './components/Layout';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import ChatSessionPage from './pages/ChatSession';
import CounselorDashboard from './pages/CounselorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DatabaseConfig from './components/DatabaseConfig';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { user } = useApp();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
     // Fallback redirects
     if (user.role === UserRole.COUNSELOR) return <Navigate to="/counselor" replace />;
     if (user.role === UserRole.ADMIN) return <Navigate to="/admin" replace />;
     return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
    const { user } = useApp();

    // Helper to determine where to send a logged-in user trying to access public pages
    const getHomeRoute = () => {
        if (!user) return '/';
        if (user.role === UserRole.COUNSELOR) return '/counselor';
        if (user.role === UserRole.ADMIN) return '/admin';
        return '/home';
    };

    return (
        <Layout>
            <Routes>
                {/* If logged in, redirect immediately to avoid 'flash' of onboarding screen */}
                <Route path="/" element={
                    user ? <Navigate to={getHomeRoute()} replace /> : <Onboarding />
                } />
                
                <Route path="/home" element={
                    <ProtectedRoute allowedRoles={[UserRole.USER]}>
                        <Home />
                    </ProtectedRoute>
                } />
                
                <Route path="/chat/:id" element={
                    <ProtectedRoute>
                        <ChatSessionPage />
                    </ProtectedRoute>
                } />

                <Route path="/counselor" element={
                    <ProtectedRoute allowedRoles={[UserRole.COUNSELOR]}>
                        <CounselorDashboard />
                    </ProtectedRoute>
                } />

                <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

                {/* Catch all - redirect to home if logged in, else onboarding */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <DatabaseConfig />
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;