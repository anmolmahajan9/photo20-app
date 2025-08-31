// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { verifyUserAccess, verifyAdminAccess } from '@/app/auth/actions';
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
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        setUser(firebaseUser);
        const cachedAuth = sessionStorage.getItem(`auth_${firebaseUser.uid}`);
        if (cachedAuth) {
            const { authorized, superAdmin } = JSON.parse(cachedAuth);
            setIsAuthorized(authorized);
            setIsSuperAdmin(superAdmin);
            setLoading(false);
        } else {
            try {
                const idToken = await firebaseUser.getIdToken();
                const [authResult, adminResult] = await Promise.all([
                    verifyUserAccess(idToken),
                    verifyAdminAccess(idToken),
                ]);

                if (authResult.error || adminResult.error) {
                    setError(authResult.error || adminResult.error || 'Verification failed');
                    setIsAuthorized(false);
                    setIsSuperAdmin(false);
                } else {
                    setIsAuthorized(authResult.isAuthorized ?? false);
                    setIsSuperAdmin(adminResult.isSuperAdmin ?? false);
                    sessionStorage.setItem(`auth_${firebaseUser.uid}`, JSON.stringify({ authorized: authResult.isAuthorized, superAdmin: adminResult.isSuperAdmin }));
                }
            } catch (e: any) {
                setError(e.message);
                setIsAuthorized(false);
                setIsSuperAdmin(false);
            }
        }
      } else {
        setUser(null);
        setIsAuthorized(false);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
