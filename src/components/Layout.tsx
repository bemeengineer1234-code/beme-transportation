import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User as UserIcon, LayoutDashboard, FileText, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  activeView?: 'dashboard' | 'settings';
  onNavigate?: (view: 'dashboard' | 'settings') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, activeView = 'dashboard', onNavigate }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-b md:border-r border-line flex-shrink-0 flex flex-col">
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-vibrant rounded-xl flex items-center justify-center text-white shadow-xl shadow-brand-vibrant/20">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="font-black text-ink text-base tracking-tighter leading-none whitespace-nowrap">
              インターン交通費申請
            </h1>
            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-black">勤怠管理システム</span>
          </div>
        </div>

        <nav className="px-6 py-4 space-y-1.5 flex-1">
          <div className="px-4 py-2 label-micro mb-2">ナビゲーション</div>
          <button
            onClick={() => onNavigate?.('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${
              activeView === 'dashboard' 
                ? 'text-brand-vibrant bg-blue-50/50 shadow-sm border border-blue-100' 
                : 'text-slate-400 hover:text-ink hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard size={18} />
            <span className="text-sm">ダッシュボード</span>
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate?.('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${
                activeView === 'settings' 
                  ? 'text-brand-vibrant bg-blue-50/50 shadow-sm border border-blue-100' 
                  : 'text-slate-400 hover:text-ink hover:bg-slate-50'
              }`}
            >
              <Settings size={18} />
              <span className="text-sm">システム設定</span>
            </button>
          )}
        </nav>

        <div className="p-8 border-t border-line bg-slate-50/50">
          <div className="flex items-center gap-4 px-2 py-2 mb-6">
            <div className="w-10 h-10 bg-white border border-line rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-ink truncate leading-tight">{user?.name}</p>
              <p className="label-micro mt-0.5">{user?.role === 'admin' ? '管理者' : 'インターン'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 text-xs font-black border border-transparent hover:border-rose-100"
          >
            <LogOut size={16} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-paper">
        <header className="h-24 bg-white/50 backdrop-blur-xl border-b border-line flex items-center justify-between px-10 flex-shrink-0 sticky top-0 z-10">
          <div>
            <div className="label-micro mb-1">表示 / {activeView === 'dashboard' ? 'ダッシュボード' : '設定'}</div>
            <h2 className="text-2xl font-black text-ink tracking-tighter">{title}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="px-4 py-2 bg-white border border-line rounded-xl text-[11px] font-black text-slate-500 tracking-wider shadow-sm font-mono">
              {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, ' . ')}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
