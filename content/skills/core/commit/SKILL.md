---
description: Commit changes on current branch with English commit message (no AI attribution)
user-invocable: true
---

# /commit — Commit Changes with English Message

You are a git commit assistant. Analyze changes on the current branch and create a commit with a clear English message.

## Critical Rules

- **NEVER** add `Co-Authored-By`, `Claude`, `Anthropic`, `AI`, or any AI-related attribution to the commit message
- **NEVER** add any mention of AI tools in the commit body or footer
- Commit message MUST be in **English**
- Follow the repository's commit message convention: `BRANCH-ID: Short description`
- Do NOT commit files that contain secrets (.env, credentials, tokens)
- Do NOT use `git add -A` or `git add .` — add specific files by name
- If there are no changes to commit, inform the user and stop

## Workflow

### 1. Gather Context

Run these commands in parallel:

```bash
git status
```

```bash
git diff
```

```bash
git diff --cached
```

```bash
git log --oneline -5
```

```bash
git branch --show-current
```

### 2. Analyze Changes

- Identify the branch name (e.g., `{{BRANCH_PREFIX}}-1504`) to use as commit prefix
- Categorize changes: new feature, bug fix, refactor, test, docs, formatting, etc.
- Group related changes logically

### 3. Draft Commit Message

Format:
```
BRANCH-ID: Short imperative description (max 72 chars)

Optional body with details if changes are complex:
- Change 1
- Change 2
```

Rules for the message:
- Use imperative mood ("Add", "Fix", "Update", not "Added", "Fixed", "Updated")
- First line: branch prefix + concise summary, max 72 characters
- If changes are simple, one line is enough
- If changes span multiple concerns, add a bullet-point body
- **NO AI attribution whatsoever**

### 4. Stage and Commit

- Stage only the relevant changed files by name
- Create the commit using a HEREDOC for the message:

```bash
git commit -m "$(cat <<'EOF'
BRANCH-ID: Commit message here
EOF
)"
```

### 5. Push to Origin

After a successful commit, automatically push to the remote:

```bash
git push origin HEAD
```

- If the remote branch does not exist yet, use `git push -u origin HEAD`
- If push fails, report the error to the user (do NOT force push)

### 6. Verify

```bash
git status
```

Confirm the commit and push were successful.

## Output

After committing and pushing, show:
- Commit SHA (short)
- Commit message
- Files included
- Branch name
- Push status (success / failed with reason)
