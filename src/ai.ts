import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { getConfig } from "./config.js";

export interface CommitMessage {
  title: string;
  description: string;
}

interface DiffAnalysis {
  addedLines: number;
  removedLines: number;
  modifiedFiles: string[];
  newFiles: string[];
  deletedFiles: string[];
  renamedFiles: string[];
  addedFunctions: string[];
  removedFunctions: string[];
  addedImports: string[];
  removedImports: string[];
  changedClasses: string[];
  configChanges: string[];
  summary: string;
}

function analyzeDiff(diff: string, files: string[]): DiffAnalysis {
  const lines = diff.split("\n");
  let addedLines = 0;
  let removedLines = 0;
  const addedFunctions: string[] = [];
  const removedFunctions: string[] = [];
  const addedImports: string[] = [];
  const removedImports: string[] = [];
  const changedClasses: string[] = [];
  const configChanges: string[] = [];

  const newFiles: string[] = [];
  const deletedFiles: string[] = [];
  const renamedFiles: string[] = [];
  const modifiedFiles: string[] = [];

  let currentFile = "";

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        currentFile = match[2];
      }
    }

    if (line.startsWith("new file mode")) {
      newFiles.push(currentFile);
    } else if (line.startsWith("deleted file mode")) {
      deletedFiles.push(currentFile);
    } else if (line.startsWith("rename from")) {
      const nextLine = lines[lines.indexOf(line) + 1];
      if (nextLine?.startsWith("rename to")) {
        renamedFiles.push(
          `${line.replace("rename from ", "")} → ${nextLine.replace(
            "rename to ",
            ""
          )}`
        );
      }
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      addedLines++;
      const content = line.slice(1).trim();

      if (
        content.match(
          /^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/
        )
      ) {
        const funcMatch = content.match(/function\s+(\w+)|const\s+(\w+)\s*=/);
        if (funcMatch) {
          addedFunctions.push(funcMatch[1] || funcMatch[2]);
        }
      }

      if (content.match(/^(export\s+)?class\s+\w+/)) {
        const classMatch = content.match(/class\s+(\w+)/);
        if (classMatch && !changedClasses.includes(classMatch[1])) {
          changedClasses.push(classMatch[1]);
        }
      }

      if (content.match(/^import\s+/)) {
        addedImports.push(content);
      }
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      removedLines++;
      const content = line.slice(1).trim();

      if (
        content.match(
          /^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/
        )
      ) {
        const funcMatch = content.match(/function\s+(\w+)|const\s+(\w+)\s*=/);
        if (funcMatch) {
          removedFunctions.push(funcMatch[1] || funcMatch[2]);
        }
      }

      if (content.match(/^import\s+/)) {
        removedImports.push(content);
      }
    }
  }

  for (const file of files) {
    if (!newFiles.includes(file) && !deletedFiles.includes(file)) {
      modifiedFiles.push(file);
    }

    if (file.match(/\.(json|ya?ml|toml|ini|env|config\.\w+)$/i)) {
      configChanges.push(file);
    }
  }

  const summaryParts: string[] = [];
  if (newFiles.length > 0) summaryParts.push(`${newFiles.length} new file(s)`);
  if (deletedFiles.length > 0)
    summaryParts.push(`${deletedFiles.length} deleted file(s)`);
  if (modifiedFiles.length > 0)
    summaryParts.push(`${modifiedFiles.length} modified file(s)`);
  if (addedFunctions.length > 0)
    summaryParts.push(`${addedFunctions.length} new function(s)`);
  if (removedFunctions.length > 0)
    summaryParts.push(`${removedFunctions.length} removed function(s)`);
  summaryParts.push(`+${addedLines}/-${removedLines} lines`);

  return {
    addedLines,
    removedLines,
    modifiedFiles,
    newFiles,
    deletedFiles,
    renamedFiles,
    addedFunctions,
    removedFunctions,
    addedImports,
    removedImports,
    changedClasses,
    configChanges,
    summary: summaryParts.join(", "),
  };
}

function truncateDiffSmart(diff: string, maxLength: number = 15000): string {
  if (diff.length <= maxLength) return diff;

  const fileDiffs = diff.split(/(?=diff --git)/);
  const result: string[] = [];
  let currentLength = 0;

  const prioritizedDiffs = fileDiffs.sort((a, b) => {
    const aIsConfig = a.match(/\.(json|ya?ml|toml|config\.\w+)/) ? 1 : 0;
    const bIsConfig = b.match(/\.(json|ya?ml|toml|config\.\w+)/) ? 1 : 0;
    const aIsLock = a.match(/lock\.(json|ya?ml)/) ? 1 : 0;
    const bIsLock = b.match(/lock\.(json|ya?ml)/) ? 1 : 0;

    if (aIsLock !== bIsLock) return aIsLock - bIsLock;
    if (aIsConfig !== bIsConfig) return bIsConfig - aIsConfig;
    return 0;
  });

  for (const fileDiff of prioritizedDiffs) {
    if (currentLength + fileDiff.length <= maxLength) {
      result.push(fileDiff);
      currentLength += fileDiff.length;
    } else if (currentLength < maxLength * 0.8) {
      const remaining = maxLength - currentLength - 100;
      if (remaining > 500) {
        result.push(
          fileDiff.slice(0, remaining) + "\n[... diff truncated ...]"
        );
        break;
      }
    }
  }

  return result.join("");
}

