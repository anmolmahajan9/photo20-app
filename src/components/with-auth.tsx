// src/components/with-auth.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: { adminOnly?: boolean } = {}
) => {
  const AuthComponent = (props: P) => {
    const { user, isAuthorized, isSuperAdmin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.replace('/login');
        } else if (options.adminOnly && !isSuperAdmin) {
          router.replace('/dashboard'); // or a dedicated unauthorized page
        } else if (!isAuthorized) {
            router.replace('/unauthorized');
        }
      }
    }, [user, isAuthorized, isSuperAdmin, loading, router, options.adminOnly]);

    if (loading || !user || !isAuthorized || (options.adminOnly && !isSuperAdmin)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
  AuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return AuthComponent;
};

export default withAuth;
