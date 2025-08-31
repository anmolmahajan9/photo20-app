'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating variations of a given product image.
 *
 * - generateVariations - A function that generates three variations of an image.
 * - GenerateVariationsInput - The input type for the generateVariations function.
 * - GenerateVariationsOutput - The return type for the generateVariations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateVariationsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateVariationsInput = z.infer<typeof GenerateVariationsInputSchema>;

export const GenerateVariationsOutputSchema = z.object({
    variations: z.array(z.string()).length(3).describe('An array of exactly three distinct image data URIs, representing variations of the input image.'),
});
export type GenerateVariationsOutput = z.infer<typeof GenerateVariationsOutputSchema>;


export async function generateVariations(input: GenerateVariationsInput): Promise<GenerateVariationsOutput> {
    return generateVariationsFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateVariationsPrompt',
    input: {schema: GenerateVariationsInputSchema},
    prompt: `You are an expert product photographer. The user will provide a product photo. Generate three subtle variations of this photo. The variations should maintain the same overall theme, style, and composition, but introduce minor changes in lighting, angle, or prop placement to offer slightly different perspectives. The product itself must remain the central focus and be unchanged.

Photo: {{media url=photoDataUri}}`,
});


const generateVariationsFlow = ai.defineFlow(
    {
        name: 'generateVariationsFlow',
        inputSchema: GenerateVariationsInputSchema,
        outputSchema: GenerateVariationsOutputSchema,
    },
    async (input) => {

        const variationPromises = Array(3).fill(null).map(() => 
            ai.generate({
                model: 'googleai/gemini-2.5-flash-image-preview',
                prompt: [
                    {
                        media: {url: input.photoDataUri},
                    },
                    {text: 'Generate a subtle variation of this product photo. Maintain the same overall theme, style, and composition, but introduce a minor change in lighting, camera angle, or prop placement. The product itself must remain unchanged.'},
                ],
                config: {
                    responseModalities: ['TEXT', 'IMAGE'],
                },
            })
        );
        
        const results = await Promise.all(variationPromises);
        const variations = results.map(result => result.media.url!);

        return { variations };
    }
)
