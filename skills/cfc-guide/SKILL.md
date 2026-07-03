---
description: Explain and run claude-frontend-cli (cfc) — the installer that manages this project's Claude Code config (docs, skills, agent, CLAUDE.md)
user-invocable: true
allowed-tools: Bash, Read
---

# /cfc-guide — Working with claude-frontend-cli

This project's Claude Code configuration was installed by **`claude-frontend-cli`** (command: `cfc`).
Use this guide when the user asks to update, add, or inspect that configuration.

## What cfc manages

- `.docs/` — generic Nuxt/Vue/TS stack guides (ARCHITECTURE, TDD, TABLES, FORMS, …)
- `.claude/skills/*` — slash-command skills (`/check`, `/review`, `/new-form`, …)
- `.claude/agents/vue-quality-enforcer.md` — the quality-enforcing subagent
- `CLAUDE.md` — the managed section between the `claude-frontend-cli` markers
- `.claude/settings.json` — baseline permissions (created only if absent)
- `.instructions/` — project-specific stubs you fill in

A manifest at `.claude/.cfc-manifest.json` tracks what was installed and at which kit version.

## Commands

```bash
cfc list             # show catalog vs what's installed here
cfc doctor           # diagnose: tool detected? npm scripts present? drift vs manifest?
cfc sync             # update installed artifacts to the newer kit version (preserves local edits)
cfc sync --dry-run   # preview what sync would change, without writing
cfc get --type skill --name new-table   # add a single skill later
cfc get --type skill --name sprint-tasks --dry-run   # (jira module)
```

## Key rules

- **Never hand-edit inside the `CLAUDE.md` markers** — `cfc sync` overwrites that block. Put custom
  guidance outside the markers; it is preserved.
- **Locally edited skills**: `cfc sync` detects the change and asks (overwrite / save `.user` copy / skip).
  Use `--force` only to intentionally discard local edits.
- **`.claude/settings.json` and `.instructions/*`** are created once and never overwritten by sync —
  they are yours to customize.
- Before running `sync`/`get`, prefer `--dry-run` first and show the user the planned changes.

## Typical requests → actions

- "Update the Claude config / pull latest skills" → `cfc sync --dry-run`, review, then `cfc sync`.
- "Add the <X> skill" → `cfc get --type skill --name <X>`.
- "Is the config healthy / what's missing?" → `cfc doctor`.
