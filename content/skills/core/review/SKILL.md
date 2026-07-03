---
description: Review code changes against all project standards (architecture, TypeScript, TDD, permissions, i18n, error handling)
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob
---

# /review — Code Review Against Project Standards

You are a code reviewer for a Nuxt 3 application. Review changes against ALL project standards.

## Workflow

### 1. Get Changed Files

```bash
git diff --name-only develop
git diff develop --stat
```

If no changes vs develop, check unstaged/staged:
```bash
git diff --name-only
git diff --name-only --cached
```

### 2. Read Changed Files

Read each changed file to understand the full context of changes.

### 3. Read Relevant Documentation

Based on file types changed, read the appropriate docs:
- Components/pages → `.docs/ARCHITECTURE.md`, `.docs/COMPONENTS.md`, `.docs/PERMISSIONS.md`
- Stores → `.docs/ARCHITECTURE.md`
- Composables → `.docs/ARCHITECTURE.md`, `.docs/ERROR-HANDLING.md`
- Forms → `.docs/FORMS.md`
- Tables → `.docs/TABLES.md`, `.instructions/TABLE-IMPLEMENTATION-GUIDE.md`
- Types → `.docs/TYPESCRIPT.md`
- Tests → `.docs/TDD.md`
- Locale files → `.docs/I18N.md`

### 4. Check Each Standard

#### Architecture Layers
- [ ] Components only use composables (never stores/repos directly)
- [ ] Composables use stores (never repos directly — unless justified)
- [ ] No layer skipping: Component → Composable → Store → Repository → API

#### TypeScript
- [ ] No `any` types
- [ ] Proper interfaces/types defined
- [ ] All exports typed
- [ ] Unused vars removed (not just prefixed with `_` unless parameters)

#### TDD
- [ ] Test files exist for new code
- [ ] Tests have `// @vitest-environment nuxt` header
- [ ] Tests cover: happy path, errors, edge cases, loading, permissions
- [ ] Coverage target: ≥80%

#### Permissions (2-Level)
- [ ] Pages have `definePageMeta({ middleware: 'permission', permissions: [...] })`
- [ ] Action buttons have `v-if="hasPermission('...')"`
- [ ] API calls guarded with permission checks (prevent 403 redirect)

#### i18n
- [ ] No hardcoded user-facing strings
- [ ] All text uses `t('key')` or `$t('key')`
- [ ] Keys added to locale file

#### Error Handling
- [ ] Uses `useToaster()` (never `useToast()`)
- [ ] Loading states handled
- [ ] Empty states handled
- [ ] Error states handled

#### PrimeVue Specifics
- [ ] Uses `AppDatePicker` (never `DatePicker` from primevue)
- [ ] Uses `storeToRefs` for store state
- [ ] Form inputs have `:invalid` prop for validation errors
- [ ] Labels have `for` attribute

#### Table Standards (if applicable)
- [ ] No `mode="currency"` on filter InputNumber
- [ ] No currency symbols in filter inputs
- [ ] MultiSelect values as plain arrays
- [ ] Correct select type mapping (equal→Single, in→Multi)

#### Security
- [ ] No unguarded API calls that could trigger 403 redirect
- [ ] CRM offer public link buttons guarded by `crm-offer-public-links.list`
- [ ] No direct `useToast()` usage

### 5. Produce Report

Format findings with severity levels:

```
## Code Review Report

### CRITICAL (must fix)
- [file:line] Description of issue
  → Suggested fix

### WARNING (should fix)
- [file:line] Description of issue
  → Suggested fix

### SUGGESTION (nice to have)
- [file:line] Description of suggestion

### Positive Observations
- Things done well

---
**Verdict: APPROVE / REQUEST CHANGES**
**Files reviewed: X**
**Issues: X critical, Y warnings, Z suggestions**
```

## Rules
- **Be thorough** — check every standard for every file
- **Be specific** — include file:line references
- **Be actionable** — suggest concrete fixes
- **Be fair** — acknowledge good practices too
- **Read-only** — never modify files, only report
