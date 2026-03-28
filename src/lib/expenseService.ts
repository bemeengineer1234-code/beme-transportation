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
import { db } from './firebase';
import { ExpenseApplication, ApplicationStatus } from '../types';

export const expenseService = {
  // 画像を圧縮して Base64 文字列に変換するヘルパー
  async compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 最大幅/高さを 1000px に制限してリサイズ
          const MAX_SIZE = 1000;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // 画質を 0.6 (60%) に落として JPEG 圧縮
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          console.log(`Service: Image compressed from ${file.size} to ${dataUrl.length} characters`);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  },

  // 画像を Base64 に変換して返す（Storage を使わない方式）
  async uploadImages(userId: string, files: File[]): Promise<string[]> {
    console.log(`Service: Processing ${files.length} images as Base64...`);
    
    try {
      const base64Promises = files.map(file => this.compressImage(file));
      const base64Strings = await Promise.all(base64Promises);
      console.log('Service: All images converted to Base64');
      return base64Strings;
    } catch (error) {
      console.error('Service: Image conversion failed:', error);
      throw new Error('画像の処理に失敗しました。');
    }
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
