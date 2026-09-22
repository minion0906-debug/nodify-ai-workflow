"use server";

import { generateNodeDescription } from "@/ai/flows/generate-node-description";
import { z } from "zod";

const GenerateDescriptionSchema = z.object({
  nodeType: z.string(),
  nodeConfig: z.string(),
});

type State = {
  description?: string;
  error?: string;
};

export async function generateDescriptionAction(
  prevState: State,
  formData: FormData
): Promise<State> {
  try {
    const validatedFields = GenerateDescriptionSchema.safeParse({
      nodeType: formData.get("nodeType"),
      nodeConfig: formData.get("nodeConfig"),
    });

    if (!validatedFields.success) {
      return { error: "Invalid input." };
    }

    const result = await generateNodeDescription(validatedFields.data);

    if (result.description) {
      return { description: result.description };
    } else {
      return { error: "Failed to generate description." };
    }
  } catch (e) {
    console.error(e);
    return { error: "An unexpected error occurred." };
  }
}
