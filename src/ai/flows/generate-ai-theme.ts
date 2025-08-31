'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating a product photo based on a user-provided description.
 *
 * - generateAITheme - A function that handles the generation of a product photo based on a user description.
 * - GenerateAIThemeInput - The input type for the generateAITheme function.
 * - GenerateAIThemeOutput - The return type for the generateAITheme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GenerateAIThemeInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('The description of the desired product photo style and settings.'),
});
export type GenerateAIThemeInput = z.infer<typeof GenerateAIThemeInputSchema>;

const GenerateAIThemeOutputSchema = z.object({
  generatedPhotoDataUri: z.string().describe('The generated product photo as a data URI.'),
});
export type GenerateAIThemeOutput = z.infer<typeof GenerateAIThemeOutputSchema>;

export async function generateAITheme(input: GenerateAIThemeInput): Promise<GenerateAIThemeOutput> {
  return generateAIThemeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAIThemePrompt',
  input: {schema: GenerateAIThemeInputSchema},
  output: {schema: GenerateAIThemeOutputSchema},
  prompt: `You are an expert product photographer. The user will provide a product photo and a description of how they want the photo to be styled. Generate a new photo according to the style and settings in the description.

Description: {{{description}}}
Photo: {{media url=photoDataUri}}`,
});

const generateAIThemeFlow = ai.defineFlow(
  {
    name: 'generateAIThemeFlow',
    inputSchema: GenerateAIThemeInputSchema,
    outputSchema: GenerateAIThemeOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        {
          media: {url: input.photoDataUri},
        },
        {text: input.description},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
      },
    });

    return {generatedPhotoDataUri: media.url!};
  }
);
