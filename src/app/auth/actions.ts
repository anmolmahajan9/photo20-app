// src/app/auth/actions.ts
'use server';
import admin from '@/lib/firebaseAdmin';
import { z } from 'zod';

const PERMANENT_SUPER_ADMIN = 'anmolmahajan9@gmail.com';

async function verifyToken(idToken: string) {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return { uid: decodedToken.uid, email: decodedToken.email };
    } catch (error) {
        console.error("Error verifying ID token:", error);
        return null;
    }
}

const TokenSchema = z.string().min(1, { message: "ID token cannot be empty." });

// Any logged-in user is now considered "authorized" to use the app.
export async function verifyUserAccess(idToken: string): Promise<{ isAuthorized?: boolean; error?: string }> {
    const validation = TokenSchema.safeParse(idToken);
    if (!validation.success) {
        return { error: 'Invalid ID token provided.' };
    }
    
    const decoded = await verifyToken(idToken);
    if (!decoded || !decoded.email) {
        return { isAuthorized: false, error: 'Invalid or expired session. Please sign in again.' };
    }

    // If a user has a valid token, they are authorized.
    return { isAuthorized: true };
}

export async function verifyAdminAccess(idToken: string): Promise<{ isSuperAdmin?: boolean; error?: string }> {
    const validation = TokenSchema.safeParse(idToken);
    if (!validation.success) {
        return { error: 'Invalid ID token provided.' };
    }

    const decoded = await verifyToken(idToken);
    if (!decoded || !decoded.email) {
        return { error: 'Invalid or expired session. Please sign in again.' };
    }
    
    if (decoded.email === PERMANENT_SUPER_ADMIN) {
        return { isSuperAdmin: true };
    }

    try {
        const adminDoc = await admin.firestore().doc('config/admins').get();
        if (adminDoc.exists) {
            const adminEmails = adminDoc.data()?.admins || [];
            if (adminEmails.includes(decoded.email)) {
                return { isSuperAdmin: true };
            }
        }
        return { isSuperAdmin: false };
    } catch (error: any) {
        console.error("Error checking admin access in Firestore:", error);
        return { error: 'Could not verify admin access.' };
    }
}


// --- Management Functions (for admin page) ---

export async function getAccessAndAdmins(adminIdToken: string) {
    const adminCheck = await verifyAdminAccess(adminIdToken);
    if (!adminCheck.isSuperAdmin) {
        return { error: "Unauthorized: You do not have admin privileges." };
    }

    try {
        const [usersSnapshot, adminDoc] = await Promise.all([
            admin.firestore().collection('users').orderBy('lastLogin', 'desc').get(),
            admin.firestore().doc('config/admins').get()
        ]);
        
        const allUsers = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: data.uid,
                email: data.email,
                displayName: data.displayName,
                // Convert Firestore Timestamp to a serializable format (ISO string)
                lastLogin: data.lastLogin?.toDate?.().toISOString() || null,
            };
        });
        
        const admins = adminDoc.exists ? adminDoc.data()?.admins || [] : [];
        
        return { allUsers, admins };
    } catch (error) {
        console.error("Error fetching users and admins:", error);
        return { error: "Failed to fetch user and admin lists." };
    }
}

const EmailSchema = z.string().email({ message: "Invalid email address." });

export async function addAdmin(adminIdToken: string, emailToAdd: string) {
    const adminCheck = await verifyAdminAccess(adminIdToken);
    if (!adminCheck.isSuperAdmin) {
        return { error: "Unauthorized" };
    }

    const emailValidation = EmailSchema.safeParse(emailToAdd);
    if(!emailValidation.success) {
        return { error: 'Invalid email format.' };
    }

    try {
        await admin.firestore().doc('config/admins').set({
            admins: admin.firestore.FieldValue.arrayUnion(emailToAdd)
        }, { merge: true });
        return { success: true };
    } catch (error) {
        return { error: "Failed to add admin." };
    }
}

export async function removeAdmin(adminIdToken: string, emailToRemove: string) {
    const adminCheck = await verifyAdminAccess(adminIdToken);
    if (!adminCheck.isSuperAdmin) {
        return { error: "Unauthorized" };
    }
    
    const emailValidation = EmailSchema.safeParse(emailToRemove);
    if(!emailValidation.success) {
        return { error: 'Invalid email format.' };
    }

    if (emailToRemove === PERMANENT_SUPER_ADMIN) {
        return { error: "This super admin cannot be removed." };
    }

    try {
        await admin.firestore().doc('config/admins').update({
            admins: admin.firestore.FieldValue.arrayRemove(emailToRemove)
        });
        return { success: true };
    } catch (error) {
        return { error: "Failed to remove admin." };
    }
}
