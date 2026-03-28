import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { ExpenseApplication, ApplicationStatus } from '../types';

export const expenseService = {
  // 画像をアップロードして URL リストを返す
  async uploadImages(userId: string, files: File[]): Promise<string[]> {
    const uploadPromises = files.map(async (file, index) => {
      const timestamp = Date.now();
      const storageRef = ref(storage, `receipts/${userId}/${timestamp}_${index}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    });

    return Promise.all(uploadPromises);
  },

  // 申請データを作成
  async createApplication(data: Omit<ExpenseApplication, 'id' | 'createdAt'>): Promise<string> {
    console.log('Service: Creating application in Firestore...', data);
    try {
      const docRef = await addDoc(collection(db, 'applications'), {
        ...data,
        createdAt: serverTimestamp(),
      });
      console.log('Service: Application created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Service: Error in createApplication:', error);
      throw error;
    }
  },

  // 申請一覧を取得（ユーザー別、または全件）
  async getApplications(userId?: string): Promise<ExpenseApplication[]> {
    let q;
    if (userId) {
      q = query(
        collection(db, 'applications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'applications'),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data() as any;
      return {
        ...data,
        id: docSnap.id,
        // Firestore の Timestamp を文字列に変換
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate().toISOString() 
          : data.createdAt,
      } as ExpenseApplication;
    });
  },

  // 申請データを更新
  async updateApplication(id: string, updates: Partial<ExpenseApplication>): Promise<void> {
    console.log('Service: Updating application in Firestore...', { id, updates });
    try {
      const docRef = doc(db, 'applications', id);
      // id と createdAt は更新しないように除外
      const { id: _, createdAt: __, ...validUpdates } = updates as any;
      const dataToUpdate: any = { 
        ...validUpdates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, dataToUpdate);
      console.log('Service: Application updated successfully');
    } catch (error) {
      console.error('Service: Error in updateApplication:', error);
      throw error;
    }
  },

  // ステータスを更新（既存のメソッドを維持）
  async updateStatus(id: string, status: ApplicationStatus, returnReason?: string): Promise<void> {
    console.log('Service: Updating status...', { id, status });
    try {
      const docRef = doc(db, 'applications', id);
      await updateDoc(docRef, {
        status,
        returnReason: returnReason || null,
        updatedAt: serverTimestamp(),
      });
      console.log('Service: Status updated successfully');
    } catch (error) {
      console.error('Service: Error in updateStatus:', error);
      throw error;
    }
  }
};
