// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { verifyAdminAccess } from '@/app/auth/actions';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: User | null;
  isAuthorized: boolean | null; 
  isSuperAdmin: boolean | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        // Store user data in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            lastLogin: serverTimestamp(),
        }, { merge: true });
        
        setUser(firebaseUser);
        const cachedAuth = sessionStorage.getItem(`auth_${firebaseUser.uid}`);
        
        if (cachedAuth) {
            const { superAdmin } = JSON.parse(cachedAuth);
            setIsSuperAdmin(superAdmin);
            setLoading(false);
        } else {
            try {
                const idToken = await firebaseUser.getIdToken();
                const adminResult = await verifyAdminAccess(idToken);

                if (adminResult.error) {
                    setError(adminResult.error);
                    setIsSuperAdmin(false);
                } else {
                    const superAdmin = adminResult.isSuperAdmin ?? false;
                    setIsSuperAdmin(superAdmin);
                    sessionStorage.setItem(`auth_${firebaseUser.uid}`, JSON.stringify({ superAdmin }));
                }
            } catch (e: any) {
                setError(e.message);
                setIsSuperAdmin(false);
            }
        }
      } else {
        setUser(null);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const isAuthorized = !!user;

  const value = { user, isAuthorized, isSuperAdmin, loading, error };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
          <div className="p-8 space-y-4 rounded-lg">
            <h1 className="text-2xl font-bold">Loading...</h1>
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
