import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';
import { mockUsers } from '../mock/data';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      setAuthState({ user: JSON.parse(savedUser), loading: false });
    } else {
      setAuthState({ user: null, loading: false });
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 1. localStorage からユーザーリストを取得
        const savedUsers = localStorage.getItem('app_users');
        let users = mockUsers;
        if (savedUsers) {
          try {
            users = JSON.parse(savedUsers);
          } catch (e) {
            console.error('Failed to parse app_users', e);
          }
        }

        // 2. ユーザーを検索
        const user = users.find(u => u.email === email);
        
        if (!user) {
          reject(new Error('メールアドレスまたはパスワードが正しくありません。'));
          return;
        }

        // 3. パスワードチェック (デモ用なので簡易的)
        // SettingsPage で設定されたパスワード、またはデフォルトの 'password123'
        const validPassword = (user as any).password || 'password123';
        
        if (password !== validPassword) {
          reject(new Error('メールアドレスまたはパスワードが正しくありません。'));
          return;
        }

        // 4. ロールを内部形式に変換 (SettingsPage では日本語で保存されている可能性があるため)
        const normalizedUser: User = {
          ...user,
          role: user.role === '管理者' ? 'admin' : (user.role === 'admin' ? 'admin' : 'intern')
        };

        setAuthState({ user: normalizedUser, loading: false });
        localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
        resolve();
      }, 800);
    });
  };

  const logout = () => {
    setAuthState({ user: null, loading: false });
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
