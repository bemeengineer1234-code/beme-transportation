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
    const docRef = await addDoc(collection(db, 'applications'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
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

  // ステータスを更新
  async updateStatus(id: string, status: ApplicationStatus, returnReason?: string): Promise<void> {
    const docRef = doc(db, 'applications', id);
    await updateDoc(docRef, {
      status,
      returnReason: returnReason || null,
      updatedAt: serverTimestamp(),
    });
  }
};
