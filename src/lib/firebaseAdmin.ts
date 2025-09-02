{// src/lib/firebaseAdmin.ts
import 'dotenv/config';
import * as admin from 'firebase-admin';
import { firebaseConfig } from '@/lib/firebase';

const serviceAccount: admin.ServiceAccount = {
  projectId: firebaseConfig.projectId,
  clientEmail: `firebase-adminsdk-v29w2@${firebaseConfig.projectId}.iam.gserviceaccount.com`,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

export default admin;