export async function generateCommitMessage(
  diff: string,
  files: string[]
): Promise<CommitMessage> {
  const config = getConfig();
  const analysis = analyzeDiff(diff, files);
  const truncatedDiff = truncateDiffSmart(diff, 15000);

  const openrouter = createOpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
  });

  const prompt = `You are an expert senior developer writing detailed, precise git commit messages. Analyze the following git diff THOROUGHLY and generate a comprehensive commit message.

## CRITICAL INSTRUCTIONS:
1. READ EVERY LINE of the diff carefully - don't skip or summarize broadly
2. Identify SPECIFIC changes: function names, variable names, logic changes, bug fixes
3. Note the INTENT behind changes, not just what changed
4. Be PRECISE - mention exact names of functions, classes, components, files when relevant
5. Don't be vague - instead of "updated logic" say "added null check in parseConfig function"

## Commit Format Rules:
- Title: max ${
    config.maxLength
  } characters, imperative mood, conventional commits format
- Format: type(scope): precise description of the main change
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- Language: ${config.locale === "en" ? "English" : config.locale}

## Description Rules:
- MUST be a bullet list with dashes (-)
- Each bullet = ONE specific, concrete change
- Include ALL meaningful changes - don't omit anything important
- Mention function/class/component names when they were added, modified, or removed
- Note parameter changes, return type changes, new dependencies
- Include breaking changes if any
- Group related changes logically

## Code Analysis Summary:
${analysis.summary}

${
  analysis.newFiles.length > 0
    ? `\n### New Files:\n${analysis.newFiles.map((f) => `- ${f}`).join("\n")}`
    : ""
}
${
  analysis.deletedFiles.length > 0
    ? `\n### Deleted Files:\n${analysis.deletedFiles
        .map((f) => `- ${f}`)
        .join("\n")}`
    : ""
}
${
  analysis.renamedFiles.length > 0
    ? `\n### Renamed Files:\n${analysis.renamedFiles
        .map((f) => `- ${f}`)
        .join("\n")}`
    : ""
}
${
  analysis.addedFunctions.length > 0
    ? `\n### New Functions/Methods:\n${analysis.addedFunctions
        .slice(0, 15)
        .map((f) => `- ${f}()`)
        .join("\n")}${
        analysis.addedFunctions.length > 15
          ? `\n- ... and ${analysis.addedFunctions.length - 15} more`
          : ""
      }`
    : ""
}
${
  analysis.removedFunctions.length > 0
    ? `\n### Removed Functions/Methods:\n${analysis.removedFunctions
        .slice(0, 10)
        .map((f) => `- ${f}()`)
        .join("\n")}`
    : ""
}
${
  analysis.changedClasses.length > 0
    ? `\n### Changed Classes:\n${analysis.changedClasses
        .map((c) => `- ${c}`)
        .join("\n")}`
    : ""
}
${
  analysis.configChanges.length > 0
    ? `\n### Config File Changes:\n${analysis.configChanges
        .map((f) => `- ${f}`)
        .join("\n")}`
    : ""
}
${
  analysis.addedImports.length > 0
    ? `\n### New Imports (sample):\n${analysis.addedImports
        .slice(0, 5)
        .map((i) => `- ${i}`)
        .join("\n")}`
    : ""
}

## Changed Files (${files.length}):
${files.map((f) => `- ${f}`).join("\n")}

## Git Diff:
\`\`\`diff
${truncatedDiff}
\`\`\`

## Your Task:
Based on the DETAILED analysis above and the actual diff content, generate a commit message that:
1. Has a precise, specific title that captures the MAIN purpose of these changes
2. Has a description with bullet points covering ALL significant changes
3. Mentions specific function names, class names, and file names where relevant
4. Explains WHY changes were made when it's clear from the code
5. Notes any potential breaking changes or important side effects

Respond ONLY in this exact JSON format, nothing else:
{"title": "type(scope): specific description", "description": "- Detailed first change with specifics\\n- Detailed second change\\n- Continue for all significant changes"}`;

  const { text } = await generateText({
    model: openrouter(config.model),
    prompt,
    maxOutputTokens: 3000,
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
