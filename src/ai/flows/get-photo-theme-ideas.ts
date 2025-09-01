
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating creative photoshoot ideas for a given product image, guided by a user-selected template.
 *
 * THIS FILE IS NO LONGER USED and will be removed in a future update.
 * The functionality has been consolidated into generate-ai-theme.ts.
 *
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetPhotoThemeIdeasInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  template: z.string().describe("The user-selected template to guide the photoshoot ideas (e.g., 'Minimalist', 'Luxury', 'Surprise Me')."),
});
export type GetPhotoThemeIdeasInput = z.infer<typeof GetPhotoThemeIdeasInputSchema>;

const IdeaSchema = z.object({
    shortPhrase: z.string().describe("A short, user-friendly phrase (3-5 words) summarizing the theme. This will be shown to the user."),
    detailedPrompt: z.string().describe("A detailed, single-sentence prompt for the image generation model, encapsulating the scene, lighting, and mood."),
});

const GetPhotoThemeIdeasOutputSchema = z.object({
  ideas: z.array(IdeaSchema).length(3).describe('An array of exactly three distinct photoshoot ideas, each with a short phrase and a detailed prompt.'),
});
export type GetPhotoThemeIdeasOutput = z.infer<typeof GetPhotoThemeIdeasOutputSchema>;


export async function getPhotoThemeIdeas(input: GetPhotoThemeIdeasInput): Promise<GetPhotoThemeIdeasOutput> {
    return getPhotoThemeIdeasFlow(input);
}


const prompt = ai.definePrompt({
    name: 'getPhotoThemeIdeasPrompt',
    input: {schema: GetPhotoThemeIdeasInputSchema},
    output: {schema: GetPhotoThemeIdeasOutputSchema},
    prompt: `You are a professional product photographer and creative director. The user has provided a product photo and selected a style template: "{{template}}".

Based on the product and the chosen template, generate THREE creative and distinct product photography ideas.

If the template is "Surprise Me", you must be 1000% creative. The ideas should be unconventional, artistic, and visually stunning. The user's mind should be blown away. Think abstract, surreal, or completely unexpected.

For each of the three ideas, provide two things:
1.  A short, user-friendly phrase (3-5 words) that summarizes the theme (e.g., "Sleek & Modern," "Outdoor Adventure," "Floating in Space"). This phrase must give the user a clear idea of the visual style.
2.  A detailed, single-sentence prompt that can be fed directly into an image generation model. This prompt must encapsulate the scene, lighting, and mood (e.g., "A close-up of the product on a polished obsidian surface, with a single, dramatic spotlight from above, creating a sense of deep shadows and luxury.").

Generate three such ideas, each with a shortPhrase and a detailedPrompt, that are all strongly aligned with the "{{template}}" theme.

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

    
