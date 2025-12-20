import chalk from 'chalk';
import gradient from 'gradient-string';
import ora, { type Ora } from 'ora';

const brandGradient = gradient(['#7C3AED', '#EC4899', '#F59E0B']);
const successGradient = gradient(['#10B981', '#3B82F6']);

export function printBanner(): void {
  console.log();
  console.log(brandGradient.multiline(`
   ╔═══════════════════════════════════════════╗
   ║                                           ║
   ║     █████╗ ██╗ ██████╗ ██████╗ ███╗   ███╗║
   ║    ██╔══██╗██║██╔════╝██╔═══██╗████╗ ████║║
   ║    ███████║██║██║     ██║   ██║██╔████╔██║║
   ║    ██╔══██║██║██║     ██║   ██║██║╚██╔╝██║║
   ║    ██║  ██║██║╚██████╗╚██████╔╝██║ ╚═╝ ██║║
   ║    ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝║
   ║                                           ║
   ║          AI Commit Message Generator      ║
   ╚═══════════════════════════════════════════╝
  `));
  console.log();
}

export function printSmallBanner(): void {
  console.log();
  console.log(brandGradient('  ⚡ aicommitlint'));
  console.log(chalk.dim('  AI-powered commit messages'));
  console.log();
}

export function success(message: string): void {
  console.log(chalk.green('✓'), successGradient(message));
}

export function error(message: string): void {
  console.log(chalk.red('✗'), chalk.red(message));
}

export function warning(message: string): void {
  console.log(chalk.yellow('⚠'), chalk.yellow(message));
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), chalk.dim(message));
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
    color: 'magenta',
    spinner: 'dots12',
  });
}

export function printCommitPreview(title: string, description: string): void {
  console.log();
  console.log(chalk.dim('  ┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.dim('  │'), chalk.bold.white(' Commit Preview'), chalk.dim('                                        │'));
  console.log(chalk.dim('  ├─────────────────────────────────────────────────────────┤'));
  console.log(chalk.dim('  │'));
  console.log(chalk.dim('  │'), chalk.yellow.bold(title));
  console.log(chalk.dim('  │'));
  if (description) {
    const lines = description.split('\n');
    for (const line of lines) {
      console.log(chalk.dim('  │'), chalk.white(line));
    }
    console.log(chalk.dim('  │'));
  }
  console.log(chalk.dim('  └─────────────────────────────────────────────────────────┘'));
  console.log();
}

export function printChangedFiles(files: string[]): void {
  console.log(chalk.dim('  Changed files:'));
  for (const file of files.slice(0, 10)) {
    console.log(chalk.dim('    •'), chalk.cyan(file));
  }
  if (files.length > 10) {
    console.log(chalk.dim(`    ... and ${files.length - 10} more files`));
  }
  console.log();
}

