# aicommitlint

AI-powered git commit message generator using OpenRouter. Automatically generates conventional commit messages with titles and bullet-point descriptions based on your code changes.

## Features

- 🤖 AI-powered commit message generation using OpenRouter
- 📝 Conventional Commits format
- 🎨 Beautiful CLI interface with gradients and spinners
- ⚙️ Customizable AI models (Claude, GPT, Gemini, and custom models)
- 🌍 Multi-language support
- 🔧 Easy setup wizard
- 📋 Interactive commit preview and editing

## Installation

```bash
npm install -g aicommitlint
```

Or using pnpm:

```bash
pnpm add -g aicommitlint
```

## Setup

Run the setup wizard to configure your OpenRouter API key:

```bash
aicommitlint setup
```

You'll need:

- An OpenRouter API key (get one at [https://openrouter.ai/keys](https://openrouter.ai/keys))
- Choose your preferred AI model
- Select commit message language
- Set maximum commit title length

## Usage

### Basic usage

In any git repository:

```bash
# Stage your changes first
git add .

# Generate and commit
aicommitlint
```

### Options

```bash
# Stage all changes and generate commit
aicommitlint --all
# or
aicommitlint -a

# Skip confirmation and commit directly
aicommitlint --yes
# or
aicommitlint -y

# Copy commit message to clipboard (prints message for manual copy)
aicommitlint --copy
# or
aicommitlint -c
```

### Commands

```bash
# Setup/configure aicommitlint
aicommitlint setup

# Show current configuration
aicommitlint config

# Change AI model
aicommitlint model
```

## Examples

After staging your changes, `aicommitlint` will:

1. Analyze your git diff
2. Generate a commit message with title and description
3. Show you a preview
4. Let you choose to:
   - ✅ Commit with the generated message
   - ✎ Edit the message before committing
   - ↻ Generate a new message
   - ✗ Cancel

## Supported Models

- Claude 3.5 Sonnet (Recommended)
- Claude 3 Opus
- GPT-4o
- GPT-4o Mini
- Gemini 3 Flash Preview
- Custom models (via OpenRouter)

## Configuration

Configuration is stored in `~/.aicommitlint/config.json`. You can view it with:

```bash
aicommitlint config
```

### Environment Variables

You can also use environment variables:

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
aicommitlint
```

## Requirements

- Node.js >= 18
- Git repository

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
