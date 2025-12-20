import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { getConfig } from './config.js';

export interface CommitMessage {
  title: string;
  description: string;
}

export async function generateCommitMessage(diff: string, files: string[]): Promise<CommitMessage> {
  const config = getConfig();
  
  const openrouter = createOpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
  });

  const prompt = `You are an expert at writing git commit messages. Analyze the following git diff and generate a commit message.

Rules:
- The title should be concise (max ${config.maxLength} characters), in imperative mood
- Use conventional commits format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- The description should explain WHY the change was made (2-4 sentences)
- Language: ${config.locale === 'en' ? 'English' : config.locale}

Changed files:
${files.join('\n')}

Git diff:
${diff.slice(0, 8000)}

Respond ONLY in this exact JSON format, nothing else:
{"title": "type(scope): short description", "description": "Detailed explanation of the changes"}`;

  const { text } = await generateText({
    model: openrouter(config.model),
    prompt,
    maxOutputTokens: 500,
  });

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title || 'chore: update',
      description: parsed.description || '',
    };
  } catch {
    const lines = text.split('\n').filter(Boolean);
    return {
      title: lines[0]?.slice(0, config.maxLength) || 'chore: update',
      description: lines.slice(1).join('\n') || '',
    };
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

