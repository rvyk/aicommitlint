#!/usr/bin/env node

import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import "dotenv/config";
import { createRequire } from "module";
import { isConfigured, getConfig } from "./config.js";
import {
  isGitRepository,
  getStagedDiff,
  getStagedFiles,
  commit,
  stageAllChanges,
  getUnstagedFiles,
  getUntrackedFiles,
} from "./git.js";
import { generateCommitMessage, ModelError } from "./ai.js";
import { runSetup, showConfig, changeModel } from "./setup.js";
import {
  printSmallBanner,
  success,
  error,
  warning,
  info,
  createSpinner,
  printCommitPreview,
  printChangedFiles,
  highlight,
  printHelp,
} from "./ui.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

const program = new Command();

program
  .name("aicommitlint")
  .description("AI-powered git commit message generator using OpenRouter")
  .version(packageJson.version, "-v, --version", "Display version number")
  .usage("[options] [command]")
  .configureHelp({
    helpWidth: 100,
    subcommandTerm: (cmd) => cmd.name(),
    commandUsage: (cmd) => {
      let result = cmd.usage();
      if (!result) {
        result = cmd.name() + (cmd.options.length ? " [options]" : "");
      }
      return result;
    },
  })
  .configureOutput({
    writeErr: (str) => {
      if (
        str.includes("too many arguments") ||
        str.includes("Unknown command")
      ) {
        console.error();
        error("Invalid command or arguments");
        console.log();
        info(
          "Run " +
            highlight("aicommitlint --help") +
            " to see available commands and options."
        );
        console.log();
      } else {
        process.stderr.write(str);
      }
    },
  })
  .showHelpAfterError(false)
  .addHelpCommand(false);

program
  .command("setup")
  .description("Configure aicommitlint with your OpenRouter API key")
  .action(async () => {
    await runSetup();
  });

program
  .command("config")
  .description("Show current configuration")
  .action(async () => {
    printSmallBanner();
    await showConfig();
  });

program
  .command("model")
  .description("Change AI model")
  .action(async () => {
    printSmallBanner();
    await changeModel();
  });

