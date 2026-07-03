---
description: Socratic, step-by-step installer for claude-frontend-cli (cfc) — interview the user, then install and configure the whole Claude Code setup for their frontend project
user-invocable: true
allowed-tools: Bash, Read
---

# /cfc-setup — Guided install of claude-frontend-cli

You set up a frontend project's Claude Code configuration by **interviewing the user one question at a
time** (Socratic method), then running `cfc` to install everything. Never dump all questions at once —
ask, wait for the answer, reflect it back, move on.

## 0. Preflight

Check whether the CLI is available; otherwise use `npx`:

```bash
cfc --version 2>/dev/null || echo "use: npx github:marek-radzik/claude-frontend-cli"
```

Detect current state (fresh vs existing Claude Code):

```bash
ls CLAUDE.md .claude 2>/dev/null
```

## 1. Interview (one question at a time)

Ask these in order. Keep each to a single question; confirm the answer before continuing.

1. **Stack** — "Which frontend stack? `nuxt-vue` (Nuxt 3 + Vue 3), `react` (React/Next.js), or `generic`?"
   (default `nuxt-vue`).
2. **Project name** — used in CLAUDE.md and env var prefixes.
3. **API base URL** — the backend the app talks to.
4. **Primary entity** — the main domain object (e.g. `Order`).
5. **Branch/commit prefix** — e.g. `ACME` (used by the `commit` skill).
6. **Modules** — "Include the Jira/sprint module? (needs Jira/GitLab access)" → `--with-jira` if yes.
   "Include MCP servers (puppeteer + context7)?" → default yes; `--no-mcp` if no.

## 2. Install (non-interactive, with the gathered answers)

Run a single command, substituting the answers. Use `--dry-run` first and show the plan, then run for real:

```bash
cfc init --yes --stack <STACK> \
  --set PROJECT_NAME="<NAME>" \
  --set API_BASE_URL="<API_URL>" \
  --set PRIMARY_ENTITY="<ENTITY>" \
  --set BRANCH_PREFIX="<PREFIX>" \
  [--with-jira] [--no-mcp] --dry-run
```

Review the output with the user, then re-run without `--dry-run`.

## 3. Secrets — give paste-able steps, DO NOT collect values in chat

Never ask the user to paste tokens/keys into the conversation. Instead present the exact commands and let
them fill `.env` themselves:

```bash
cp .env.example .env
# open .env and paste your values, then export them:
export $(grep -v '^#' .env | xargs)
```

Tell them **which** keys matter based on the modules they picked:
- MCP on → `CONTEXT7_API_KEY` (required for context7).
- Jira module → `JIRA_EMAIL`, `JIRA_TOKEN`, `JIRA_USER_ID`.
- Optional (later): `GIT_TOKEN` (GitLab/GitHub PAT; GitHub users may instead run `gh auth login`),
  `<PREFIX>_TOKEN`, `<PREFIX>_E2E_LOGIN`, `<PREFIX>_E2E_PASSWORD`.

## 4. Verify

```bash
cfc doctor
```

Confirm: tool detected, npm scripts present, sentinel block intact, required env vars set (`✓/✗`).
If a required secret is `✗`, remind the user to fill it in `.env` and re-export.

## 5. Wrap up

Summarize what was installed (stack, modules, files) and point them to `/cfc-guide` for day-to-day use
(`cfc sync` to update, `cfc get` to add a skill). Remind them to commit everything **except** `.env`.
