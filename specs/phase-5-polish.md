# Phase 5: Polish

> Status: ✅ COMPLETED

## Overview
Final polish for MVP including shell completions, documentation, and developer experience.

## Completed

### Shell Completions
- `uni completions zsh` - Zsh completions
- `uni completions bash` - Bash completions
- `uni completions fish` - Fish completions

Setup:
```bash
# Zsh
eval "$(uni completions zsh)"

# Bash
eval "$(uni completions bash)"

# Fish
uni completions fish > ~/.config/fish/completions/uni.fish
```

### Documentation
- `skill/SKILL.md` - Main skill file for Claude
- `skill/REFERENCE.md` - Auto-generated command reference
- `skill/PATTERNS.md` - Common workflow patterns

### Auto-generation
- `scripts/generate-docs.ts` - Generates REFERENCE.md from code
- Run with: `bun run scripts/generate-docs.ts`

### Global Command
Created wrapper at `~/.local/bin/uni`:
```bash
#!/bin/bash
exec bun run /Users/shockz/projects/uni-cli/packages/cli/src/main.ts "$@"
```

Add to PATH:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Skill Installation
Skill installed at `~/.claude/skills/uni-cli/` (symlink to project skill/ dir)

### Files Created/Modified
- `packages/cli/src/core/completions.ts`
- `packages/cli/src/core/cli.ts` (added completions command)
- `scripts/generate-docs.ts`
- `skill/SKILL.md`
- `skill/REFERENCE.md`
- `skill/PATTERNS.md`
- `~/.local/bin/uni`
- `~/.claude/skills/uni-cli -> ~/projects/uni-cli/skill`
