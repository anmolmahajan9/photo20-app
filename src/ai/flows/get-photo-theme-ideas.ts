'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating creative photoshoot ideas for a given product image.
 *
 * - getPhotoThemeIdeas - A function that generates three distinct photoshoot theme ideas.
 * - GetPhotoThemeIdeasInput - The input type for the getPhotoThemeIdeas function.
 * - GetPhotoThemeIdeasOutput - The return type for the getPhotoThemeIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetPhotoThemeIdeasInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GetPhotoThemeIdeasInput = z.infer<typeof GetPhotoThemeIdeasInputSchema>;

const GetPhotoThemeIdeasOutputSchema = z.object({
  ideas: z.array(z.string()).length(3).describe('An array of exactly three distinct and detailed photoshoot prompts.'),
});
export type GetPhotoThemeIdeasOutput = z.infer<typeof GetPhotoThemeIdeasOutputSchema>;


export async function getPhotoThemeIdeas(input: GetPhotoThemeIdeasInput): Promise<GetPhotoThemeIdeasOutput> {
    return getPhotoThemeIdeasFlow(input);
}


const prompt = ai.definePrompt({
    name: 'getPhotoThemeIdeasPrompt',
    input: {schema: GetPhotoThemeIdeasInputSchema},
    output: {schema: GetPhotoThemeIdeasOutputSchema},
    prompt: `You are an expert creative director specializing in product photography.
    
Based on the provided product photo, generate three distinct, creative, and detailed photoshoot ideas. Each idea should be a complete prompt that can be used to generate a new image. Describe the lighting, background, props, and overall mood for each concept.

For example:
- "A professional studio product shot with clean, soft lighting, a neutral background, and a sharp focus on the product."
- "The product placed in a natural outdoor setting at golden hour, with beautiful natural light and a slightly blurred background."
- "A minimalist composition with the product as the single focal point, using a solid, light-colored background and simple geometric shadows."

Photo: {{media url=photoDataUri}}`,
});


const getPhotoThemeIdeasFlow = ai.defineFlow(
    {
        name: 'getPhotoThemeIdeasFlow',
        inputSchema: GetPhotoThemeIdeasInputSchema,
        outputSchema: GetPhotoThemeIdeasOutputSchema,
    },
    async (input) => {
        const {output} = await prompt(input);
        return output!;
    }
)
