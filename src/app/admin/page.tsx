'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/context/AuthContext';
import withAuth from '@/components/with-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getAccessAndAdmins, addAccessEmail, removeAccessEmail, addAdmin, removeAdmin } from '../auth/actions';
import { User, X, Shield, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function AdminPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
    const [admins, setAdmins] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newAdmin, setNewAdmin] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    const PERMANENT_SUPER_ADMIN = 'anmol@suitable.ai';

    const fetchData = async () => {
        setIsLoading(true);
        if (!user) return;
        const idToken = await user.getIdToken();
        const result = await getAccessAndAdmins(idToken);
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            setAllowedEmails(result.allowedEmails || []);
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
            setNewEmail('');
            setNewAdmin('');
        });
    };

    const handleAddUser = () => handleAction(addAccessEmail, newEmail, 'User added successfully.');
    const handleRemoveUser = (email: string) => handleAction(removeAccessEmail, email, 'User removed successfully.');
    const handleAddAdmin = () => handleAction(addAdmin, newAdmin, 'Admin added successfully.');
    const handleRemoveAdmin = (email: string) => handleAction(removeAdmin, email, 'Admin privileges revoked.');
    
    const renderUserList = (title: string, list: string[], onRemove: (email: string) => void, isAdminList = false) => (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {isLoading ? (
                    Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                ) : list.length > 0 ? (
                    list.map((email) => (
                        <div key={email} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <span className="text-sm">{email}</span>
                            {email !== PERMANENT_SUPER_ADMIN && (
                                <Button size="icon" variant="ghost" onClick={() => onRemove(email)} disabled={isPending}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No users in this list.</p>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Admin Panel</CardTitle>
                    <CardDescription>Manage user access and administrative roles.</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add New User</CardTitle>
                            <CardDescription>Grant access to a new user by adding their email.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                            <Input placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                            <Button onClick={handleAddUser} disabled={isPending || !newEmail}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add User
                            </Button>
                        </CardContent>
                    </Card>
                     {renderUserList('Authorized Users', allowedEmails, handleRemoveUser)}
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add New Admin</CardTitle>
                            <CardDescription>Promote a user to an admin role.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                            <Input placeholder="admin@example.com" value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} />
                            <Button onClick={handleAddAdmin} disabled={isPending || !newAdmin}>
                                <Shield className="mr-2 h-4 w-4" /> Add Admin
                            </Button>
                        </CardContent>
                    </Card>
                    {renderUserList('Admins', admins, handleRemoveAdmin, true)}
                </div>
            </div>
        </div>
    );
}

export default withAuth(AdminPage, { adminOnly: true });
