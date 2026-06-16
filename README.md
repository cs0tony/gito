# gito

A safe Git merge CLI tool built with Bun. Helps you safely merge branches with automatic conflict handling and configuration management.

## Features

- 🚀 Built with Bun for fast performance
- 📝 Persistent configuration management
- 🔄 Automatic branch switching and restoration
- 💬 Interactive prompts with auto-confirm mode
- 🎨 Beautiful colored terminal output
- ⚙️ Config priority: CLI args > config file > defaults

## Installation

### From source

```bash
git clone <repo-url>
cd gito
bun install
bun run build
bun link
```

## Usage

### Basic merge

```bash
# Merge current branch to test (interactive)
gito mergeto

# Merge feature branch to develop (interactive)
gito mergeto develop feature

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
