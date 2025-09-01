
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating a product photo based on a user-provided description or a selected template.
 *
 * - generateAITheme - A function that handles the generation of a product photo based on a user description.
 * - generateAIThemeFromTemplate - A function that generates a photo based on a predefined template.
 * - GenerateAIThemeInput - The input type for the generateAITheme function.
 * - GenerateAIThemeFromTemplateInput - The input type for the generateAIThemeFromTemplate function.
 * - GenerateAIThemeOutput - The return type for both generation functions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input for custom prompt-based generation
const GenerateAIThemeInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('The description of the desired product photo style and settings.'),
});
export type GenerateAIThemeInput = z.infer<typeof GenerateAIThemeInputSchema>;

// Input for template-based generation
const GenerateAIThemeFromTemplateInputSchema = z.object({
    photoDataUri: z.string().describe("A photo of a product, as a data URI."),
    template: z.string().describe("The user-selected template to guide the photoshoot (e.g., 'Minimalist', 'Luxury')."),
});
export type GenerateAIThemeFromTemplateInput = z.infer<typeof GenerateAIThemeFromTemplateInputSchema>;


const GenerateAIThemeOutputSchema = z.object({
  generatedPhotoDataUri: z.string().describe('The generated product photo as a data URI.'),
});
export type GenerateAIThemeOutput = z.infer<typeof GenerateAIThemeOutputSchema>;

// Exported function for custom prompts
export async function generateAITheme(input: GenerateAIThemeInput): Promise<GenerateAIThemeOutput> {
  return generateAIThemeFlow(input);
}

// Exported function for template-based generation
export async function generateAIThemeFromTemplate(input: GenerateAIThemeFromTemplateInput): Promise<GenerateAIThemeOutput> {
    return generateAIThemeFromTemplateFlow(input);
}

const templatePrompts: Record<string, string> = {
    'Minimalist': "A sleek, modern shot of the product on a clean, uncluttered surface with soft, diffused lighting, creating a sense of simplicity and focus.",
    'Luxury': "A dramatic close-up of the product on a polished obsidian surface, with a single, powerful spotlight from above, evoking deep shadows and a high-end, luxurious feel.",
    'Earthy': "The product nestled in a bed of lush, green moss and ferns, with warm, dappled sunlight filtering through a canopy of leaves, creating a natural, organic scene.",
    'Vibrant': "An energetic, playful shot of the product against a bold, single-color background, with harsh, direct light creating crisp shadows and making the colors pop.",
    'Surprise Me': "You are an award-winning, avant-garde product photographer. Generate a 1000% creative, unconventional, artistic, and visually stunning image of the product. The user's mind should be blown away. Think abstract, surreal, or completely unexpected. Do not use a plain background.",
};


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
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {generatedPhotoDataUri: media.url!};
  }
);


const generateAIThemeFromTemplateFlow = ai.defineFlow(
    {
        name: 'generateAIThemeFromTemplateFlow',
        inputSchema: GenerateAIThemeFromTemplateInputSchema,
        outputSchema: GenerateAIThemeOutputSchema,
    },
    async (input) => {
        const description = templatePrompts[input.template] || `A high-quality product photo of the item, in the style of ${input.template}.`;

        const {media} = await ai.generate({
            model: 'googleai/gemini-2.5-flash-image-preview',
            prompt: [
                {
                    media: {url: input.photoDataUri},
                },
                {text: description},
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
            },
        });

        return {generatedPhotoDataUri: media.url!};
    }
);

