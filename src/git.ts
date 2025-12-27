import { execa } from "execa";

export async function isGitRepository(): Promise<boolean> {
  try {
    await execa("git", ["rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

export async function getStagedDiff(): Promise<string> {
  const { stdout } = await execa("git", [
    "diff",
    "--cached",
    "--diff-algorithm=minimal",
  ]);
  return stdout;
}

export async function getStagedFiles(): Promise<string[]> {
  const { stdout } = await execa("git", ["diff", "--cached", "--name-only"]);
  return stdout.split("\n").filter(Boolean);
}

export async function getUnstagedFiles(): Promise<string[]> {
  const { stdout } = await execa("git", ["diff", "--name-only"]);
  return stdout.split("\n").filter(Boolean);
}

export async function getUntrackedFiles(): Promise<string[]> {
  const { stdout } = await execa("git", [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  return stdout.split("\n").filter(Boolean);
}

export async function stageAllChanges(): Promise<void> {
  await execa("git", ["add", "-A"]);
}

export async function commit(message: string): Promise<void> {
  await execa("git", ["commit", "-m", message]);
}

export async function getRepoName(): Promise<string> {
  try {
    const { stdout } = await execa("git", ["remote", "get-url", "origin"]);
    const match = stdout.match(/\/([^/]+?)(?:\.git)?$/);
    return match ? match[1] : "unknown";
  } catch {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"]);
    return stdout.split("/").pop() || "unknown";
  }
}

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execa("git", ["branch", "--show-current"]);
  return stdout.trim();
}
