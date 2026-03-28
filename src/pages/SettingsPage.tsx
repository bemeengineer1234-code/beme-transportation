import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Save, User as UserIcon, Shield, Bell, Globe, Loader2, CheckCircle2, ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';

interface SettingsPageProps {
  onNavigate: (view: 'dashboard' | 'settings') => void;
  activeView: 'dashboard' | 'settings';
}

type SubView = 'main' | 'users' | 'master' | 'notifications';

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate, activeView }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [subView, setSubView] = useState<SubView>('main');

  // Settings state
  const [systemName, setSystemName] = useState('交通費精算ポータル');
  const [adminEmail, setAdminEmail] = useState('admin@example.com');
  const [notifyOnNew, setNotifyOnNew] = useState(true);
  const [notifyOnReturn, setNotifyOnReturn] = useState(true);

  // User Management state
  const [users, setUsers] = useState<User[]>([]);

  // Master Data state
  const [locations, setLocations] = useState<string[]>([]);

  // Notification Template state
  const [emailSubject, setEmailSubject] = useState('【交通費精算】申請が承認されました');
  const [emailBody, setEmailBody] = useState(`{userName} 様\n\nお疲れ様です。管理者の{adminName}です。\n{date}分の交通費申請を承認しました。\n\nご確認ください。`);

  // Modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', role: 'intern', password: '' });

  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [masterType, setMasterType] = useState<'location' | 'project'>('location');
  const [editingMasterIndex, setEditingMasterIndex] = useState<number | null>(null);
  const [masterFormData, setMasterFormData] = useState('');

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'location' | 'project', id?: string, index?: number } | null>(null);

  // Load settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSystemName(data.systemName || '交通費精算ポータル');
          setAdminEmail(data.adminEmail || 'admin@example.com');
          setNotifyOnNew(data.notifyOnNew !== undefined ? data.notifyOnNew : true);
          setNotifyOnReturn(data.notifyOnReturn !== undefined ? data.notifyOnReturn : true);
        }

        const usersSnapshot = await getDocs(collection(db, 'users'));
        setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));

        const masterDoc = await getDoc(doc(db, 'settings', 'master'));
        if (masterDoc.exists()) {
          setLocations(masterDoc.data().locations || []);
        }

        const templateDoc = await getDoc(doc(db, 'settings', 'templates'));
        if (templateDoc.exists()) {
          setEmailSubject(templateDoc.data().emailSubject || '');
          setEmailBody(templateDoc.data().emailBody || '');
        }
      } catch (error) {
        console.error('Failed to fetch settings from Firestore:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        systemName,
        adminEmail,
        notifyOnNew,
        notifyOnReturn
      }, { merge: true });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplates = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'templates'), {
        emailSubject,
        emailBody
      }, { merge: true });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save templates:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // User Handlers
  const handleAddUser = () => {
    setEditingUser(null);
    setUserFormData({ name: '', email: '', role: 'intern', password: '' });
    setIsUserModalOpen(true);
  };

  const handleEditUser = (id: string) => {
    const userMatched = users.find(u => u.id === id);
    if (!userMatched) return;
    setEditingUser(userMatched);
    setUserFormData({ name: userMatched.name, email: userMatched.email, role: userMatched.role, password: '' });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userFormData.name || !userFormData.email) return;
    
    try {
      setIsSaving(true);
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.id), {
          name: userFormData.name,
          email: userFormData.email,
          role: userFormData.role as UserRole
        });
      } else {
        if (!userFormData.password) {
          alert('新規ユーザー作成にはパスワードが必要です。');
          return;
        }

        // 1. Firebase Auth にアカウント作成 (現在のセッションを維持するため別インスタンスを使用)
        const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          userFormData.email, 
          userFormData.password
        );
        const authId = userCredential.user.uid;

        // 2. Firestore にプロフィール作成
        await setDoc(doc(db, 'users', authId), {
          id: authId,
          name: userFormData.name,
          email: userFormData.email,
          role: userFormData.role,
          createdAt: new Date().toISOString()
        });

        // インスタンス破棄
        await deleteApp(secondaryApp);
      }
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      setIsUserModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('Failed to save user:', error);
      alert(`ユーザーの保存に失敗しました。\nエラー: ${error.message || '不明なエラー'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    setDeleteTarget({ type: 'user', id });
    setIsDeleteConfirmOpen(true);
  };

  // Master Data Handlers
  const handleAddLocation = () => {
    setMasterType('location');
    setEditingMasterIndex(null);
    setMasterFormData('');
    setIsMasterModalOpen(true);
  };

  const handleSaveMaster = async () => {
    if (!masterFormData) return;

    try {
      const updated = [...locations, masterFormData];
      await setDoc(doc(db, 'settings', 'master'), { locations: updated }, { merge: true });
      setLocations(updated);
      setIsMasterModalOpen(false);
    } catch (error) {
      console.error('Failed to save master data:', error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'user') {
        const idToDelete = deleteTarget.id!;
        await deleteDoc(doc(db, 'users', idToDelete));
        setUsers(users.filter(u => u.id !== idToDelete));
      } else if (deleteTarget.type === 'location') {
        const updated = locations.filter((_, i) => i !== deleteTarget.index);
        await setDoc(doc(db, 'settings', 'master'), { locations: updated }, { merge: true });
        setLocations(updated);
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const renderMainSettings = () => (
    <div className="space-y-8">
      <div className="card overflow-hidden">
        <div className="p-10 border-b border-line bg-slate-50/30">
          <div className="label-micro mb-2">システム設定</div>
          <h3 className="text-2xl font-black text-ink flex items-center gap-4">
            <Shield className="text-brand" size={28} />
            <span>管理者設定</span>
          </h3>
          <p className="text-sm text-slate-400 mt-2 font-medium">システム全体の動作や権限を設定します。</p>
        </div>
        
        <div className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="label-micro ml-1">システム名</label>
              <input 
                type="text" 
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50/50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-ink transition-all"
              />
            </div>
            <div className="space-y-3">
              <label className="label-micro ml-1">管理用メールアドレス</label>
              <input 
                type="email" 
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50/50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-ink transition-all"
              />
            </div>
          </div>

          <div className="space-y-8 pt-4">
            <h4 className="label-micro border-b border-line pb-4">通知設定</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="flex items-center justify-between p-6 bg-slate-50/50 border border-line rounded-[32px] cursor-pointer group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                <span className="text-sm font-black text-slate-600 group-hover:text-ink">新規申請時にメール通知</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifyOnNew}
                    onChange={(e) => setNotifyOnNew(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
              </label>
              <label className="flex items-center justify-between p-6 bg-slate-50/50 border border-line rounded-[32px] cursor-pointer group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                <span className="text-sm font-black text-slate-600 group-hover:text-ink">差し戻し時に申請者に通知</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifyOnReturn}
                    onChange={(e) => setNotifyOnReturn(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50/50 border-t border-line flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center gap-3 px-10 py-4"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            <span>{isSaving ? '保存中...' : '設定を保存'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <button 
          onClick={() => setSubView('users')}
          className="card p-10 hover:shadow-2xl hover:shadow-brand/5 transition-all cursor-pointer group text-left w-full border-line hover:border-brand/20"
        >
          <div className="w-16 h-16 bg-brand/5 text-brand rounded-[24px] flex items-center justify-center mb-8 group-hover:bg-brand group-hover:text-white transition-all group-hover:scale-110 group-hover:rotate-3">
            <UserIcon size={32} />
          </div>
          <div className="label-micro mb-2">管理</div>
          <h4 className="text-xl font-black text-ink">ユーザー管理</h4>
          <p className="text-xs text-slate-400 mt-3 font-medium leading-relaxed">インターン生の追加・削除や権限変更を行います。</p>
        </button>
        <button 
          onClick={() => setSubView('master')}
          className="card p-10 hover:shadow-2xl hover:shadow-brand/5 transition-all cursor-pointer group text-left w-full border-line hover:border-brand/20"
        >
          <div className="w-16 h-16 bg-brand/5 text-brand rounded-[24px] flex items-center justify-center mb-8 group-hover:bg-brand group-hover:text-white transition-all group-hover:scale-110 group-hover:-rotate-3">
            <Globe size={32} />
          </div>
          <div className="label-micro mb-2">マスタデータ</div>
          <h4 className="text-xl font-black text-ink">共通マスタ設定</h4>
          <p className="text-xs text-slate-400 mt-3 font-medium leading-relaxed">稼働場所の管理を行います。</p>
        </button>
        <button 
          onClick={() => setSubView('notifications')}
          className="card p-10 hover:shadow-2xl hover:shadow-brand/5 transition-all cursor-pointer group text-left w-full border-line hover:border-brand/20"
        >
          <div className="w-16 h-16 bg-brand/5 text-brand rounded-[24px] flex items-center justify-center mb-8 group-hover:bg-brand group-hover:text-white transition-all group-hover:scale-110 group-hover:rotate-3">
            <Bell size={32} />
          </div>
          <div className="label-micro mb-2">テンプレート</div>
          <h4 className="text-xl font-black text-ink">通知テンプレート</h4>
          <p className="text-xs text-slate-400 mt-3 font-medium leading-relaxed">自動送信メールの文面をカスタマイズします。</p>
        </button>
      </div>
    </div>
  );

  const renderUsersView = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => setSubView('main')} className="flex items-center gap-3 text-slate-400 hover:text-ink transition-all font-black group">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center group-hover:bg-slate-100 transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-sm tracking-widest uppercase">Back</span>
        </button>
        <button 
          onClick={handleAddUser}
          className="btn-primary flex items-center gap-2 px-6 py-3"
        >
          <Plus size={20} />
          <span>ユーザー追加</span>
        </button>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-line">
                <th className="px-10 py-6 label-micro w-1/4">氏名</th>
                <th className="px-10 py-6 label-micro w-1/3">メールアドレス</th>
                <th className="px-10 py-6 label-micro">権限</th>
                <th className="px-10 py-6 label-micro text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-[20px] flex items-center justify-center text-xs font-black border border-line group-hover:bg-brand/5 group-hover:text-brand group-hover:border-brand/10 transition-all">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-black text-ink whitespace-nowrap">{u.name}</span>
                    </div>
                  </td>
                <td className="px-10 py-6">
                  <span className="data-value text-slate-500">{u.email}</span>
                </td>
                <td className="px-10 py-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.role === 'admin' ? 'bg-brand/5 text-brand border-brand/10' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {u.role === 'admin' ? '管理者' : 'インターン'}
                  </span>
                </td>
                <td className="px-10 py-6 text-right space-x-2">
                  <button 
                    onClick={() => handleEditUser(u.id)}
                    className="w-10 h-10 inline-flex items-center justify-center text-slate-300 hover:text-brand hover:bg-brand/5 rounded-2xl transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(u.id)}
                    className="w-10 h-10 inline-flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

  const renderMasterView = () => {
    // Group locations to show counts (e.g., "x2")
    const groupedLocations = locations.reduce((acc: { [key: string]: number }, loc) => {
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="space-y-8">
        <button onClick={() => setSubView('main')} className="flex items-center gap-3 text-slate-400 hover:text-ink transition-all font-black group">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center group-hover:bg-slate-100 transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-sm tracking-widest uppercase">Back</span>
        </button>
        <div className="max-w-2xl mx-auto">
          <div className="card p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="label-micro mb-1">マスタデータ</div>
                <h4 className="text-xl font-black text-ink">稼働場所マスタ</h4>
              </div>
              <button 
                onClick={handleAddLocation}
                className="w-12 h-12 bg-brand/5 text-brand rounded-2xl flex items-center justify-center hover:bg-brand hover:text-white transition-all shadow-xl shadow-brand/5"
              >
                <Plus size={24} />
              </button>
            </div>
            <div className="space-y-4">
              {Object.entries(groupedLocations).map(([loc, count], i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-slate-50/50 border border-line rounded-[24px] group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-ink">{loc}</span>
                    {(count as number) > 1 && (
                      <span className="px-3 py-1 bg-brand/5 text-brand text-[10px] font-black rounded-full border border-brand/10">
                        ×{count}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      const updated = locations.filter(l => l !== loc);
                      setLocations(updated);
                      localStorage.setItem('app_master', JSON.stringify({ locations: updated }));
                    }}
                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {Object.keys(groupedLocations).length === 0 && (
                <p className="text-center py-12 text-slate-400 text-sm font-bold italic">登録された場所はありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNotificationsView = () => (
    <div className="space-y-8">
      <button onClick={() => setSubView('main')} className="flex items-center gap-3 text-slate-400 hover:text-ink transition-all font-black group">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center group-hover:bg-slate-100 transition-all">
          <ArrowLeft size={20} />
        </div>
        <span className="text-sm tracking-widest uppercase">戻る</span>
      </button>
      <div className="card p-10 space-y-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand/5 text-brand rounded-2xl flex items-center justify-center">
            <Bell size={24} />
          </div>
          <div>
            <div className="label-micro mb-1">メールテンプレート</div>
            <h4 className="text-xl font-black text-ink">承認通知メール</h4>
          </div>
        </div>
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="label-micro ml-1">件名</label>
            <input 
              type="text" 
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all font-black text-ink" 
            />
          </div>
          <div className="space-y-3">
            <label className="label-micro ml-1">本文</label>
            <textarea 
              rows={8} 
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full px-6 py-5 bg-slate-50 border border-line rounded-[32px] focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all font-medium text-ink resize-none leading-relaxed" 
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSaveTemplates}
            disabled={isSaving}
            className="btn-primary flex items-center gap-3 px-10 py-4"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            <span>{isSaving ? '保存中...' : 'テンプレートを保存'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout title={subView === 'main' ? 'システム設定' : subView === 'users' ? 'ユーザー管理' : subView === 'master' ? '共通マスタ設定' : '通知テンプレート'} onNavigate={onNavigate} activeView={activeView}>
      <div className="space-y-6">
        {showSuccess && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="text-emerald-600" size={20} />
            <p className="text-emerald-900 font-bold text-sm">設定を保存しました。</p>
          </div>
        )}

        {subView === 'main' && renderMainSettings()}
        {subView === 'users' && renderUsersView()}
        {subView === 'master' && renderMasterView()}
        {subView === 'notifications' && renderNotificationsView()}
      </div>

        {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-line">
            <div className="px-10 py-8 border-b border-line bg-slate-50/30">
              <div className="label-micro mb-1">ユーザープロフィール</div>
              <h3 className="text-2xl font-black text-ink">{editingUser ? 'ユーザー編集' : 'ユーザー追加'}</h3>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-3">
                <label className="label-micro ml-1">名前</label>
                <input 
                  type="text" 
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-ink transition-all"
                  placeholder="山田 太郎"
                />
              </div>
              <div className="space-y-3">
                <label className="label-micro ml-1">メールアドレス</label>
                <input 
                  type="email" 
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-ink transition-all"
                  placeholder="example@example.com"
                />
              </div>
              <div className="space-y-3">
                <label className="label-micro ml-1">パスワード</label>
                <input 
                  type="password" 
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-ink transition-all"
                  placeholder="パスワードを設定"
                />
              </div>
              <div className="space-y-3">
                <label className="label-micro ml-1">権限</label>
                <select 
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                  className="w-full px-6 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-ink transition-all appearance-none cursor-pointer"
                >
                  <option value="intern">インターン</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
            </div>
            <div className="p-10 bg-slate-50/50 border-t border-line flex justify-end gap-4">
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="btn-secondary px-6 py-3"
              >
                キャンセル
              </button>
              <button 
                onClick={handleSaveUser}
                disabled={isSaving}
                className="btn-primary px-8 py-3 flex items-center gap-2"
              >
                {isSaving && <Loader2 size={18} className="animate-spin" />}
                <span>保存</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Modal */}
      {isMasterModalOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-line">
            <div className="px-10 py-8 border-b border-line bg-slate-50/30">
              <div className="label-micro mb-1">マスタデータ</div>
              <h3 className="text-2xl font-black text-ink">
                稼働場所追加
              </h3>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-3">
                <label className="label-micro ml-1">
                  場所名
                </label>
                <input 
                  type="text" 
                  value={masterFormData}
                  onChange={(e) => setMasterFormData(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-line rounded-3xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-black text-ink transition-all"
                  placeholder="例: 東京オフィス"
                />
              </div>
            </div>
            <div className="p-10 bg-slate-50/50 border-t border-line flex justify-end gap-4">
              <button 
                onClick={() => setIsMasterModalOpen(false)}
                className="btn-secondary px-6 py-3"
              >
                キャンセル
              </button>
              <button 
                onClick={handleSaveMaster}
                className="btn-primary px-8 py-3"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-line">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-ink mb-3">削除の確認</h3>
              <p className="text-sm font-medium text-slate-400 leading-relaxed">この項目を削除してもよろしいですか？<br />この操作は取り消せません。</p>
            </div>
            <div className="p-10 bg-slate-50/50 border-t border-line flex justify-center gap-4">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="btn-secondary flex-1 py-4"
              >
                キャンセル
              </button>
              <button 
                onClick={confirmDelete}
                className="btn-primary flex-1 py-4 bg-rose-600 hover:bg-rose-700 shadow-rose-100"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

