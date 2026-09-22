'use server';

/**
 * @fileOverview AI agent that generates node descriptions based on node configuration.
 *
 * - generateNodeDescription - A function that generates a node description.
 * - GenerateNodeDescriptionInput - The input type for the generateNodeDescription function.
 * - GenerateNodeDescriptionOutput - The return type for the generateNodeDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNodeDescriptionInputSchema = z.object({
  nodeType: z.string().describe('The type of the node (e.g., HTTP Request, Code, IF/Switch).'),
  nodeConfig: z.string().describe('A JSON string representing the configuration of the node.'),
});
export type GenerateNodeDescriptionInput = z.infer<typeof GenerateNodeDescriptionInputSchema>;

const GenerateNodeDescriptionOutputSchema = z.object({
  description: z.string().describe('A descriptive summary of the node based on its configuration.'),
});
export type GenerateNodeDescriptionOutput = z.infer<typeof GenerateNodeDescriptionOutputSchema>;

export async function generateNodeDescription(
  input: GenerateNodeDescriptionInput
): Promise<GenerateNodeDescriptionOutput> {
  return generateNodeDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNodeDescriptionPrompt',
  input: {schema: GenerateNodeDescriptionInputSchema},
  output: {schema: GenerateNodeDescriptionOutputSchema},
  prompt: `You are an AI assistant designed to generate descriptions for nodes in a visual workflow editor.

  Based on the node type and its configuration, create a concise and informative description that explains the node's purpose and functionality.

  Node Type: {{{nodeType}}}
  Node Configuration: {{{nodeConfig}}}

  Description:`,
});

const generateNodeDescriptionFlow = ai.defineFlow(
  {
    name: 'generateNodeDescriptionFlow',
    inputSchema: GenerateNodeDescriptionInputSchema,
    outputSchema: GenerateNodeDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
