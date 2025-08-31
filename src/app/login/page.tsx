'use client';

import { useRouter } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

// Google Icon SVG
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#fbc02d" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#e53935" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657	C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4caf50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.222,0-9.651-3.356-11.303-8H6.306C9.656,39.663,16.318,44,24,44z"/>
        <path fill="#1565c0" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C39.712,35.619,44,29.582,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);


export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!loading && user) {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);

    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // onAuthStateChanged in AuthContext will handle the redirect
            toast({
                title: 'Success',
                description: 'You have successfully signed in.',
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: 'Sign-in Failed',
                description: 'Could not sign in with Google. Please try again.',
                variant: 'destructive',
            });
        }
    };
    
    // AuthContext handles the loading state, so we don't need a separate loading UI here
    if (loading || user) {
        return null; // The AuthProvider shows a global loading indicator
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline">Welcome to PicPerfect</CardTitle>
                    <CardDescription>Sign in to start creating amazing product photos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGoogleSignIn} className="w-full text-lg py-6">
                        <GoogleIcon className="mr-2" />
                        Sign in with Google
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
