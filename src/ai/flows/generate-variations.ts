'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating variations of a given product image from different angles.
 *
 * - generateVariations - A function that generates three variations of an image from different camera angles.
 * - GenerateVariationsInput - The input type for the generateVariations function.
 * - GenerateVariationsOutput - The return type for the generateVariations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVariationsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateVariationsInput = z.infer<typeof GenerateVariationsInputSchema>;

const GenerateVariationsOutputSchema = z.object({
    variations: z.array(z.string()).length(3).describe('An array of exactly three distinct image data URIs, representing the product from different camera angles.'),
});
export type GenerateVariationsOutput = z.infer<typeof GenerateVariationsOutputSchema>;


export async function generateVariations(input: GenerateVariationsInput): Promise<GenerateVariationsOutput> {
    return generateVariationsFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateVariationsPrompt',
    input: {schema: GenerateVariationsInputSchema},
    prompt: `You are an expert product photographer. The user will provide a product photo. Generate three new images of the product from different camera angles (e.g., a top-down view, a side view, a 45-degree angle view). The product itself must remain the central focus and be unchanged. The background, lighting, and overall style should be consistent with the original photo.

Photo: {{media url=photoDataUri}}`,
});


const generateVariationsFlow = ai.defineFlow(
    {
        name: 'generateVariationsFlow',
        inputSchema: GenerateVariationsInputSchema,
        outputSchema: GenerateVariationsOutputSchema,
    },
    async (input) => {

        const anglePrompts = [
            'Generate a new image of the product from a top-down camera angle. Keep the background and style consistent.',
            'Generate a new image of the product from a straight-on side view. Keep the background and style consistent.',
            'Generate a new image of the product from a 45-degree angle view. Keep the background and style consistent.'
        ];

        const variationPromises = anglePrompts.map((promptText) => 
            ai.generate({
                model: 'googleai/gemini-2.5-flash-image-preview',
                prompt: [
                    {
                        media: {url: input.photoDataUri},
                    },
                    {text: promptText},
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
