import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Shield, Mail, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-vibrant text-white rounded-[28px] shadow-2xl shadow-brand-vibrant/30 mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
            <Shield size={40} />
          </div>
          <h1 className="text-3xl font-black text-ink tracking-tight mb-3">
            インターン<span className="text-brand-vibrant">交通費申請</span>
          </h1>
        </div>

        <div className="card p-10 shadow-2xl shadow-slate-200/50 border-t-4 border-t-brand-vibrant">
          <div className="mb-10">
            <h2 className="text-2xl font-black text-ink mb-2">ログイン</h2>
            <p className="text-sm text-slate-400 font-medium">アカウント情報を入力して進んでください。</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2 flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="label-micro ml-1">メールアドレス</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-vibrant transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-line rounded-3xl focus:ring-4 focus:ring-brand-vibrant/5 focus:border-brand-vibrant outline-none font-black text-ink transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="label-micro ml-1">パスワード</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-vibrant transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-line rounded-3xl focus:ring-4 focus:ring-brand-vibrant/5 focus:border-brand-vibrant outline-none font-black text-ink transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-brand-vibrant text-white font-black rounded-3xl hover:bg-blue-700 transition-all shadow-xl shadow-brand-vibrant/20 flex items-center justify-center gap-3 group active:scale-95 disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <span className="text-lg">ログイン</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-line text-center">
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              ログインできない場合は管理者にお問い合わせください。
            </p>
          </div>
        </div>

        <p className="text-center mt-12 text-[10px] font-black text-slate-300 tracking-widest uppercase">
          &copy; 2024 Transportation Expense System. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};
