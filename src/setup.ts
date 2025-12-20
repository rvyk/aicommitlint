import * as p from "@clack/prompts";
import chalk from "chalk";
import { setConfig, getConfig, getConfigPath } from "./config.js";
import { testConnection } from "./ai.js";
import { printBanner, success, error, info, createSpinner } from "./ui.js";

const MODELS = [
  {
    value: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet (Recommended)",
  },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { value: "custom", label: "✎ Enter custom model..." },
];

const LOCALES = [
  { value: "en", label: "English" },
  { value: "pl", label: "Polski" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
];

export async function runSetup(): Promise<boolean> {
  printBanner();

  console.log(chalk.dim("  Welcome to aicommitlint setup wizard!"));
  console.log(
    chalk.dim("  Get your API key from: ") +
      chalk.cyan("https://openrouter.ai/keys")
  );
  console.log();

  p.intro(chalk.bgMagenta.white(" Setup "));

  const currentConfig = getConfig();
  const hasExistingConfig = currentConfig.OPENROUTER_API_KEY.length > 0;

  if (hasExistingConfig) {
    const shouldReconfigure = await p.confirm({
      message: "Existing configuration found. Do you want to reconfigure?",
      initialValue: false,
    });

    if (p.isCancel(shouldReconfigure) || !shouldReconfigure) {
      p.outro(chalk.dim("Setup cancelled. Using existing configuration."));
      return true;
    }
  }

  const apiKey = await p.text({
    message: "Enter your OpenRouter API key:",
    placeholder: "sk-or-v1-...",
    validate: (value) => {
      if (!value || value.length < 10) {
        return "Please enter a valid API key";
      }
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  let model = await p.select({
    message: "Select your preferred AI model:",
    options: MODELS,
    initialValue: "anthropic/claude-3.5-sonnet",
  });

  if (p.isCancel(model)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (model === "custom") {
    const customModel = await p.text({
      message: "Enter custom model name (e.g. anthropic/claude-3.5-haiku):",
      placeholder: "provider/model-name",
      validate: (value) => {
        if (!value || !value.includes("/")) {
          return "Model should be in format: provider/model-name";
        }
      },
    });

    if (p.isCancel(customModel)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    model = customModel as string;
  }

  const locale = await p.select({
    message: "Select commit message language:",
    options: LOCALES,
    initialValue: "en",
  });

  if (p.isCancel(locale)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const maxLength = await p.text({
    message: "Maximum commit title length:",
    placeholder: "72",
    initialValue: "72",
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 20 || num > 200) {
        return "Please enter a number between 20 and 200";
      }
    },
  });

  if (p.isCancel(maxLength)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  setConfig("OPENROUTER_API_KEY", apiKey as string);
  setConfig("model", model as string);
  setConfig("locale", locale as string);
  setConfig("maxLength", parseInt(maxLength as string));

  const spinner = createSpinner("Testing connection to OpenRouter...");
  spinner.start();

  const isConnected = await testConnection();

  if (isConnected) {
    spinner.stop();
    success("Connection successful!");
    console.log();
    info(`Configuration saved to: ${getConfigPath()}`);
    console.log();
    p.outro(
      chalk.green("✨ Setup complete! Run ") +
        chalk.cyan("aicommitlint") +
        chalk.green(" in any git repository.")
    );
    return true;
  } else {
    spinner.stop();
    error("Connection failed. Please check your API key.");
    return false;
  }
}

export async function showConfig(): Promise<void> {
  const config = getConfig();

  console.log();
  console.log(chalk.dim("  Current configuration:"));
  console.log();
  console.log(
    chalk.dim("  API Key:    ") +
      chalk.cyan(config.OPENROUTER_API_KEY.slice(0, 12) + "...")
  );
  console.log(chalk.dim("  Model:      ") + chalk.cyan(config.model));
  console.log(chalk.dim("  Locale:     ") + chalk.cyan(config.locale));
  console.log(
    chalk.dim("  Max Length: ") + chalk.cyan(config.maxLength.toString())
  );
  console.log(chalk.dim("  Config:     ") + chalk.dim(getConfigPath()));
  console.log();
}

export async function changeModel(): Promise<void> {
  const currentConfig = getConfig();

  console.log();
  console.log(chalk.dim("  Current model: ") + chalk.cyan(currentConfig.model));
  console.log();

  let model = await p.select({
    message: "Select new AI model:",
    options: MODELS,
    initialValue: currentConfig.model,
  });

  if (p.isCancel(model)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  if (model === "custom") {
    const customModel = await p.text({
      message: "Enter custom model name (e.g. anthropic/claude-3.5-haiku):",
      placeholder: "provider/model-name",
      validate: (value) => {
        if (!value || !value.includes("/")) {
          return "Model should be in format: provider/model-name";
        }
      },
    });

    if (p.isCancel(customModel)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }

    model = customModel as string;
  }

  setConfig("model", model as string);

  const spinner = createSpinner("Testing connection with new model...");
  spinner.start();

  const isConnected = await testConnection();
  spinner.stop();

  if (isConnected) {
    success(`Model changed to: ${model}`);
  } else {
    error("Connection failed with new model. Model saved anyway.");
  }
}