program
  .option("-a, --all", "Stage all changes before generating commit")
  .option("-y, --yes", "Skip confirmation and commit directly")
  .option(
    "-c, --copy",
    "Copy commit message to clipboard instead of committing"
  )
  .allowExcessArguments(true)
  .action(async (options, command) => {
    if (command.args && command.args.length > 0) {
      console.error();
      error(`Unknown command or option: ${command.args.join(" ")}`);
      console.log();
      info(
        "Run " +
          highlight("aicommitlint --help") +
          " to see available commands and options."
      );
      console.log();
      process.exit(1);
    }
    printSmallBanner();

    if (!isConfigured()) {
      warning("aicommitlint is not configured yet.");
      console.log();
      info("Running setup wizard...");
      console.log();
      const setupSuccess = await runSetup();
      if (!setupSuccess) {
        process.exit(1);
      }
      console.log();
    }

    const isRepo = await isGitRepository();
    if (!isRepo) {
      error(
        "Not a git repository. Please run this command inside a git repository."
      );
      process.exit(1);
    }

    if (options.all) {
      const spinner = createSpinner("Staging all changes...");
      spinner.start();
      await stageAllChanges();
      spinner.stop();
      success("All changes staged.");
    }

    let stagedFiles = await getStagedFiles();

    if (stagedFiles.length === 0) {
      const unstagedFiles = await getUnstagedFiles();
      const untrackedFiles = await getUntrackedFiles();
      const allUnstaged = [...unstagedFiles, ...untrackedFiles];

      if (allUnstaged.length === 0) {
        warning("No changes to commit.");
        info("Make some changes and try again.");
        process.exit(0);
      }

      console.log(chalk.dim("  No staged changes found. Available files:"));
      console.log();

      for (const file of allUnstaged.slice(0, 8)) {
        console.log(chalk.dim("    •"), chalk.yellow(file));
      }
      if (allUnstaged.length > 8) {
        console.log(
          chalk.dim(`    ... and ${allUnstaged.length - 8} more files`)
        );
      }
      console.log();

      const shouldStage = await p.confirm({
        message: "Would you like to stage all changes?",
        initialValue: true,
      });

      if (p.isCancel(shouldStage) || !shouldStage) {
        info(
          "Stage your changes with " +
            highlight("git add <files>") +
            " and try again."
        );
        process.exit(0);
      }

      const spinner = createSpinner("Staging all changes...");
      spinner.start();
      await stageAllChanges();
      spinner.stop();
      success("All changes staged.");
      console.log();

      stagedFiles = await getStagedFiles();
    }

    printChangedFiles(stagedFiles);

    const spinner = createSpinner("Generating commit message...");
    spinner.start();

    try {
      const diff = await getStagedDiff();

      if (!diff.trim()) {
        spinner.stop();
        warning("No diff found for staged files.");
        process.exit(0);
      }

      const commitMessage = await generateCommitMessage(diff, stagedFiles);
      spinner.stop();

      printCommitPreview(commitMessage.title, commitMessage.description);

      const fullMessage = commitMessage.description
        ? `${commitMessage.title}\n\n${commitMessage.description}`
        : commitMessage.title;

      if (options.copy) {
        console.log(chalk.dim("  Commit message:"));
        console.log();
        console.log(chalk.white(fullMessage));
        console.log();
        success("Copy the message above manually.");
        process.exit(0);
      }

      if (options.yes) {
        const commitSpinner = createSpinner("Committing...");
        commitSpinner.start();
        await commit(fullMessage);
        commitSpinner.stop();
        success("Changes committed successfully!");
        process.exit(0);
      }

      const action = await p.select({
        message: "What would you like to do?",
        options: [
          { value: "commit", label: "✓ Commit with this message" },
          { value: "edit", label: "✎ Edit message before committing" },
          { value: "regenerate", label: "↻ Generate a new message" },
          { value: "cancel", label: "✗ Cancel" },
        ],
      });

      if (p.isCancel(action) || action === "cancel") {
        info("Commit cancelled.");
        process.exit(0);
      }

      if (action === "commit") {
        const commitSpinner = createSpinner("Committing...");
        commitSpinner.start();
        await commit(fullMessage);
        commitSpinner.stop();
        success("Changes committed successfully!");
      } else if (action === "edit") {
        const editedTitle = await p.text({
          message: "Edit commit title:",
          initialValue: commitMessage.title,
        });

        if (p.isCancel(editedTitle)) {
          info("Commit cancelled.");
          process.exit(0);
        }

        const editedDescription = await p.text({
          message: "Edit commit description (optional):",
          initialValue: commitMessage.description,
        });

        if (p.isCancel(editedDescription)) {
          info("Commit cancelled.");
          process.exit(0);
        }

        const editedMessage = editedDescription
          ? `${editedTitle}\n\n${editedDescription}`
          : (editedTitle as string);

        const commitSpinner = createSpinner("Committing...");
        commitSpinner.start();
        await commit(editedMessage);
        commitSpinner.stop();
        success("Changes committed successfully!");
      } else if (action === "regenerate") {
        const config = getConfig();
        info(`Regenerating with ${config.model}...`);
        const newSpinner = createSpinner("Generating new commit message...");
        newSpinner.start();
        const newMessage = await generateCommitMessage(diff, stagedFiles);
        newSpinner.stop();
        printCommitPreview(newMessage.title, newMessage.description);

        const confirmCommit = await p.confirm({
          message: "Commit with this message?",
          initialValue: true,
        });

        if (p.isCancel(confirmCommit) || !confirmCommit) {
          info("Commit cancelled.");
          process.exit(0);
        }

        const newFullMessage = newMessage.description
          ? `${newMessage.title}\n\n${newMessage.description}`
          : newMessage.title;

        const commitSpinner = createSpinner("Committing...");
        commitSpinner.start();
        await commit(newFullMessage);
        commitSpinner.stop();
        success("Changes committed successfully!");
      }
    } catch (err) {
      spinner.stop();
      if (err instanceof ModelError) {
        error(err.message);
        console.log();
        info("Run " + highlight("aicommitlint model") + " to change model.");
      } else {
        error("Failed to generate commit message.");
        if (err instanceof Error) {
          console.log(chalk.dim(`  ${err.message}`));
        }
      }
      process.exit(1);
    }
  });

program
  .command("help")
  .description("Display help information")
  .action(() => {
    printHelp();
  });

program.on("command:*", () => {
  console.error();
  error(`Unknown command: ${program.args.join(" ")}`);
  console.log();
  info(
    "Run " + highlight("aicommitlint --help") + " to see available commands."
  );
  console.log();
  process.exit(1);
});

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  if (args.length === 1) {
    printHelp();
    process.exit(0);
  }
}

program.parse();
