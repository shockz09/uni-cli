# Phase 8: uni ask - Natural Language Interface

> Status: ✅ COMPLETE

## Overview
Natural language interface for uni CLI. Users can describe what they want in plain English, and `uni ask` translates it to the appropriate command.

**Primary Use Case:** Terminal users without Claude Code who want natural language interaction.

---

## Usage

```bash
# Calendar
uni ask "what's on my calendar tomorrow"
# → Runs: uni gcal list --date tomorrow

uni ask "schedule a meeting with Bob at 2pm"
# → Runs: uni gcal add "Meeting with Bob" --time 2pm

# GitHub
uni ask "show my open pull requests"
# → Runs: uni gh pr list --state open

uni ask "create a PR for this branch"
# → Runs: uni gh pr create

# Search
uni ask "search for React 19 new features"
# → Runs: uni exa search "React 19 new features"

# Slack
uni ask "send hello to the general channel"
# → Runs: uni slack send general "hello"

# Gmail
uni ask "show unread emails"
# → Runs: uni gmail list --unread
```

---

## How It Works

1. User runs `uni ask "<natural language>"`
2. CLI sends request to LLM with:
   - Available services and commands (from registry)
   - User's query
   - System prompt for command generation
3. LLM returns the appropriate uni command
4. CLI executes the command (with optional confirmation)

---

## Implementation

### System Prompt
```
You are a CLI command translator. Given a natural language request,
return the appropriate uni CLI command.

Available services and commands:
{dynamically generated from registry}

Rules:
- Return ONLY the command, no explanation
- Use exact flag names from the schema
- If unclear, ask for clarification
- If impossible, say "CANNOT: <reason>"

Examples:
User: show my calendar for tomorrow
Command: uni gcal list --date tomorrow

User: search for typescript tutorials
Command: uni exa search "typescript tutorials"
```

### LLM Options

1. **Anthropic API** (Claude)
   - Requires ANTHROPIC_API_KEY
   - Best quality

2. **OpenAI API** (GPT)
   - Requires OPENAI_API_KEY
   - Good alternative

3. **Ollama** (Local)
   - No API key needed
   - Runs locally
   - Good for privacy

4. **Groq** (Fast)
   - Free tier available
   - Very fast inference

### Configuration
```toml
# ~/.uni/config.toml
[ask]
provider = "anthropic"  # anthropic | openai | ollama | groq
model = "claude-3-haiku-20240307"  # Fast and cheap
confirm = true  # Ask before executing
```

---

## Commands

### `uni ask <query>`
Main command - translate and execute.

```bash
uni ask "show my PRs"
# Output:
# → uni gh pr list
# Run this command? [Y/n]
```

Options:
- `--dry-run, -n` - Show command without executing
- `--no-confirm` - Execute without asking
- `--provider` - Override LLM provider
- `--verbose` - Show LLM reasoning

### `uni ask --interactive`
Start interactive mode (REPL).

```bash
uni ask -i
> show my calendar
→ uni gcal list
[Executed]

> what PRs need review
→ uni gh pr list --state open
[Executed]

> exit
```

---

## Files to Create

```
packages/cli/src/
├── commands/
│   └── ask.ts           # Main ask command
├── core/
│   └── llm.ts           # LLM client abstraction
```

---

## LLM Client Interface

```typescript
interface LLMClient {
  complete(prompt: string): Promise<string>;
}

// Implementations
class AnthropicClient implements LLMClient { ... }
class OpenAIClient implements LLMClient { ... }
class OllamaClient implements LLMClient { ... }
class GroqClient implements LLMClient { ... }
```

---

## Environment Variables

```bash
# Pick one based on provider
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
export GROQ_API_KEY="..."
# Ollama needs no key (runs locally)
```

---

## Edge Cases

1. **Ambiguous requests** → Ask for clarification
2. **Impossible requests** → Explain why and suggest alternatives
3. **Multi-step requests** → Chain commands or suggest pipe
4. **No matching service** → Suggest installing a service

---

## Testing Checklist
- [x] Basic queries translate correctly
- [x] Confirmation prompt works
- [x] Dry-run shows command without executing
- [x] Works with each LLM provider (Anthropic, OpenAI, Ollama, Groq)
- [x] Handles ambiguous queries
- [x] Interactive mode works
- [x] Falls back gracefully if no API key
