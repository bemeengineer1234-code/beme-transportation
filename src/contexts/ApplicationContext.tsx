import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExpenseApplication } from '../types';
import { expenseService } from '../lib/expenseService';

interface ApplicationContextType {
  applications: ExpenseApplication[];
  loading: boolean;
  addApplication: (data: Omit<ExpenseApplication, 'id' | 'createdAt'>) => Promise<string>;
  updateApplication: (id: string, updates: Partial<ExpenseApplication>) => Promise<void>;
  updateStatus: (id: string, status: any, reason?: string) => Promise<void>;
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export const ApplicationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [applications, setApplications] = useState<ExpenseApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'applications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate().toISOString() 
            : data.createdAt,
        } as ExpenseApplication;
      });
      setApplications(apps);
      setLoading(false);
    }, (error) => {
      console.error('Firestore onSnapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addApplication = async (data: Omit<ExpenseApplication, 'id' | 'createdAt'>) => {
    return await expenseService.createApplication(data);
  };

  const updateApplication = async (id: string, updates: Partial<ExpenseApplication>) => {
    await expenseService.updateApplication(id, updates);
  };

  const updateStatus = async (id: string, status: any, reason?: string) => {
    await expenseService.updateStatus(id, status, reason);
  };

  return (
    <ApplicationContext.Provider value={{ applications, loading, addApplication, updateApplication, updateStatus }}>
      {children}
    </ApplicationContext.Provider>
  );
};

export const useApplications = () => {
  const context = useContext(ApplicationContext);
  if (context === undefined) {
    throw new Error('useApplications must be used within an ApplicationProvider');
  }
  return context;
};
