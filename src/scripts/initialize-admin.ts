import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// .env から環境変数を読み込む
dotenv.config({ path: resolve(process.cwd(), '.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const adminEmail = 'admin@example.com';
const adminPassword = 'admin1234';
const adminName = '管理者';

async function initialize() {
  console.log('--- Initial Admin Setup ---');
  
  if (!firebaseConfig.apiKey) {
    console.error('API Key is missing. Check your .env file.');
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    console.log(`Creating user in Auth: ${adminEmail}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;

    console.log(`Creating user profile in Firestore: users/${user.uid}...`);
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      email: adminEmail,
      name: adminName,
      role: 'admin',
      createdAt: new Date().toISOString()
    });

    console.log('Successfully completed account setup.');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Notice: Admin already exists.');
    } else {
      console.error('Error during setup:', error.message);
    }
  }
  process.exit(0);
}

initialize();
