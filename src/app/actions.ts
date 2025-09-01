
'use server';

import { generateAITheme, GenerateAIThemeInput } from '@/ai/flows/generate-ai-theme';
import { getPhotoThemeIdeas } from '@/ai/flows/get-photo-theme-ideas';
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
        const userDoc = await userDocRef.get();
        const userData = userDoc.data();

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const lastGenerationDate = userData?.lastGenerationDate || null;
        let dailyCount = userData?.dailyGenerationsCount || 0;

        if (lastGenerationDate !== today) {
            // It's a new day, reset the counter
            dailyCount = 0;
            await userDocRef.update({
                lastGenerationDate: today,
                dailyGenerationsCount: 1, // Start with 1 for the current generation
            });
            return true; // Allow generation
        }
        
        if (dailyCount >= 10) {
            // Limit reached
            return false;
        }
        
        // Increment the count for today
        await userDocRef.update({ dailyGenerationsCount: FieldValue.increment(1) });
        return true;

    } catch (error) {
        console.error('Error in checkAndIncrementGenerationCount:', error);
        // Default to denying if there's an error to be safe
        return false;
    }
}


const ideaActionSchema = z.object({
  idToken: z.string(),
  originalImage: z.string().startsWith('data:image', { message: 'Invalid image format. Please provide a data URI.' }),
});

export async function handleGetImageIdeas(idToken: string, originalImage: string) {
   try {
    const validatedArgs = ideaActionSchema.parse({ idToken, originalImage });
    
    const user = await getAuthenticatedUser(validatedArgs.idToken);
    if (!user) {
      return { error: 'Authentication failed. Please sign in again.' };
    }

    const canGenerate = await checkAndIncrementGenerationCount(user.uid);
    if (!canGenerate) {
      return { error: 'You have reached your daily generation limit of 10 runs.' };
    }
    
    const ideasResult = await getPhotoThemeIdeas({
      photoDataUri: validatedArgs.originalImage,
    });
    
    if (!ideasResult.ideas || ideasResult.ideas.length !== 3) {
      throw new Error('Could not generate creative ideas.');
    }

    return { ideas: ideasResult.ideas };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleGetImageIdeas:', error);
    return { error: errorMessage };
  }
}

const generateFromIdeaSchema = z.object({
    idToken: z.string(),
    originalImage: z.string().startsWith('data:image'),
    idea: z.string().min(1),
});

export async function handleGenerateImageFromIdea(idToken: string, originalImage: string, idea: string) {
    try {
        const validatedArgs = generateFromIdeaSchema.parse({ idToken, originalImage, idea });
        
        const user = await getAuthenticatedUser(validatedArgs.idToken);
        if (!user) {
            return { error: 'Authentication failed. Please sign in again.' };
        }
        
        // Note: We don't check the limit here again, assuming it was checked when ideas were generated.
        // If this action could be called independently, a check would be needed here too.

        const result = await generateAITheme({
            photoDataUri: validatedArgs.originalImage,
            description: validatedArgs.idea,
        });
        
        return { generatedPhotoDataUri: result.generatedPhotoDataUri };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error('Error in handleGenerateImageFromIdea:', error);
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

    const canGenerate = await checkAndIncrementGenerationCount(user.uid);
    if (!canGenerate) {
        return { error: 'You have reached your daily generation limit of 10 runs.' };
    }
    
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
});


export async function handleGenerateVariations(idToken: string, imageToVary: string) {
  try {
    const validatedArgs = variationsActionSchema.parse({ idToken, imageToVary });
    
    const user = await getAuthenticatedUser(validatedArgs.idToken);
    if (!user) {
        return { error: 'Authentication failed. Please sign in again.' };
    }
    
    const canGenerate = await checkAndIncrementGenerationCount(user.uid);
    if (!canGenerate) {
        return { error: 'You have reached your daily generation limit of 10 runs.' };
    }

    const result = await generateVariations({
      photoDataUri: validatedArgs.imageToVary,
    });
    
    return { generatedImages: result.variations };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleGenerateVariations:', error);
    return { error: errorMessage };
  }
}
