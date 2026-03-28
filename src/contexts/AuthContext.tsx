import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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
    // Firebase Auth の状態を監視
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Firestore からユーザー情報を取得
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setAuthState({ user: userData, loading: false });
          } else {
            // Firestore に情報がない場合 (初期管理者の直後など)
            setAuthState({ 
              user: { 
                id: firebaseUser.uid, 
                email: firebaseUser.email || '', 
                name: 'Unknown User', 
                role: 'intern' 
              }, 
              loading: false 
            });
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          setAuthState({ user: null, loading: false });
        }
      } else {
        setAuthState({ user: null, loading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // login 自体は成功すればOK。authState の更新は onAuthStateChanged が担当。
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'メールアドレスまたはパスワードが正しくありません。';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = '形式が正しくないか、認証情報が間違っています。';
      }
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
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
