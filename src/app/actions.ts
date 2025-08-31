'use server';

import { generateAITheme } from '@/ai/flows/generate-ai-theme';
import { z } from 'zod';

const actionSchema = z.object({
  originalImage: z.string().startsWith('data:image', { message: 'Invalid image format. Please provide a data URI.' }),
  prompt: z.string(),
});

export async function handleGenerateImage(originalImage: string, prompt: string) {
  try {
    const validatedArgs = actionSchema.parse({ originalImage, prompt });
    
    const result = await generateAITheme({
      photoDataUri: validatedArgs.originalImage,
      description: validatedArgs.prompt,
    });
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
    console.error('Error in handleGenerateImage:', error);
    return { error: errorMessage };
  }
}
