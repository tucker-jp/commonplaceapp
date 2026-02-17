import { openai, MODELS, TEMPERATURES } from "@/lib/openai";

const CATEGORIZATION_PROMPT = `You are a folder categorization assistant.
Your only job is to quickly determine which folder a note belongs to.

Available folders: {FOLDERS}

Respond with ONLY the exact folder name that best matches the content.
If uncertain, use "other".`;

export async function categorizeNote(
  text: string,
  folders: string[]
): Promise<string> {
  if (folders.length === 0) {
    return "other";
  }

  if (folders.length === 1) {
    return folders[0];
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.CATEGORIZATION,
      messages: [
        {
          role: "system",
          content: CATEGORIZATION_PROMPT.replace("{FOLDERS}", folders.join(", ")),
        },
        {
          role: "user",
          content: `Categorize this note: ${text}`,
        },
      ],
      temperature: TEMPERATURES.CATEGORIZATION,
      max_tokens: 20,
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();

    // Validate the result is an actual folder
    const matchedFolder = folders.find(
      (f) => f.toLowerCase() === result
    );

    return matchedFolder || "other";
  } catch (error) {
    console.error("Categorization error:", error);
    return "other";
  }
}
