'use server';

import { generateAITheme } from '@/ai/flows/generate-ai-theme';
import { getPhotoThemeIdeas } from '@/ai/flows/get-photo-theme-ideas';
import { z } from 'zod';

const generateActionSchema = z.object({
  originalImage: z.string().startsWith('data:image', { message: 'Invalid image format. Please provide a data URI.' }),
});

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
    
    return { generatedPhotoDataUri: result.generatedPhotoDataUri };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleRefineImage:', error);
    return { error: errorMessage };
  }
}
