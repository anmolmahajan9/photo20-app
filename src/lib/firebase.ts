// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: "photo20-xx189",
  appId: "1:1097066143064:web:87f461f28faff93013192d",
  storageBucket: "photo20-xx189.firebasestorage.app",
  apiKey: "AIzaSyB-m4y1_3a6-n7K_q4N5f6g7h8i9j0k1l2",
  authDomain: "photo20-xx189.firebaseapp.com",
  messagingSenderId: "1097066143064"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
