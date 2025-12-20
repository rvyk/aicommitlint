import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { getConfig } from "./config.js";

export interface CommitMessage {
  title: string;
  description: string;
}

export async function generateCommitMessage(
  diff: string,
  files: string[]
): Promise<CommitMessage> {
  const config = getConfig();

  const openrouter = createOpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
  });

  const prompt = `You are an expert at writing git commit messages. Analyze the following git diff and generate a commit message.

Rules:
- The title should be concise (max ${
    config.maxLength
  } characters), in imperative mood
- Use conventional commits format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- The description MUST be a bullet list with dashes (-)
- Each bullet point should describe one specific change
- Include as many bullet points as needed to cover all changes
- Language: ${config.locale === "en" ? "English" : config.locale}

Changed files:
${files.join("\n")}

Git diff:
${diff.slice(0, 8000)}

Respond ONLY in this exact JSON format, nothing else:
{"title": "type(scope): short description", "description": "- First change\\n- Second change\\n- Third change"}`;

  const { text } = await generateText({
    model: openrouter(config.model),
    prompt,
    maxOutputTokens: 1000,
  });

  if (!text || text.trim().length === 0) {
    throw new ModelError(config.model);
  }

  try {
    let cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    if (!parsed.title) {
      throw new ModelError(config.model);
    }

    return {
      title: parsed.title,
      description: parsed.description || "",
    };
  } catch (err) {
    if (err instanceof ModelError) {
      throw err;
    }

    const lines = text.split("\n").filter(Boolean);
    const titleLine = lines.find(
      (l) => !l.startsWith("-") && !l.startsWith("{") && !l.startsWith("```")
    );
    const bulletLines = lines.filter((l) => l.trim().startsWith("-"));

    if (!titleLine && bulletLines.length === 0) {
      throw new ModelError(config.model);
    }

    return {
      title: titleLine?.slice(0, config.maxLength) || "chore: update",
      description: bulletLines.join("\n") || "",
    };
  }
}

export class ModelError extends Error {
  constructor(model: string) {
    super(
      `Model "${model}" returned invalid response. Try changing model with: aicommitlint model`
    );
    this.name = "ModelError";
  }
}

export async function testConnection(): Promise<boolean> {
  const config = getConfig();

  const openrouter = createOpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
  });

  try {
    await generateText({
      model: openrouter(config.model),
      prompt: 'Say "ok"',
      maxOutputTokens: 10,
    });
    return true;
  } catch {
    return false;
  }
}
