import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { InternDashboard } from './pages/InternDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SettingsPage } from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { ApplicationProvider } from './contexts/ApplicationContext';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (view === 'settings' && user.role === 'admin') {
    return <SettingsPage onNavigate={setView} activeView={view} />;
  }

  return user.role === 'admin' 
    ? <AdminDashboard onNavigate={setView} activeView={view} /> 
    : <InternDashboard onNavigate={setView} activeView={view} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ApplicationProvider>
        <AppContent />
      </ApplicationProvider>
    </AuthProvider>
  );
}
