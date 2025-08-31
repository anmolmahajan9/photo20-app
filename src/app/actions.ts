'use server';

import { generateAITheme } from '@/ai/flows/generate-ai-theme';
import { getPhotoThemeIdeas } from '@/ai/flows/get-photo-theme-ideas';
import { generateVariations } from '@/ai/flows/generate-variations';
import { z } from 'zod';
import { auth } from 'firebase-admin';
import admin from '@/lib/firebaseAdmin';

const generateActionSchema = z.object({
  originalImage: z.string().startsWith('data:image', { message: 'Invalid image format. Please provide a data URI.' }),
});

async function getCurrentUser() {
    // This is a placeholder for getting the current user's ID.
    // In a real app, you'd get this from the session or a verified token.
    // For this example, we'll assume a way to get the user's auth state server-side.
    // NOTE: This part of the logic requires a robust auth implementation to get the UID on the server.
    // Since we don't have the full request context here, we can't directly get the user.
    // A real implementation would use NextAuth.js, or pass the ID token from the client.
    // For now, this will fail silently if no user is available.
    try {
        // This is a simplified example. In a real app, you would pass the user's ID token from the client
        // and verify it here to get the UID securely.
        const user = auth().currentUser; // This will likely be null on the server without a session management solution
        return user;
    } catch (e) {
        return null;
    }
}


export async function handleGenerateImageIdeas(originalImage: string) {
   try {
    const validatedArgs = generateActionSchema.parse({ originalImage });
    
    // 1. Get the three theme ideas
    const ideasResult = await getPhotoThemeIdeas({
      photoDataUri: validatedArgs.originalImage,
    });
    
    if (!ideasResult.ideas || ideasResult.ideas.length !== 3) {
      throw new Error('Could not generate creative ideas.');
    }

    // 2. Generate an image for each idea in parallel
    const imagePromises = ideasResult.ideas.map(idea => 
      generateAITheme({
        photoDataUri: validatedArgs.originalImage,
        description: idea,
      })
    );
    
    const imageResults = await Promise.all(imagePromises);

    const generatedImages = imageResults.map(result => result.generatedPhotoDataUri);
    
    // This is a placeholder for getting the current user, as auth().currentUser is not reliable on serverless functions.
    // In a real app, you MUST pass the user's ID token from the client to this server action,
    // verify it, and then get the UID.
    // For now, we are skipping the user data update part as we cannot get the user object.


    return { generatedImages };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleGenerateImage:', error);
    return { error: errorMessage };
  }
}


const refineActionSchema = z.object({
  originalImage: z.string().startsWith('data:image', { message: 'Invalid image format. Please provide a data URI.' }),
  prompt: z.string(),
});

export async function handleRefineImage(originalImage: string, prompt: string) {
  try {
    const validatedArgs = refineActionSchema.parse({ originalImage, prompt });
    
    const result = await generateAITheme({
      photoDataUri: validatedArgs.originalImage,
      description: validatedArgs.prompt,
    });
    
    // Similar to above, getting the user here is not straightforward.
    // We will skip the user data update for now.

    return { generatedPhotoDataUri: result.generatedPhotoDataUri };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleRefineImage:', error);
    return { error: errorMessage };
  }
}

const variationsActionSchema = z.object({
  imageToVary: z.string().startsWith('data:image', { message: 'Invalid image format. Please provide a data URI.' }),
});


export async function handleGenerateVariations(imageToVary: string) {
  try {
    const validatedArgs = variationsActionSchema.parse({ imageToVary });
    
    const result = await generateVariations({
      photoDataUri: validatedArgs.imageToVary,
    });
    
    // This is a placeholder for getting the current user, as auth().currentUser is not reliable on serverless functions.
    // In a real app, you MUST pass the user's ID token from the client to this server action,
    // verify it, and then get the UID.
    // For now, we are skipping the user data update part as we cannot get the user object.


    return { generatedImages: result.variations };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleGenerateVariations:', error);
    return { error: errorMessage };
  }
}
