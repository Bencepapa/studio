'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate instructions and links
 * for importing dependencies (scripts, images, sounds) required by a visual effect.
 *
 * - generateDependencyInstructions -  A function that takes in the code of the effect, analyzes it and returns
 *   instructions on how to import dependencies into a project.
 * - GenerateDependencyInstructionsInput - The input type for the generateDependencyInstructions function.
 * - GenerateDependencyInstructionsOutput - The return type for the generateDependencyInstructions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDependencyInstructionsInputSchema = z.object({
  effectCode: z
    .string()
    .describe("The JavaScript code of the visual effect to analyze for dependencies."),
});
export type GenerateDependencyInstructionsInput = z.infer<typeof GenerateDependencyInstructionsInputSchema>;

const GenerateDependencyInstructionsOutputSchema = z.object({
  instructions: z
    .string()
    .describe("Instructions for including the required dependencies."),
});
export type GenerateDependencyInstructionsOutput = z.infer<typeof GenerateDependencyInstructionsOutputSchema>;

export async function generateDependencyInstructions(
  input: GenerateDependencyInstructionsInput
): Promise<GenerateDependencyInstructionsOutput> {
  return generateDependencyInstructionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDependencyInstructionsPrompt',
  input: {schema: GenerateDependencyInstructionsInputSchema},
  output: {schema: GenerateDependencyInstructionsOutputSchema},
  prompt: `You are an expert javascript developer and dependency manager.

  Given the following javascript code for a visual effect, analyze it and generate clear and concise instructions for a developer on how to include all required dependencies (such as utility scripts, images, and sound files) in their project.

  Code: {{{effectCode}}}

  Focus on providing specific file paths or URLS to download the files from, or if they are part of a library, provide instructions to import from the appropriate library with npm or yarn.
  If you have determined that there are no dependencies, return a message stating that there are no dependencies.
  `,
});

const generateDependencyInstructionsFlow = ai.defineFlow(
  {
    name: 'generateDependencyInstructionsFlow',
    inputSchema: GenerateDependencyInstructionsInputSchema,
    outputSchema: GenerateDependencyInstructionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
