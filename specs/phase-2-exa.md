# Phase 2: Exa Service

## Objective
Implement the first service adapter - Exa web search, code context, and research capabilities.

## Deliverables

### 1. Package Setup
- [x] package.json with dependencies
- [x] Service definition (index.ts)
- [x] Exa API client

### 2. Commands
- [x] `uni exa search <query>` - Web search
- [x] `uni exa code <query>` - Code/library context
- [x] `uni exa research <query>` - Deep research
- [x] `uni exa company <name>` - Company research

### 3. Features
- [x] API key from env (EXA_API_KEY) or config
- [x] Configurable result count (--num)
- [x] Output formatting (table/json)
- [x] Error handling for rate limits, auth

### 4. Skill File
- [x] Initial SKILL.md with Exa knowledge
- [x] Command reference
- [x] Usage patterns

## Command Specs

### uni exa search
```bash
uni exa search <query> [options]

Options:
  --num, -n <number>     Number of results (default: 5)
  --type <type>          Search type: auto|neural|keyword (default: auto)
  --domain <domain>      Filter to specific domain
  --days <number>        Results from last N days

Examples:
  uni exa search "React 19 server components"
  uni exa search "TypeScript 5.0 features" --num 10
  uni exa search "site:github.com AI agents"
```

### uni exa code
```bash
uni exa code <query> [options]

Options:
  --tokens, -t <number>  Max tokens to return (default: 5000)

Examples:
  uni exa code "Express.js middleware authentication"
  uni exa code "Python pandas groupby aggregate"
```

### uni exa research
```bash
uni exa research <query> [options]

Options:
  --mode <mode>          Research mode: quick|deep (default: quick)

Examples:
  uni exa research "AI agent frameworks 2025" --mode deep
```

### uni exa company
```bash
uni exa company <name> [options]

Options:
  --num, -n <number>     Number of results (default: 5)

Examples:
  uni exa company "Anthropic"
  uni exa company "OpenAI" --num 10
```

## API Integration

### Exa API Endpoints
- `web_search_exa` - General web search
- `get_code_context_exa` - Code/documentation search
- `company_research_exa` - Company information
- `deep_researcher_start/check` - Deep research (async)

### Environment Variables
- `EXA_API_KEY` - Required API key

## Files to Create

```
packages/service-exa/
├── package.json
└── src/
    ├── index.ts          # Service definition
    ├── api.ts            # Exa API client
    └── commands/
        ├── search.ts
        ├── code.ts
        ├── research.ts
        └── company.ts

skill/
└── SKILL.md              # Initial skill file
```

## Success Criteria
- [ ] `uni exa search "test"` returns real results (needs EXA_API_KEY)
- [ ] `uni exa code "react hooks"` returns code context (needs EXA_API_KEY)
- [x] `uni exa --help` shows all commands
- [x] JSON output works with --json flag
- [x] Error messages are helpful

## Status: IMPLEMENTATION COMPLETE (needs API key for live test)
