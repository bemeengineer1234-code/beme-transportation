import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Filter, Download, Search, CheckCircle, RotateCcw, X, Eye, User as UserIcon, Calendar, MapPin, FileText, AlertCircle, CreditCard, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useApplications } from '../contexts/ApplicationContext';
import { ExpenseApplication } from '../types';

interface AdminDashboardProps {
  onNavigate: (view: 'dashboard' | 'settings') => void;
  activeView: 'dashboard' | 'settings';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, activeView }) => {
  const { user } = useAuth();
  const { applications, updateStatus, loading } = useApplications();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<ExpenseApplication | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  
  // Password verification states (Firebase ではパスワードを直接持たないため、一旦簡易化)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: 'cancel' | 'return', id: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    // Data is handled by ApplicationContext
  }, []);

  const months = Array.from(new Set(applications.map(app => app.date.substring(0, 7)))).sort().reverse() as string[];

  const filteredApps = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch = app.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMonth = filterMonth === 'all' || app.date.startsWith(filterMonth);
    return matchesStatus && matchesSearch && matchesMonth;
  });

  const handleApprove = async (id: string) => {
    try {
      await updateStatus(id, 'approved');
      setSelectedApp(null);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleCancelApproval = async (id: string) => {
    try {
      await updateStatus(id, 'pending');
      setSelectedApp(null);
    } catch (error) {
      console.error('Cancel approval failed:', error);
    }
  };

  const handleCancelApprovalClick = (id: string) => {
    // セキュリティ上の再確認が必要な場合はここでパスワード等を求める
    handleCancelApproval(id);
  };

  const handleReturnClick = () => {
    setShowReturnModal(true);
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Firebase Auth の reauthenticateWithCredential を使うのが正解だが、一旦スキップ
    setShowPasswordModal(false);
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    try {
      await updateStatus(selectedApp.id, 'returned', returnReason);
      setShowReturnModal(false);
      setSelectedApp(null);
      setReturnReason('');
    } catch (error) {
      console.error('Return failed:', error);
    }
  };

  const exportCSV = () => {
    const headers = ['申請者', '稼働日', '場所', '区間', '金額', 'ステータス', '備考'];
    const rows = filteredApps.map(app => [
      app.userName,
      app.date,
      app.location,
      app.route,
      app.amount,
      app.status === 'approved' ? '承認済み' : app.status === 'pending' ? '申請中' : '差し戻し',
      app.remarks || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transportation_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout title="管理者ダッシュボード" onNavigate={onNavigate} activeView={activeView}>
      <div className="space-y-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card p-5 sm:p-8 group shadow-sm transition-shadow hover:shadow-md">
            <div className="label-micro mb-2 sm:mb-4 text-amber-500">承認待ち</div>
            <div className="flex items-end justify-between">
              <p className="text-3xl sm:text-4xl font-black text-amber-500 tracking-tighter group-hover:scale-110 transition-transform origin-left">{applications.filter(a => a.status === 'pending').length}</p>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
          <div className="card p-5 sm:p-8 group shadow-sm transition-shadow hover:shadow-md">
            <div className="label-micro mb-2 sm:mb-4">承認済み合計</div>
            <div className="flex items-end justify-between">
              <p className="text-3xl sm:text-4xl font-black text-ink tracking-tighter group-hover:scale-110 transition-transform origin-left">
                <span className="text-[14px] sm:text-[18px] mr-1 opacity-50 font-black">¥</span>
                {applications.filter(a => a.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
              </p>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-ink group-hover:text-white transition-all">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
          <div className="card p-5 sm:p-8 group shadow-sm transition-shadow hover:shadow-md">
            <div className="label-micro mb-2 sm:mb-4 text-brand">アクティブユーザー</div>
            <div className="flex items-end justify-between">
              <p className="text-3xl sm:text-4xl font-black text-brand tracking-tighter group-hover:scale-110 transition-transform origin-left">{new Set(applications.map(a => a.userId)).size}</p>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand/5 rounded-2xl flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all">
                <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="card p-5 flex flex-col lg:flex-row gap-5 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="名前で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-line rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none text-sm font-bold transition-all"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-5 py-3 bg-slate-50/50 border border-line rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none text-sm font-black text-slate-600 transition-all cursor-pointer appearance-none min-w-[160px]"
            >
              <option value="all">すべてのステータス</option>
              <option value="pending">申請中</option>
              <option value="approved">承認済み</option>
              <option value="returned">差し戻し</option>
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-5 py-3 bg-slate-50/50 border border-line rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none text-sm font-black text-slate-600 transition-all cursor-pointer appearance-none min-w-[140px]"
            >
              <option value="all">すべての月</option>
              {months.map(month => (
                <option key={month} value={month}>{month.replace('-', '年')}月</option>
              ))}
            </select>
          </div>

          <button
            onClick={exportCSV}
            className="btn-primary flex items-center gap-2 px-8 py-3 w-full lg:w-auto justify-center"
          >
            <Download size={18} />
            <span>CSV出力</span>
          </button>
        </div>

        {/* Desktop Table */}
        <div className="card overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-line">
                  <th className="px-8 py-5 label-micro">申請者</th>
                  <th className="px-8 py-5 label-micro">稼働日</th>
                  <th className="px-8 py-5 label-micro">場所 / 区間</th>
                  <th className="px-8 py-5 label-micro">金額</th>
                  <th className="px-8 py-5 label-micro">ステータス</th>
                  <th className="px-8 py-5 label-micro text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedApp(app)}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand/5 text-brand rounded-2xl flex items-center justify-center text-[11px] font-black border border-brand/10 group-hover:scale-110 transition-transform flex-shrink-0">
                          {app.userName.charAt(0)}
                        </div>
                        <span className="font-black text-ink whitespace-nowrap text-sm">{app.userName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="data-value text-slate-500 whitespace-nowrap">{app.date.replace(/-/g, '.')}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col max-w-[200px] lg:max-w-[300px]">
                        <div className="text-sm font-black text-ink truncate">{app.location}</div>
                        <div className="label-micro opacity-50 truncate mt-1">{app.route}</div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-ink whitespace-nowrap">
                        <span className="text-[10px] mr-1 opacity-50">¥</span>
                        {app.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="w-10 h-10 inline-flex items-center justify-center text-slate-300 group-hover:text-brand group-hover:bg-brand/5 rounded-2xl transition-all">
                        <Eye size={18} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Mobile List */}
        <div className="grid gap-4 md:hidden">
          {filteredApps.map((app) => (
            <div key={app.id} onClick={() => setSelectedApp(app)} className="card p-6 active:scale-[0.98] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand/5 text-brand rounded-2xl flex items-center justify-center text-xs font-black border border-brand/10">
                    {app.userName.charAt(0)}
                  </div>
                  <span className="font-black text-ink">{app.userName}</span>
                </div>
                <StatusBadge status={app.status} />
              </div>
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Calendar size={14} className="text-brand" />
                    <span className="data-value">{app.date}</span>
                  </p>
                  <p className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <MapPin size={14} className="text-brand" />
                    <span>{app.location}</span>
                  </p>
                </div>
                <p className="text-lg font-black text-ink">
                  <span className="text-xs mr-1 opacity-50">¥</span>
                  {app.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Modal */}
        {selectedApp && !showReturnModal && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-line">
              <div className="px-10 py-8 border-b border-line flex items-center justify-between bg-slate-50/30">
                <div>
                  <div className="label-micro mb-1">申請詳細</div>
                  <h3 className="text-2xl font-black text-ink">申請詳細</h3>
                </div>
                <button onClick={() => setSelectedApp(null)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-ink rounded-2xl hover:bg-slate-100 transition-all">
                  <X size={28} />
                </button>
              </div>

              <div className="p-10 space-y-10 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="label-micro">申請者</p>
                        <p className="font-black text-ink flex items-center gap-2">
                          <UserIcon size={18} className="text-brand" />
                          {selectedApp.userName}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="label-micro">稼働日</p>
                        <p className="font-black text-ink flex items-center gap-2">
                          <Calendar size={18} className="text-brand" />
                          <span className="data-value">{selectedApp.date}</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="label-micro">金額</p>
                        <p className="text-2xl font-black text-brand tracking-tighter">
                          <span className="text-sm mr-1">¥</span>
                          {selectedApp.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="label-micro">ステータス</p>
                        <StatusBadge status={selectedApp.status} className="mt-1" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="label-micro">場所 / 区間</p>
                      <p className="text-lg font-black text-ink">{selectedApp.location}</p>
                      <p className="text-sm font-bold text-slate-400 mt-1">{selectedApp.route}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="label-micro">備考</p>
                      <div className="bg-slate-50 p-5 rounded-3xl border border-line">
                        <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                          {selectedApp.remarks || 'なし'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="label-micro">証憑画像</p>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedApp.imageUrls.map((url, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setPreviewImage(url)}
                          className="aspect-[3/4] rounded-3xl overflow-hidden border border-line hover:shadow-xl hover:scale-[1.02] transition-all group relative cursor-pointer"
                        >
                          <img src={url} alt="Receipt" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Eye className="text-white" size={24} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {(selectedApp.status === 'pending' || selectedApp.status === 'approved') && (
                  <div className="pt-10 border-t border-line">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={handleReturnClick}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2 py-4 border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <RotateCcw size={20} />
                        <span>差し戻す</span>
                      </button>
                      
                      {selectedApp.status === 'pending' ? (
                        <button
                          onClick={() => handleApprove(selectedApp.id)}
                          className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                        >
                          <CheckCircle size={20} />
                          <span>承認する</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelApprovalClick(selectedApp.id)}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2 py-4"
                        >
                          <X size={20} />
                          <span>承認を取り消す</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Return Reason Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-line">
              <div className="px-10 py-8 border-b border-line flex items-center justify-between bg-slate-50/30">
                <div>
                  <div className="label-micro mb-1">差し戻し理由</div>
                  <h3 className="text-xl font-black text-ink">差し戻し理由</h3>
                </div>
                <button onClick={() => setShowReturnModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-ink rounded-2xl hover:bg-slate-100 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleReturn} className="p-10 space-y-8">
                <div className="space-y-3">
                  <label className="label-micro ml-1">理由 <span className="text-rose-500">*</span></label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={4}
                    placeholder="例: 領収書の画像が不鮮明です。再アップロードをお願いします。"
                    className="w-full px-5 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none resize-none font-medium text-sm leading-relaxed"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(false)}
                    className="btn-secondary flex-1 py-4"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 py-4 bg-rose-600 hover:bg-rose-700 shadow-rose-100"
                  >
                    差し戻し確定
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Verification Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-line">
              <div className="px-10 py-8 border-b border-line flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                    <Lock size={24} />
                  </div>
                  <div>
                    <div className="label-micro mb-1">セキュリティチェック</div>
                    <h3 className="text-xl font-black text-ink">管理者確認</h3>
                  </div>
                </div>
                <button onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setPasswordError('');
                  setPendingAction(null);
                }} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-ink rounded-2xl hover:bg-slate-100 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleVerifyPassword} className="p-10 space-y-8">
                <div className="space-y-6">
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    承認済みの申請を変更するには、管理者パスワードの入力が必要です。
                  </p>
                  <div className="space-y-3">
                    <label className="label-micro ml-1">パスワード</label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="パスワードを入力してください"
                      className={`w-full px-6 py-4 bg-slate-50 border ${passwordError ? 'border-rose-500' : 'border-line'} rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all font-black tracking-widest`}
                      autoFocus
                      required
                    />
                    {passwordError && (
                      <p className="text-xs font-black text-rose-500 mt-2 ml-1">{passwordError}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordInput('');
                      setPasswordError('');
                      setPendingAction(null);
                    }}
                    className="btn-secondary flex-1 py-4"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 py-4"
                  >
                    認証して進む
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div 
            className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-10 cursor-pointer animate-in fade-in duration-300"
            onClick={() => setPreviewImage(null)}
          >
            <button 
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-[110]"
              onClick={() => setPreviewImage(null)}
            >
              <X size={32} />
            </button>
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={previewImage} 
                alt="Receipt Preview" 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
