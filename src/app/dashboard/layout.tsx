'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebaseClient';
import { LogOut, User, Shield, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isSuperAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await auth.signOut();
    sessionStorage.clear(); // Clear session cache on sign out
    router.push('/login');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Generator', icon: ImageIcon },
    ...(isSuperAdmin ? [{ href: '/admin', label: 'Admin Panel', icon: Shield }] : []),
  ];

  const currentTab = navLinks.find(link => pathname.startsWith(link.href))?.href ?? '/dashboard';

  return (
    <div className="min-h-screen bg-background text-foreground w-full">
      <header className="py-4 px-4 md:px-8 border-b border-border">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-headline font-bold text-primary">Photo20</h1>
            <p className="text-muted-foreground text-sm mt-1 hidden md:block">Welcome, {user?.displayName || user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
       <main className="container mx-auto p-4 md:p-8">
        <Tabs value={currentTab} onValueChange={(value) => router.push(value)} className="w-full mb-6">
            <TabsList>
                {navLinks.map(link => (
                    <TabsTrigger key={link.href} value={link.href}>
                        <link.icon className="mr-2 h-4 w-4" />
                        {link.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
        <div className="flex-1">
          {children}
        </div>
       </main>
    </div>
  );
}
