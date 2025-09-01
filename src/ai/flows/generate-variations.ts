'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating variations of a given product image from different angles.
 *
 * - generateVariations - A function that generates new images of a product from a list of specified camera angles.
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
  angles: z.array(z.string()).min(1).describe('An array of angles to generate, e.g., ["top-down", "side-view", "45-degree"].'),
});
export type GenerateVariationsInput = z.infer<typeof GenerateVariationsInputSchema>;

const GenerateVariationsOutputSchema = z.object({
    variations: z.array(z.string()).describe('An array of image data URIs, representing the product from the requested camera angles.'),
});
export type GenerateVariationsOutput = z.infer<typeof GenerateVariationsOutputSchema>;


export async function generateVariations(input: GenerateVariationsInput): Promise<GenerateVariationsOutput> {
    return generateVariationsFlow(input);
}


const anglePrompts: Record<string, string> = {
    'top-down': 'Generate a new image of the product from a top-down camera angle. Keep the background and style consistent with the original.',
    'side-view': 'Generate a new image of the product from a straight-on side view. Keep the background and style consistent with the original.',
    '45-degree': 'Generate a new image of the product from a 45-degree angle view. Keep the background and style consistent with the original.'
};


const generateVariationsFlow = ai.defineFlow(
    {
        name: 'generateVariationsFlow',
        inputSchema: GenerateVariationsInputSchema,
        outputSchema: GenerateVariationsOutputSchema,
    },
    async (input) => {

        const selectedPrompts = input.angles.map(angle => {
            const prompt = anglePrompts[angle];
            if (!prompt) {
                throw new Error(`Invalid angle provided: ${angle}`);
            }
            return prompt;
        });

        const variationPromises = selectedPrompts.map((promptText) =>
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
