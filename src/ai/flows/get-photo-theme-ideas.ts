
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
  ideas: z.array(z.string()).length(3).describe('An array of exactly three distinct and detailed photoshoot prompts, ready for an image generation model.'),
});
export type GetPhotoThemeIdeasOutput = z.infer<typeof GetPhotoThemeIdeasOutputSchema>;


export async function getPhotoThemeIdeas(input: GetPhotoThemeIdeasInput): Promise<GetPhotoThemeIdeasOutput> {
    return getPhotoThemeIdeasFlow(input);
}


const prompt = ai.definePrompt({
    name: 'getPhotoThemeIdeasPrompt',
    input: {schema: GetPhotoThemeIdeasInputSchema},
    output: {schema: GetPhotoThemeIdeasOutputSchema},
    prompt: `You are a professional product photographer and creative director. I will provide you with a product photo. Based on the product’s appearance, design, and likely target audience, generate three creative product photography ideas that a seller could use to promote this item.

For each of the three ideas, provide a concise, single-sentence prompt that can be fed directly into an image generation model. This prompt should encapsulate the scene, lighting, and mood.

For example, if the idea is for a watch on a wooden table, the prompt might be: "A close-up of the product on a rustic wooden surface, with soft, natural light filtering in from a nearby window, creating a warm and inviting atmosphere."

Based on the photo provided, generate three such prompts.

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
