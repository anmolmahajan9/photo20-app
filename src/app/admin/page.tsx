'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/context/AuthContext';
import withAuth from '@/components/with-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getAccessAndAdmins, addAdmin, removeAdmin } from '../auth/actions';
import { User, X, Shield, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

type AppUser = {
    uid: string;
    email: string;
    displayName: string;
    lastLogin: string | null;
}

function AdminPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [admins, setAdmins] = useState<string[]>([]);
    const [newAdmin, setNewAdmin] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    const PERMANENT_SUPER_ADMIN = 'anmolmahajan9@gmail.com';

    const fetchData = async () => {
        setIsLoading(true);
        if (!user) return;
        const idToken = await user.getIdToken();
        const result = await getAccessAndAdmins(idToken);
        if (result.error) {
            toast({ title: 'Error fetching data', description: result.error, variant: 'destructive' });
            setAllUsers([]);
            setAdmins([]);
        } else {
            // Sort users by lastLogin date, most recent first
            const sortedUsers = (result.allUsers || []).sort((a, b) => {
                if (!a.lastLogin) return 1;
                if (!b.lastLogin) return -1;
                return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
            });
            setAllUsers(sortedUsers);
            setAdmins(result.admins || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleAction = (action: (token: string, email: string) => Promise<any>, email: string, successMessage: string) => {
        startTransition(async () => {
            if (!user) return;
            const idToken = await user.getIdToken();
            const result = await action(idToken, email);
            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: 'Success', description: successMessage });
                await fetchData();
            }
            setNewAdmin('');
        });
    };

    const handleAddAdmin = () => handleAction(addAdmin, newAdmin, 'Admin added successfully.');
    const handleRemoveAdmin = (email: string) => handleAction(removeAdmin, email, 'Admin privileges revoked.');
    
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Admin Panel</CardTitle>
                    <CardDescription>Manage administrators and view all platform users.</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Manage Admins</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input placeholder="admin@example.com" value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} />
                                <Button onClick={handleAddAdmin} disabled={isPending || !newAdmin}>
                                    <Shield className="mr-2 h-4 w-4" /> Add
                                </Button>
                            </div>
                             <div className="space-y-2">
                                <h4 className="font-medium">Current Admins</h4>
                                {isLoading ? (
                                    Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                                ) : admins.length > 0 ? (
                                    admins.map((email) => (
                                        <div key={email} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                            <span className="text-sm truncate">{email}</span>
                                            {email !== PERMANENT_SUPER_ADMIN && (
                                                <Button size="icon" variant="ghost" onClick={() => handleRemoveAdmin(email)} disabled={isPending}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No admins yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Users</CardTitle>
                            <CardDescription>A list of all users who have signed into the platform.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>User</TableHead>
                                       <TableHead className="text-right">Last Login</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-8 w-3/4" /></TableCell>
                                                <TableCell><Skeleton className="h-8 w-1/2 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                   ) : allUsers.length > 0 ? (
                                       allUsers.map(appUser => (
                                           <TableRow key={appUser.uid}>
                                               <TableCell>
                                                   <div className="font-medium">{appUser.displayName || 'N/A'}</div>
                                                   <div className="text-sm text-muted-foreground">{appUser.email}</div>
                                               </TableCell>
                                               <TableCell className="text-right">
                                                   {appUser.lastLogin ? formatDistanceToNow(new Date(appUser.lastLogin), { addSuffix: true }) : 'Never'}
                                               </TableCell>
                                           </TableRow>
                                       ))
                                   ) : (
                                       <TableRow>
                                           <TableCell colSpan={2} className="text-center">No users have signed in yet.</TableCell>
                                       </TableRow>
                                   )}
                               </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default withAuth(AdminPage, { adminOnly: true });