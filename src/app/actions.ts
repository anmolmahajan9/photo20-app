
'use server';

import { generateAITheme, generateAIThemeFromTemplate } from '@/ai/flows/generate-ai-theme';
import { generateVariations } from '@/ai/flows/generate-variations';
import { z } from 'zod';
import admin from '@/lib/firebaseAdmin';
import type { User } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';


async function getAuthenticatedUser(idToken: string): Promise<User | null> {
    if (!idToken) return null;
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken.replace('Bearer ', ''));
        const user = await admin.auth().getUser(decodedToken.uid);
        return user;
    } catch (error) {
        console.error('Error verifying token or getting user:', error);
        return null;
    }
}


async function checkAndIncrementGenerationCount(uid: string): Promise<boolean> {
    const userDocRef = admin.firestore().collection('users').doc(uid);

    try {
        await admin.firestore().runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            
            const userAuth = await admin.auth().getUser(uid);
            const userEmail = userAuth.email;

            const now = new Date();
            const today = now.toISOString().split('T')[0];

            let dailyCount = 0;
            let lastGenerationDate = null;

            // Set default data for a new user, or if fields are missing
            let userData = {
                lastGenerationDate: today,
                dailyGenerationsCount: 0,
            };

            if (userDoc.exists) {
                const existingData = userDoc.data();
                dailyCount = existingData?.dailyGenerationsCount || 0;
                lastGenerationDate = existingData?.lastGenerationDate || null;
                userData = { ...userData, ...existingData };
            }
            
            const limit = userEmail === 'anmolmahajan9@gmail.com' ? 100 : 10;
            const limitErrorMessage = `You have reached your daily generation limit of ${limit} runs.`;

            if (lastGenerationDate !== today) {
                // It's a new day, reset the counter
                transaction.set(userDocRef, {
                    lastGenerationDate: today,
                    dailyGenerationsCount: 1
                }, { merge: true });
            } else {
                if (dailyCount >= limit) {
                    throw new Error(limitErrorMessage);
                }
                // Increment the count for today
                transaction.update(userDocRef, { 
                    dailyGenerationsCount: FieldValue.increment(1) 
                });
            }
        });
        return true;
    } catch (error) {
        if ((error as any).code === 'NOT_FOUND') {
            // Document doesn't exist, create it and set count to 1
             const now = new Date();
             const today = now.toISOString().split('T')[0];
             await userDocRef.set({
                lastGenerationDate: today,
                dailyGenerationsCount: 1
             }, { merge: true });
             return true;
        }
        console.error('Error in checkAndIncrementGenerationCount:', error);
        // Re-throw the error to be caught by the calling action
        throw error;
    }
}


const templateActionSchema = z.object({
  idToken: z.string(),
  originalImage: z.string().startsWith('data:image', { message: 'Invalid image format. Please provide a data URI.' }),
  template: z.string().min(1, { message: 'A template must be selected.' }),
});

export async function handleGenerateFromTemplate(idToken: string, originalImage: string, template: string) {
   try {
    const validatedArgs = templateActionSchema.parse({ idToken, originalImage, template });
    
    const user = await getAuthenticatedUser(validatedArgs.idToken);
    if (!user) {
      return { error: 'Authentication failed. Please sign in again.' };
    }

    await checkAndIncrementGenerationCount(user.uid);
    
    const result = await generateAIThemeFromTemplate({
      photoDataUri: validatedArgs.originalImage,
      template: validatedArgs.template,
    });
    
    return { generatedPhotoDataUri: result.generatedPhotoDataUri };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleGenerateFromTemplate:', error);
    return { error: errorMessage };
  }
}


const refineActionSchema = z.object({
  idToken: z.string(),
  originalImage: z.string().startsWith('data:image', { message: 'Invalid image format. Please provide a data URI.' }),
  prompt: z.string(),
});

export async function handleRefineImage(idToken: string, originalImage: string, prompt: string) {
  try {
    const validatedArgs = refineActionSchema.parse({ idToken, originalImage, prompt });
    
    const user = await getAuthenticatedUser(validatedArgs.idToken);
    if (!user) {
        return { error: 'Authentication failed. Please sign in again.' };
    }

    await checkAndIncrementGenerationCount(user.uid);
    
    const result = await generateAITheme({
      photoDataUri: validatedArgs.originalImage,
      description: validatedArgs.prompt,
    });
    
    return { generatedPhotoDataUri: result.generatedPhotoDataUri };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleRefineImage:', error);
    return { error: errorMessage };
  }
}

const variationsActionSchema = z.object({
  idToken: z.string(),
  imageToVary: z.string().startsWith('data:image', { message: 'Invalid image format. Please provide a data URI.' }),
  angles: z.array(z.string()).min(1, 'Please select at least one angle.'),
});


export async function handleGenerateVariations(idToken: string, imageToVary: string, angles: string[]) {
  try {
    const validatedArgs = variationsActionSchema.parse({ idToken, imageToVary, angles });
    
    const user = await getAuthenticatedUser(validatedArgs.idToken);
    if (!user) {
        return { error: 'Authentication failed. Please sign in again.' };
    }
    
    await checkAndIncrementGenerationCount(user.uid);

    const result = await generateVariations({
      photoDataUri: validatedArgs.imageToVary,
      angles: validatedArgs.angles,
    });
    
    return { generatedImages: result.variations };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleGenerateVariations:', error);
    return { error: errorMessage };
  }
}
