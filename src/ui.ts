import chalk from "chalk";
import gradient from "gradient-string";
import ora, { type Ora } from "ora";

const brandGradient = gradient(["#7C3AED", "#EC4899", "#F59E0B"]);
const successGradient = gradient(["#10B981", "#3B82F6"]);

export function printBanner(): void {
  console.log();
  console.log(
    brandGradient.multiline(`
   ╔═══════════════════════════════════════════════╗
   ║                                               ║
   ║     █████╗ ██╗ ██████╗ ██████╗ ███╗   ███╗    ║
   ║    ██╔══██╗██║██╔════╝██╔═══██╗████╗ ████║    ║
   ║    ███████║██║██║     ██║   ██║██╔████╔██║    ║
   ║    ██╔══██║██║██║     ██║   ██║██║╚██╔╝██║    ║
   ║    ██║  ██║██║╚██████╗╚██████╔╝██║ ╚═╝ ██║    ║
   ║    ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝    ║
   ║                                               ║
   ║          AI Commit Message Generator          ║
   ╚═══════════════════════════════════════════════╝
  `),
  );
  console.log();
}

export function printSmallBanner(): void {
  console.log();
  console.log(brandGradient("  ⚡ aicommitlint"));
  console.log(chalk.dim("  AI-powered commit messages"));
  console.log();
}

export function success(message: string): void {
  console.log(chalk.green("✓"), successGradient(message));
}

export function error(message: string): void {
  console.log(chalk.red("✗"), chalk.red(message));
}

export function warning(message: string): void {
  console.log(chalk.yellow("⚠"), chalk.yellow(message));
}

export function info(message: string): void {
  console.log(chalk.blue("ℹ"), chalk.dim(message));
}

export function dim(message: string): void {
  console.log(chalk.dim(message));
}

export function highlight(message: string): string {
  return chalk.cyan(message);
}

export function bold(message: string): string {
  return chalk.bold(message);
}

export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: "magenta",
    spinner: "dots12",
  });
}

export function printCommitPreview(title: string, description: string): void {
  console.log();
  console.log(
    chalk.dim("  ┌─────────────────────────────────────────────────────────┐"),
  );
  console.log(
    chalk.dim("  │"),
    chalk.bold.white(" Commit Preview"),
    chalk.dim("                                        │"),
  );
  console.log(
    chalk.dim("  ├─────────────────────────────────────────────────────────┤"),
  );
  console.log(chalk.dim("  │"));
  console.log(chalk.dim("  │"), chalk.yellow.bold(title));
  console.log(chalk.dim("  │"));
  if (description) {
    const lines = description.split("\n");
    for (const line of lines) {
      console.log(chalk.dim("  │"), chalk.white(line));
    }
    console.log(chalk.dim("  │"));
  }
  console.log(
    chalk.dim("  └─────────────────────────────────────────────────────────┘"),
  );
  console.log();
}

export function printChangedFiles(files: string[]): void {
  console.log(chalk.dim("  Changed files:"));
  for (const file of files.slice(0, 10)) {
    console.log(chalk.dim("    •"), chalk.cyan(file));
  }
  if (files.length > 10) {
    console.log(chalk.dim(`    ... and ${files.length - 10} more files`));
  }
  console.log();
}

export function printHelp(): void {
  printBanner();
  console.log(chalk.bold("Usage:"));
  console.log(chalk.dim("  aicommitlint [options]"));
  console.log(chalk.dim("  aicommitlint <command>"));
  console.log();
  console.log(chalk.bold("Commands:"));
  console.log(
    chalk.dim("  setup"),
    chalk.white("   Configure aicommitlint with your OpenRouter API key"),
  );
  console.log(
    chalk.dim("  config"),
    chalk.white("  Show current configuration"),
  );
  console.log(chalk.dim("  model"), chalk.white("   Change AI model"));
  console.log();
  console.log(chalk.bold("Options:"));
  console.log(
    chalk.dim("  -a, --all"),
    chalk.white("    Stage all changes before generating commit"),
  );
  console.log(
    chalk.dim("  -y, --yes"),
    chalk.white("    Skip confirmation and commit directly"),
  );
  console.log(
    chalk.dim("  -c, --copy"),
    chalk.white("   Copy commit message to clipboard (prints for manual copy)"),
  );
  console.log(chalk.dim("  -h, --help"), chalk.white("   Display help"));
  console.log(chalk.dim("  -v, --version"), chalk.white(" Display version"));
  console.log();
  console.log(chalk.bold("Examples:"));
  console.log(chalk.dim("  # Generate commit message for staged changes"));
  console.log(chalk.cyan("  aicommitlint"));
  console.log();
  console.log(chalk.dim("  # Stage all changes and generate commit"));
  console.log(chalk.cyan("  aicommitlint --all"));
  console.log();
  console.log(chalk.dim("  # Generate and commit without confirmation"));
  console.log(chalk.cyan("  aicommitlint --yes"));
  console.log();
  console.log(chalk.dim("  # Setup configuration"));
  console.log(chalk.cyan("  aicommitlint setup"));
  console.log();
  console.log(chalk.bold("Documentation:"));
  console.log(chalk.dim("  https://github.com/rvyk/aicommitlint"));
  console.log();
}
