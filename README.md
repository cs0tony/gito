# gito

A safe Git merge CLI tool built with Bun. **Automatically merge current branch to target branch and switch back.**

## ✨ Highlight: Auto Merge & Return

**Tired of manual branch switching?** gito does it all for you:

1. 📍 Detect your current branch (e.g., `feature/add-auth`)
2. 🎯 Switch to target branch (e.g., `main`)
3. 🔀 Merge your feature branch into target
4. 📤 Optionally push to remote
5. 🔙 **Automatically switch back to your feature branch**

```bash
# You're on feature/add-auth
gito mergeto main

# gito automatically:
# ✓ Switches to main
# ✓ Merges feature/add-auth into main
# ✓ Pushes (if --push)
# ✓ Switches back to feature/add-auth
# ← You're still on feature/add-auth, ready to continue coding!
```

## Features

- 🔄 **Auto switch back** - Automatically return to your working branch after merge
- 🎯 Smart branch detection - No need to manually specify current branch
- 🚀 Built with Bun for fast performance
- 📝 Persistent configuration management
- 💬 Interactive prompts with auto-confirm mode
- 🎨 Beautiful colored terminal output
- ⚙️ Config priority: CLI args > config file > defaults

## Installation

### Quick Install (Recommended)

#### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/cs0tony/gito/main/install.sh | sh
```

Or with a specific version:

```bash
GITO_VERSION=v0.0.1 curl -fsSL https://raw.githubusercontent.com/cs0tony/gito/main/install.sh | sh
```

#### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/cs0tony/gito/main/install.ps1 | iex
```

Or with a specific version:

```powershell
$env:GITO_VERSION='v0.0.1'; irm https://raw.githubusercontent.com/cs0tony/gito/main/install.ps1 | iex
```

#### Uninstall

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/cs0tony/gito/main/install.sh | sh -s -- --uninstall

# Windows: Delete $env:USERPROFILE\.gito and remove from PATH
```

### From source

```bash
git clone https://github.com/cs0tony/gito.git
cd gito
bun install
bun run build
bun link
```

## Usage

### The "Merge & Return" Workflow

The core advantage of gito is that you **stay on your feature branch** while merging to other branches:

```bash
# On feature/login-page, merge it to main
gito mergeto main
# ✓ Switched to main and merged feature/login-page
# ✓ Pushed to remote (if configured)
# ✓ Switched back to feature/login-page ← You're back!

# On feature/api-v2, merge to develop with auto-push
gito mergeto develop --push
# ✓ All done, still on feature/api-v2

# Quick merge to configured default target (default: test)
gito mergeto --push
# ✓ Merged to test, pushed, and back on your branch
```

### Basic merge

```bash
# Merge current branch to test (interactive)
gito mergeto

# Merge specific feature branch to develop
gito mergeto develop feature-branch

# Merge with auto push
gito mergeto --push

# Merge with auto confirm and push
gito mergeto test feature --yes --push
```

### Configuration

```bash
# List all configuration
gito config list

# Set a configuration value
gito config set defaultTarget main
gito config set autoPush true

# Get a single configuration value
gito config get defaultTarget

# Reset configuration to defaults
gito config reset

# Edit configuration in your editor
gito config edit
```

## Why gito?

### The Problem with Traditional Git Workflow

```bash
# ❌ Traditional manual workflow (8 steps, error-prone)
git checkout main              # 1. Switch to main
git pull origin main            # 2. Update main
git merge feature/new-ui        # 3. Merge feature
git push origin main            # 4. Push main
git checkout feature/new-ui     # 5. Switch back (easy to forget!)
# Continue coding...
```

**Common issues:**
- ❌ Forget to switch back to feature branch
- ❌ Accidentally commit to main branch
- ❌ Lose track of which branch you were working on
- ❌ Repetitive steps for every merge

### The gito Solution

```bash
# ✅ gito workflow (1 command)
gito mergeto main --push
# ✓ Automatically handles all steps
# ✓ Returns you to feature/new-ui
# ✓ Ready to continue coding immediately
```

**Benefits:**
- ✅ Always return to your working branch
- ✅ Prevent accidental commits to wrong branch
- ✅ Faster workflow with fewer mental steps
- ✅ Consistent process across team

## Command Structure

```bash
gito <command> [options]

Commands:
  mergeto         Execute branch merge
  config          Manage configuration

Options:
  -p, --push       Auto push to remote repository
  -y, --yes        Auto confirm all prompts (non-interactive)
  --no-ff          Use `--no-ff` for merge
  -h, --help       Show help information
  -V, --version    Show version number
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultTarget` | string | `test` | Default target branch for merges |
| `autoPush` | boolean | `false` | Automatically push after merge |
| `autoConfirm` | boolean | `false` | Skip confirmation prompts |
| `mergeNoFf` | boolean | `false` | Use `--no-ff` for merges |

### Config Priority

1. **CLI arguments** (highest priority)
2. **Config file** (`~/.gito.json`)
3. **Default values** (lowest priority)

Example:
```bash
# Config: defaultTarget=develop, autoPush=false
gito mergeto --push           # target=develop (config), push=true (CLI)
gito mergeto main              # target=main (CLI), push=false (config)
gito mergeto main --push       # target=main (CLI), push=true (CLI)
```

## Why sub-commands?

Using `gito mergeto` and `gito config` instead of a flat command structure avoids conflicts with branch names. For example, if you have a branch named `config`, the sub-command structure ensures it won't conflict:

```bash
# ✅ Works - sub-command structure
gito mergeto config feature    # Merge 'config' branch to 'feature'
gito config list                # Manage configuration
```

## CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help information |
| `--version` | `-V` | Show version number |
| `--push` | `-p` | Auto push to remote repository |
| `--yes` | `-y` | Auto confirm all prompts (non-interactive) |
| `--no-ff` | - | Use `--no-ff` for merge |

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Run tests
bun test
```

## Project Structure

```
gito/
├── src/
│   ├── cli.ts      # Main CLI entry point
│   ├── config.ts   # Configuration management
│   ├── git.ts      # Git operations
│   └── ui.ts       # Terminal UI utilities
├── dist/           # Built output
├── index.ts        # Development entry
└── package.json
```

## License

MIT
