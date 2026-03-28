import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Plus, Image as ImageIcon, X, Send, AlertCircle, ChevronRight, MapPin, Navigation, CreditCard, FileText, CheckCircle, RotateCcw, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useApplications } from '../contexts/ApplicationContext';
import { ExpenseApplication } from '../types';
import { expenseService } from '../lib/expenseService';

interface InternDashboardProps {
  onNavigate: (view: 'dashboard' | 'settings') => void;
  activeView: 'dashboard' | 'settings';
}

export const InternDashboard: React.FC<InternDashboardProps> = ({ onNavigate, activeView }) => {
  const { user } = useAuth();
  const { applications: allApplications, addApplication, updateApplication, loading: contextLoading } = useApplications();
  const [showForm, setShowForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ExpenseApplication | null>(null);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const applications = allApplications.filter(a => a.userId === user?.id);
  const loading = contextLoading;
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [departureStation, setDepartureStation] = useState('');
  const [arrivalStation, setArrivalStation] = useState('');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [masterLocations, setMasterLocations] = useState<string[]>([]);

  useEffect(() => {
    // Initial data is handled by context, but we keep the master data loading
  }, [user?.id]);

  // Load master data for suggestions
  useEffect(() => {
    const savedMaster = localStorage.getItem('app_master');
    if (savedMaster) {
      try {
        const { locations } = JSON.parse(savedMaster);
        setMasterLocations(Array.from(new Set(locations as string[])));
      } catch (e) {
        console.error('Failed to parse master data', e);
      }
    }
  }, []);

  const availableMonths = Array.from(new Set(applications.map(app => app.date.substring(0, 7)))).sort().reverse() as string[];
  const currentMonth = new Date().toISOString().substring(0, 7);
  if (!availableMonths.includes(currentMonth)) {
    availableMonths.unshift(currentMonth);
  }

  const filteredApps = applications.filter(app => app.date.startsWith(selectedMonth));
  const finalFilteredApps = filteredApps.filter(app => statusFilter === 'all' || app.status === statusFilter);

  // Summary stats for the selected month
  const approvedTotal = filteredApps.filter(a => a.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0);
  const returnedTotal = filteredApps.filter(a => a.status === 'returned').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingTotal = filteredApps.filter(a => a.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingCount = filteredApps.filter(a => a.status === 'pending').length;
  const approvedCount = filteredApps.filter(a => a.status === 'approved').length;
  const returnedCount = filteredApps.filter(a => a.status === 'returned').length;

  // Calendar logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(yearNum, monthNum - 1);
  const firstDay = getFirstDayOfMonth(yearNum, monthNum - 1);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const appsByDay = filteredApps.reduce((acc: { [key: number]: ExpenseApplication[] }, app) => {
    const day = Number(app.date.split('-')[2]);
    if (!acc[day]) acc[day] = [];
    acc[day].push(app);
    return acc;
  }, {});

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      if (images.length + newFiles.length > 5) {
        alert('画像は最大5枚までアップロード可能です。');
        return;
      }
      setImages([...images, ...newFiles]);
      const newPreviews = newFiles.map((file: File) => URL.createObjectURL(file));
      setPreviews([...previews, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const previewToRemove = previews[index];
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);

    // blob: で始まるのが新しく追加された画像
    if (previewToRemove.startsWith('blob:')) {
      // images 配列から対応するファイルを削除
      // previews 内の blob: 画像の順番と images 配列の順番は一致しているはず
      const blobPreviewsBefore = previews.slice(0, index).filter(p => p.startsWith('blob:'));
      const imageIndex = blobPreviewsBefore.length;
      
      const newImages = [...images];
      newImages.splice(imageIndex, 1);
      setImages(newImages);
      
      URL.revokeObjectURL(previewToRemove);
    }
  };

  const handleEdit = (app: ExpenseApplication) => {
    setEditingAppId(app.id);
    setDate(app.date);
    setLocation(app.location);
    setDepartureStation(app.departureStation);
    setArrivalStation(app.arrivalStation);
    setAmount(app.amount.toString());
    setRemarks(app.remarks);
    setPreviews(app.imageUrls);
    setShowForm(true);
  };

  const handleView = (app: ExpenseApplication) => {
    setSelectedApp(app);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.error('Submit blocked: No user found');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Starting submission...', { date, location, amount, imagesCount: images.length });
      
      // 送信タイムアウトの設定 (例: 30秒)
      const submissionPromise = (async () => {
        // 画像のアップロード
        let imageUrls = previews.filter(p => p.startsWith('http') || p.startsWith('data:image/'));
        const newImages = images;
        
        if (newImages.length > 0) {
          console.log('Uploading new images...', newImages.length);
          const uploadedUrls = await expenseService.uploadImages(user.id, newImages);
          console.log('Upload success:', uploadedUrls);
          imageUrls = [...imageUrls, ...uploadedUrls];
        }

        const applicationData = {
          userId: user.id,
          userName: user.name,
          date,
          location,
          departureStation,
          arrivalStation,
          route: `${departureStation} 〜 ${arrivalStation}`,
          amount: Number(amount),
          remarks,
          imageUrls,
          status: 'pending' as const
        };

        if (editingAppId) {
          console.log('Updating existing application:', editingAppId);
          await updateApplication(editingAppId, applicationData);
        } else {
          console.log('Creating new application...');
          await addApplication(applicationData);
        }
      })();

      // タイムアウト監視
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('送信がタイムアウトしました。ネットワーク接続や Firebase の設定（特にストレージ）を確認してください。')), 40000);
      });

      await Promise.race([submissionPromise, timeoutPromise]);

      console.log('Submission complete success!');
      setShowForm(false);
      resetForm();
    } catch (error: any) {
      console.error('Submission failed with error:', error);
      alert(`送信に失敗しました。\nエラー: ${error.message || '不明なエラー'}\nコンソールログを確認してください。`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingAppId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setDepartureStation('');
    setArrivalStation('');
    setAmount('');
    setRemarks('');
    setImages([]);
    setPreviews([]);
  };

  return (
    <Layout title="My申請" onNavigate={onNavigate} activeView={activeView}>
      <div className="space-y-8">
        {/* Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="card p-5 sm:p-8 group shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="label-micro text-emerald-500">承認済み合計</div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tighter">¥{approvedTotal.toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-400">/ {approvedCount}件</span>
            </div>
          </div>

          <div className="card p-5 sm:p-8 group shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="label-micro text-rose-500">差し戻し合計</div>
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tighter">¥{returnedTotal.toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-400">/ {returnedCount}件</span>
            </div>
          </div>

          <div className="card p-5 sm:p-8 group shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="label-micro text-amber-500">申請中合計</div>
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tighter">¥{pendingTotal.toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-400">/ {pendingCount}件</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="label-micro mb-1">表示月</div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-line rounded-2xl px-5 py-3 text-sm font-black text-ink focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none cursor-pointer transition-all appearance-none min-w-[140px]"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>{month.replace('-', '年')}月</option>
                ))}
              </select>
            </div>
            <div className="h-10 w-px bg-line self-end mb-1 hidden sm:block" />
            <div>
              <div className="label-micro mb-1">ステータス</div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-line rounded-2xl px-5 py-3 text-sm font-black text-ink focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none cursor-pointer transition-all appearance-none min-w-[140px]"
              >
                <option value="all">すべて</option>
                <option value="pending">申請中</option>
                <option value="approved">承認済み</option>
                <option value="returned">差し戻し</option>
              </select>
            </div>
            <div className="h-10 w-px bg-line self-end mb-1 hidden sm:block" />
            <div>
              <div className="label-micro mb-1">表示形式</div>
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'list' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  リスト
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'calendar' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  カレンダー
                </button>
              </div>
            </div>
            <div className="h-10 w-px bg-line self-end mb-1 hidden sm:block" />
            <div>
              <div className="label-micro mb-1">履歴</div>
              <h3 className="text-2xl font-black text-ink tracking-tighter">申請履歴</h3>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center justify-center gap-2 px-8 py-3"
          >
            <Plus size={20} />
            <span>新規申請</span>
          </button>
        </div>

        {/* Returned Alert */}
        {applications.some(a => a.status === 'returned') && (
          <button 
            onClick={() => {
              const returnedApp = applications.find(a => a.status === 'returned');
              if (returnedApp) {
                const appMonth = returnedApp.date.substring(0, 7);
                setSelectedMonth(appMonth);
              }
              setStatusFilter('returned');
              setViewMode('list');
              setTimeout(() => {
                document.getElementById('application-list')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="w-full bg-rose-50 border border-rose-100 p-5 rounded-3xl flex items-start gap-4 hover:bg-rose-100 transition-all text-left mb-6 group"
          >
            <div className="w-10 h-10 bg-rose-600 text-white rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-rose-900 font-black text-sm">{user?.name} 様、差し戻された申請があります</p>
              <p className="text-rose-700 text-xs font-bold mt-1 opacity-80">内容を確認し、修正して再申請してください。</p>
            </div>
          </button>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="card p-8 overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 gap-px bg-line border border-line rounded-3xl overflow-hidden shadow-sm">
                {['日', '月', '火', '水', '木', '金', '土'].map(d => (
                  <div key={d} className={`bg-slate-50 py-4 text-center label-micro ${d === '日' ? 'text-rose-500' : d === '土' ? 'text-brand' : 'text-slate-400'}`}>
                    {d}
                  </div>
                ))}
                {blanks.map(b => (
                  <div key={`blank-${b}`} className="bg-white/50 min-h-[120px] p-2" />
                ))}
                {calendarDays.map(day => {
                  const dayApps = appsByDay[day] || [];
                  const isToday = new Date().toISOString().startsWith(selectedMonth) && new Date().getDate() === day;
                  
                  return (
                    <div key={day} className={`bg-white min-h-[140px] p-3 border-t border-line transition-all hover:bg-brand/5 group ${isToday ? 'bg-brand/5' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-black ${isToday ? 'w-7 h-7 bg-brand text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20' : 'text-slate-400'}`}>
                          {day}
                        </span>
                        {dayApps.length > 0 && (
                          <span className="text-[10px] font-black text-brand bg-brand/10 px-2 py-0.5 rounded-lg">
                            {dayApps.length}件
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {dayApps.map(app => (
                          <button
                            key={app.id}
                            onClick={() => handleView(app)}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl bg-slate-50 border border-line hover:border-brand/30 hover:bg-white hover:shadow-md transition-all group/item"
                          >
                            <div className="text-[10px] font-black text-ink truncate group-hover/item:text-brand">¥{app.amount.toLocaleString()}</div>
                            <div className="text-[9px] font-bold text-slate-400 truncate">{app.location}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Application List */}
        {viewMode === 'list' && (
          <div id="application-list" className="grid gap-4">
            {finalFilteredApps.length === 0 ? (
              <div className="card p-16 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-slate-300 border border-line">
                  <FileText size={40} />
                </div>
                <p className="text-slate-400 font-black text-lg tracking-tight">条件に一致する申請履歴はありません</p>
              </div>
            ) : (
              finalFilteredApps.map((app) => (
              <div 
                key={app.id} 
                className="card p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 group cursor-pointer active:scale-[0.99]"
                onClick={() => handleView(app)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex flex-col items-center justify-center border border-line group-hover:bg-brand/5 group-hover:border-brand/20 transition-all group-hover:scale-105">
                      <span className="text-[11px] font-black text-slate-400 uppercase leading-none mb-1">{app.date.split('-')[1]}月</span>
                      <span className="text-2xl font-black text-ink leading-none tracking-tighter">{app.date.split('-')[2]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-4 mb-2">
                        <span className="data-value text-slate-400">{app.date.replace(/-/g, '.')}</span>
                        <StatusBadge status={app.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                        <span className="flex items-center gap-2 text-base font-black text-ink">
                          <MapPin size={16} className="text-brand" /> {app.location}
                        </span>
                        <span className="text-xl font-black text-brand tracking-tighter">
                          <span className="text-xs mr-1 opacity-50">¥</span>
                          {app.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-5 self-end sm:self-auto">
                    {app.status === 'returned' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(app); }}
                        className="px-6 py-2 bg-rose-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
                      >
                        修正する
                      </button>
                    )}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-brand group-hover:bg-brand/5 transition-all">
                      <ChevronRight size={24} />
                    </div>
                  </div>
                </div>
  
                {app.status === 'returned' && app.returnReason && (
                  <div className="mt-6 p-5 bg-rose-50/50 rounded-3xl border border-rose-100/50 text-xs text-rose-700 leading-relaxed font-bold">
                    <span className="label-micro text-rose-400 block mb-2">差し戻し理由</span>
                    {app.returnReason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

        {/* New Application Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-line">
              <div className="px-10 py-8 border-b border-line flex items-center justify-between bg-slate-50/30">
                <div>
                  <div className="label-micro mb-1">Application Form</div>
                  <h3 className="text-2xl font-black text-ink">
                    {editingAppId ? '申請内容の修正' : '新規交通費申請'}
                  </h3>
                </div>
                <button onClick={() => setShowForm(false)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-ink rounded-2xl hover:bg-slate-100 transition-all">
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="label-micro ml-1 flex items-center gap-2">
                      <Calendar size={14} className="text-brand" /> 稼働日
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-sm transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="label-micro ml-1 flex items-center gap-2">
                      <MapPin size={14} className="text-brand" /> 稼働場所
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="例: 幕張メッセ"
                      list="location-suggestions"
                      className="w-full px-5 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-sm transition-all"
                      required
                    />
                    <datalist id="location-suggestions">
                      {masterLocations.map((loc, i) => (
                        <option key={i} value={loc} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <label className="label-micro ml-1 flex items-center gap-2">
                      <Navigation size={14} className="text-brand" /> 移動区間
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        value={departureStation}
                        onChange={(e) => setDepartureStation(e.target.value)}
                        placeholder="出発駅"
                        className="flex-1 px-5 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-sm transition-all"
                        required
                      />
                      <span className="text-slate-300 font-black">〜</span>
                      <input
                        type="text"
                        value={arrivalStation}
                        onChange={(e) => setArrivalStation(e.target.value)}
                        placeholder="到着駅"
                        className="flex-1 px-5 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-sm transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="label-micro ml-1 flex items-center gap-2">
                      <CreditCard size={14} className="text-brand" /> 金額 (円)
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">¥</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="1,200"
                        className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-sm transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="label-micro ml-1">備考</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    placeholder="特記事項があれば入力してください"
                    className="w-full px-5 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none resize-none font-medium text-sm leading-relaxed transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <label className="label-micro ml-1 block">証憑画像 (複数可)</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {previews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-square rounded-[24px] overflow-hidden border border-line group shadow-sm">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 w-7 h-7 bg-rose-600 text-white rounded-xl shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-[24px] border-2 border-dashed border-line flex flex-col items-center justify-center text-slate-400 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all cursor-pointer bg-slate-50 group">
                      <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-line group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                      </div>
                      <span className="text-[10px] font-black mt-2 uppercase tracking-widest">追加</span>
                      <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary flex-1 py-4"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`btn-primary flex-1 py-4 flex items-center justify-center gap-2 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                    <span>{submitting ? '送信中...' : (editingAppId ? '更新する' : '申請する')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedApp && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-line">
              <div className="px-10 py-8 border-b border-line flex items-center justify-between bg-slate-50/30">
                <div>
                  <div className="label-micro mb-1">Application Detail</div>
                  <h3 className="text-2xl font-black text-ink">申請詳細</h3>
                </div>
                <button onClick={() => setSelectedApp(null)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-ink rounded-2xl hover:bg-slate-100 transition-all">
                  <X size={28} />
                </button>
              </div>

              <div className="p-10 space-y-10 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-8">
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
                    <p className="label-micro">場所</p>
                    <p className="text-ink font-black flex items-center gap-2">
                      <MapPin size={18} className="text-brand" /> {selectedApp.location}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="label-micro">ステータス</p>
                    <StatusBadge status={selectedApp.status} className="mt-1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="label-micro">移動区間</p>
                  <p className="text-ink font-black flex items-center gap-2">
                    <Navigation size={18} className="text-brand" /> {selectedApp.route}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="label-micro">備考</p>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-line">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                      {selectedApp.remarks || 'なし'}
                    </p>
                  </div>
                </div>

                {selectedApp.status === 'returned' && selectedApp.returnReason && (
                  <div className="p-5 bg-rose-50 rounded-3xl border border-rose-100">
                    <p className="label-micro text-rose-400 mb-2">差し戻し理由</p>
                    <p className="text-sm text-rose-700 font-bold">{selectedApp.returnReason}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <p className="label-micro">証憑画像</p>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedApp.imageUrls.map((url, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setPreviewImage(url)}
                        className="aspect-square rounded-[24px] overflow-hidden border border-line shadow-sm hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <img src={url} alt="Receipt" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  {selectedApp.status === 'returned' ? (
                    <button
                      onClick={() => {
                        handleEdit(selectedApp);
                        setSelectedApp(null);
                      }}
                      className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                    >
                      <span>修正する</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedApp(null)}
                      className="btn-secondary w-full py-4"
                    >
                      閉じる
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

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
    </Layout>
  );
};
