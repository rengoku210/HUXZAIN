# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

<!-- Section above adapted from forrestchang/andrej-karpathy-skills (CLAUDE.md template). -->

---

## Installed Claude Code tooling (added 2026-06-16)

The following plugins/skills/MCP servers were installed at **user/global scope** (`~/.claude`) unless noted. They are available in this project too.

### Skills (`~/.claude/skills/`)
- **graphify** — `/graphify .` builds a queryable knowledge graph of the codebase. No API key needed when run via the IDE session.
- **impeccable** — `/impeccable <cmd> <target>` (e.g. `audit`, `polish`, `critique`). Deterministic, no API key. Hooks intentionally **NOT** installed (`--no-hooks`).
- **grill-me, grill-with-docs, diagnose, tdd, to-prd, to-issues, triage, zoom-out, handoff, teach, caveman, write-a-skill, prototype, improve-codebase-architecture, scaffold-exercises, setup-pre-commit, git-guardrails-claude-code, migrate-to-shoehorn, setup-matt-pocock-skills** — from mattpocock/skills. Run `/setup-matt-pocock-skills` once per repo before using the issue-tracker-dependent ones.
- **grill-me-codex, grill-with-docs-codex, codex-review** — from chaseai-yt/grill-me-codex. Require Codex CLI ≥ 0.130 + `codex login`.

### Plugins (`claude plugin list`)
- **codex@openai-codex** — `/codex:setup`, `/codex:review`, `/codex:rescue`, etc. Requires Codex CLI + ChatGPT login (or OpenAI API key).
- **claude-obsidian@agricidaniel-claude-obsidian** — `/wiki`, `/save`, `/canvas`, `/autoresearch`. Optional Obsidian MCP needs a Local REST API key.

### MCP servers (`claude mcp list`)
- **higgsfield** (user scope, HTTP) — `https://mcp.higgsfield.ai/mcp`. OAuth via Higgsfield account on first use; no API key. NOTE: Higgsfield recommends the CLI over MCP for Claude Code.
- **n8n** (PLACEHOLDER, user scope) — needs YOUR n8n instance URL + Bearer token. See "Pending manual steps" below.

### CLI tools (via `uv tool`)
- **notebooklm-py** — `notebooklm` CLI. Run `notebooklm login` (Google sign-in, downloads Chromium ~170MB).

### Pending manual steps / credentials needed
See the install summary in chat. Logins/keys still required:
- `codex login` (Codex plugin + grill-me-codex)
- `notebooklm login` (NotebookLM)
- Higgsfield account OAuth (on first MCP use)
- Obsidian Local REST API key (only if using the Obsidian MCP)
- n8n instance URL + Bearer token (to finish the n8n MCP registration)
