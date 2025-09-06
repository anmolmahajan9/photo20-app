'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function UnauthorizedPage() {
    const router = useRouter();
    const { isAuthorized, loading } = useAuth();

    useEffect(() => {
        // If the user becomes authorized (e.g. via another tab), redirect them.
        if (!loading && isAuthorized) {
            router.replace('/dashboard');
        }
    }, [isAuthorized, loading, router]);


    const handleSignOut = async () => {
        await auth.signOut();
        router.push('/login');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-destructive">Access Denied</CardTitle>
                    <CardDescription>
                        Your account does not have permission to access this application.
                        This is unexpected since all users should now have access.
                        Please contact the administrator if you believe this is an error.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        You can sign out and try logging in again.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSignOut} className="w-full" variant="outline">Sign Out</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
